import path from 'path'
import * as fs from 'fs'
import { tmpdir } from 'os'

import { info, rmRf, execCommand, buildBundleConfig, mkdir } from './utils'
import type { BundleArgs, BundlerConfig, Hashes } from './types'
import { checkout, gitRestore } from './git'
import { hashes, removeUnchangedAssets } from './diff'
import { metroBundle } from './metroBundle'

const { runHermesEmitBinaryCommand } = require('appcenter-cli/dist/commands/codepush/lib/react-native-utils')

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
