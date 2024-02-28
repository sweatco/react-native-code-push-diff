import * as fs from 'fs'
import path from 'path'

import { info, rmRf, execCommand, buildBundleConfig } from './utils'
import type { BundleArgs, BundlerConfig } from './types'
import { checkout, fetchOrigin, gitRestore, revParseHead } from './git'
import { diffAssets, removeUnchangedAssets } from './diff'

const {
  runHermesEmitBinaryCommand,
  runReactNativeBundleCommand,
} = require('appcenter-cli/dist/commands/codepush/lib/react-native-utils')

async function bundleUnsafe(args: BundleArgs) {
  const { base, bundleJson } = args
  const bundlerConfig = buildBundleConfig(args)
  const { outputDir } = bundlerConfig

  await fetchOrigin()
  const current = await revParseHead()
  rmRf(outputDir)
  fs.mkdirSync(outputDir)
  info(`Bundling ${base}...`)
  const baseOutput = await checkoutAndBuild(bundlerConfig, base, outputDir)
  info(`Bundling ${current}...`)
  const currentOutput = await build(bundlerConfig, current, outputDir)

  info('Diffing...')
  const changedAssets = await diffAssets(currentOutput.outputDir, baseOutput.outputDir)
  info('Diffing: ✔')

  info('Bundling...')
  writeBundleJson({ changedAssets, ...bundleJson })
  const output = await build(bundlerConfig, current, outputDir, true)
  info('Removing unchanged assets...')
  await removeUnchangedAssets(output.outputDir, baseOutput.outputDir)
  info('Bundling: ✔')

  return { ...output }
}

export async function bundle(args: BundleArgs) {
  try {
    return await bundleUnsafe(args)
  } finally {
    fs.writeFileSync(bundleJsPath, JSON.stringify({}, null, 2))
  }
}

const bundleReactNative = async (outputDir: string, config: BundlerConfig, shouldBuildSourceMaps?: boolean) => {
  const {
    extraBundlerOptions = [],
    sourcemapOutputDir = path.join(outputDir, 'sourcemap'),
    extraHermesFlags = [],
    useHermes = true,
  } = config
  outputDir = path.join(outputDir, 'output')
  fs.mkdirSync(outputDir)
  fs.mkdirSync(sourcemapOutputDir)
  const { bundleName, entryFile, os } = config
  const sourcemapOutput = path.join(sourcemapOutputDir, bundleName + '.map')

  await runReactNativeBundleCommand(
    bundleName,
    false, // development
    entryFile,
    outputDir,
    os, // platform
    sourcemapOutput,
    ['--reset-cache', ...extraBundlerOptions]
  )
  if (shouldBuildSourceMaps && useHermes) {
    await runHermesEmitBinaryCommand(bundleName, outputDir, sourcemapOutput, extraHermesFlags)
  }

  return {
    outputDir,
    bundlePath: path.join(outputDir, bundleName),
    sourcemap: sourcemapOutput,
  }
}

const isStdoutError = (error: any): error is { stdout: string } => typeof error?.stdout === 'string'

const build = async (bundlerConfig: BundlerConfig, commit: string, prefix: string, shouldBuildSourceMaps = false) => {
  try {
    const tmpPath = path.join(prefix, commit.replaceAll(/\.|\//g, '_'))
    rmRf(tmpPath)
    fs.mkdirSync(tmpPath)
    info(`Bundling for ${commit}`)
    info(`Using ${bundlerConfig.reinstallNodeModulesCommand} to install node modules`)
    execCommand(bundlerConfig.reinstallNodeModulesCommand)
    const output = await bundleReactNative(tmpPath, bundlerConfig, shouldBuildSourceMaps)

    return output
  } catch (error) {
    if (isStdoutError(error)) {
      const stdout = error.stdout.toString()
      console.error(stdout)
      throw new Error(stdout)
    }
    throw error
  }
}

const checkoutAndBuild = async (bundlerConfig: BundlerConfig, commit: string, prefix: string) => {
  try {
    checkout(commit)
    const output = await build(bundlerConfig, commit, prefix)

    return output
  } finally {
    await gitRestore()
  }
}

const root = process.env.PWD ?? '.'
const bundleJsPath = path.join(root, 'node_modules', 'react-native-code-push-diff', 'bundle_config.json')

function writeBundleJson(json: object) {
  const content = JSON.parse(fs.readFileSync(bundleJsPath, 'utf-8'))
  const stringifedContent = JSON.stringify({ ...content, ...json }, null, 2)
  info(`Writting bundle json with content\n${stringifedContent}\nto ${bundleJsPath}`)
  fs.writeFileSync(bundleJsPath, stringifedContent)
}
