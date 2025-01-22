import path from 'path'
import * as fs from 'fs'
import { tmpdir } from 'os'
import * as childProcess from 'child_process'

import { info, rmRf, execCommand, buildBundleConfig, mkdir } from './utils'
import type { BundleArgs, BundlerConfig, Hashes } from './types'
import { checkout, gitRestore } from './git'
import { hashes, removeUnchangedAssets } from './diff'
import { metroBundle } from './metroBundle'

export async function bundle(args: BundleArgs) {
  const { base } = args
  const bundlerConfig = buildBundleConfig(args)
  const baseHashes = await readBaseHashes(bundlerConfig, base)

  info('Bundling...')
  process.env.CODE_PUSH_PLATFORM = bundlerConfig.os
  const currentOutput = await bundleReactNative(
    {
      ...bundlerConfig,
      extraBundlerOptions: [
        ...(bundlerConfig.extraBundlerOptions ?? []),
        '--config',
        path.join(__dirname, 'metro.config.js'),
      ],
    },
    true
  )
  const currentHashes = await hashes(currentOutput.outputDir)
  info('Removing unchanged assets...')
  await removeUnchangedAssets(bundlerConfig.outputDir, currentHashes, baseHashes)
  info('Bundling: ✔')

  return currentOutput
}

const bundleReactNative = async (config: BundlerConfig, shouldBuildSourceMaps?: boolean) => {
  const {
    bundleCommand,
    bundleName,
    entryFile,
    os,
    extraBundlerOptions = [],
    sourcemapOutputDir,
    sourcemapOutput = path.join(sourcemapOutputDir, bundleName + '.map'),
    extraHermesFlags = [],
    useHermes = true,
    outputDir,
    development,
  } = config
  rmRf(outputDir)
  mkdir(outputDir)
  mkdir(path.dirname(sourcemapOutput))

  info(`Using '${config.reinstallNodeModulesCommand}' to install node modules`)
  await execCommand(config.reinstallNodeModulesCommand)

  metroBundle({
    bundleCommand,
    bundleName,
    development,
    entryFile,
    outputDir,
    platform: os,
    sourcemapOutput,
    extraBundlerOptions,
    verbose: useHermes,
    minify: !useHermes,
  })

  if (shouldBuildSourceMaps && useHermes) {
    await runHermesEmitBinaryCommand(bundleName, outputDir, sourcemapOutput, [
      '-max-diagnostic-width=80',
      ...extraHermesFlags,
    ])
  }

  return {
    outputDir,
    bundlePath: path.join(outputDir, bundleName),
    sourcemap: sourcemapOutput,
  }
}

const checkoutAndBuild = async (bundlerConfig: BundlerConfig, commit: string) => {
  await checkout(commit)
  const output = await bundleReactNative(bundlerConfig, false)
  await gitRestore()

  return output
}

const readBaseHashes = async (bundlerConfig: BundlerConfig, base: string): Promise<Hashes> => {
  if (!process.env.BASE_ASSETS_PATH) {
    info(`Bundling for ${base}`)
    const baseOutput = await checkoutAndBuild(bundlerConfig, base)
    const baseHashes = await hashes(baseOutput.outputDir)
    const baseAssetsPath = path.join(tmpdir(), 'base-assets.json')
    fs.writeFileSync(baseAssetsPath, JSON.stringify(baseHashes))
    process.env.BASE_ASSETS_PATH = baseAssetsPath
  }

  return JSON.parse(fs.readFileSync(process.env.BASE_ASSETS_PATH, 'utf8'))
}

export async function runHermesEmitBinaryCommand(
  bundleName: string,
  outputFolder: string,
  sourcemapOutput: string,
  extraHermesFlags: string[]
): Promise<void> {
  const hermesArgs: string[] = []

  Array.prototype.push.apply(hermesArgs, [
    '-emit-binary',
    '-out',
    path.join(outputFolder, bundleName + '.hbc'),
    path.join(outputFolder, bundleName),
    ...extraHermesFlags,
  ])

  if (sourcemapOutput) {
    hermesArgs.push('-output-source-map')
  }

  hermesArgs.push('-w')

  await buildHermes(bundleName, outputFolder, hermesArgs)

  if (sourcemapOutput) {
    await composeSourceMaps(bundleName, outputFolder, sourcemapOutput)
  }
}

async function buildHermes(bundleName: string, outputFolder: string, hermesArgs: string[]) {
  const hermesCommand = getHermesCommand()
  const hermesProcess = childProcess.spawn(hermesCommand, hermesArgs)
  return new Promise<void>((resolve, reject) => {
    hermesProcess.stdout.on('data', (data: Buffer) => {
      console.log(data.toString().trim())
    })

    hermesProcess.stderr.on('data', (data: Buffer) => {
      console.error(data.toString().trim())
    })

    hermesProcess.on('close', (exitCode: number, signal: string) => {
      if (exitCode !== 0) {
        reject(new Error(`"hermes" command failed (exitCode=${exitCode}, signal=${signal}).`))
      }
      // Copy HBC bundle to overwrite JS bundle
      const source = path.join(outputFolder, bundleName + '.hbc')
      const destination = path.join(outputFolder, bundleName)
      fs.copyFile(source, destination, (err) => {
        if (err) {
          console.error(err)
          reject(
            new Error(
              `Copying file ${source} to ${destination} failed. "hermes" previously exited with code ${exitCode}.`
            )
          )
        }
        fs.unlink(source, (error) => {
          if (error) {
            console.error(error)
            reject(error)
          }
          resolve()
        })
      })
    })
  })
}

async function composeSourceMaps(bundleName: string, outputFolder: string, sourcemapOutput: string) {
  const composeSourceMapsPath = getComposeSourceMapsPath()
  if (!composeSourceMapsPath) {
    throw new Error('react-native compose-source-maps.js scripts is not found')
  }
  const jsCompilerSourceMapFile = path.join(outputFolder, bundleName + '.hbc' + '.map')
  if (!fs.existsSync(jsCompilerSourceMapFile)) {
    throw new Error(`sourcemap file ${jsCompilerSourceMapFile} is not found`)
  }

  return new Promise((resolve, reject) => {
    const composeSourceMapsArgs = [
      composeSourceMapsPath,
      sourcemapOutput,
      jsCompilerSourceMapFile,
      '-o',
      sourcemapOutput,
    ]

    // https://github.com/facebook/react-native/blob/master/react.gradle#L211
    // https://github.com/facebook/react-native/blob/master/scripts/react-native-xcode.sh#L178
    // packager.sourcemap.map + hbc.sourcemap.map = sourcemap.map
    const composeSourceMapsProcess = childProcess.spawn('node', composeSourceMapsArgs)
    console.log(`${composeSourceMapsPath} ${composeSourceMapsArgs.join(' ')}`)

    composeSourceMapsProcess.stdout.on('data', (data: Buffer) => {
      console.log(data.toString().trim())
    })

    composeSourceMapsProcess.stderr.on('data', (data: Buffer) => {
      console.error(data.toString().trim())
    })

    composeSourceMapsProcess.on('close', (exitCode: number, signal: string) => {
      if (exitCode !== 0) {
        reject(new Error(`"compose-source-maps" command failed (exitCode=${exitCode}, signal=${signal}).`))
      }

      // Delete the HBC sourceMap, otherwise it will be included in 'code-push' bundle as well
      fs.unlink(jsCompilerSourceMapFile, (err) => {
        if (err) {
          console.error(err)
          reject(err)
        }

        resolve(null)
      })
    })
  })
}

function getHermesCommand() {
  return `${getReactNativePackagePath()}/sdks/hermesc/${getHermesOSBin()}/hermesc`
}

function getReactNativePackagePath() {
  return path.join('node_modules', 'react-native')
}

function getHermesOSBin() {
  switch (process.platform) {
    case 'win32':
      return 'win64-bin'
    case 'darwin':
      return 'osx-bin'
    case 'freebsd':
    case 'linux':
    case 'sunos':
    default:
      return 'linux64-bin'
  }
}

function getComposeSourceMapsPath() {
  // detect if compose-source-maps.js script exists
  const composeSourceMapsPath = path.join(getReactNativePackagePath(), 'scripts', 'compose-source-maps.js')
  if (fs.existsSync(composeSourceMapsPath)) {
    return composeSourceMapsPath
  }
  return null
}
