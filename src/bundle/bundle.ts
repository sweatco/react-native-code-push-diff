import * as fs from 'fs'
import { tmpdir } from 'os'
import path from 'path'

import {
  defaultEntryFile,
  info,
  rmRf,
  execCommand,
  getAppVersion,
  installNodeModulesCommand,
  getPlatform,
} from './utils'
import type { BundleArgs, BundlerConfig, Os, OsOrApp } from './types'
import { checkout, fetchOrigin, gitRestore, revParseHead } from './git'
import { diffAssets, removeUnchangedAssets } from './diff'

const {
  runHermesEmitBinaryCommand,
  runReactNativeBundleCommand,
} = require('appcenter-cli/dist/commands/codepush/lib/react-native-utils')

const hasOs = (args: OsOrApp): args is Os => 'os' in args

async function bundleUnsafe(args: BundleArgs) {
  const os = hasOs(args) ? args.os : getPlatform(args.app)
  const { base, bundleJson, ...rest } = args
  const bundlerConfig: BundlerConfig = {
    outputPath: path.join(tmpdir(), 'codepush-diff'),
    os,
    entryFile: defaultEntryFile(os),
    bundleName: os === 'ios' ? 'main.jsbundle' : `index.${os}.bundle`,
    reinstallNodeModulesCommand: installNodeModulesCommand(),
    ...rest,
  }
  const { outputPath } = bundlerConfig

  info(`Checking version for ${os}...`)
  const version = await getAppVersion(bundlerConfig)
  await fetchOrigin()
  const current = await revParseHead()
  rmRf(outputPath)
  fs.mkdirSync(outputPath)
  const baseOutput = await checkoutAndBuild(bundlerConfig, base, outputPath)
  const currentOutput = await build(bundlerConfig, current, outputPath)

  info('Diffing...')
  const changedAssets = await diffAssets(currentOutput.outputDir, baseOutput.outputDir)
  info('Diffing: ✔')

  info('Bundling...')
  writeBundleJson({ changedAssets, ...bundleJson })
  const output = await build(bundlerConfig, current, outputPath, true)
  info('Removing unchanged assets...')
  await removeUnchangedAssets(output.outputDir, baseOutput.outputDir)
  info('Bundling: ✔')

  return { ...output, version }
}

export async function bundle(args: BundleArgs) {
  try {
    return await bundleUnsafe(args)
  } finally {
    fs.writeFileSync(bundleJsPath, JSON.stringify({}, null, 2))
  }
}

const bundleReactNative = async (outputPath: string, config: BundlerConfig, shouldBuildSourceMaps?: boolean) => {
  const outputDir = path.join(outputPath, 'output')
  fs.mkdirSync(outputDir)
  const sourcemapOutputDir = path.join(outputPath, 'sourcemap')
  fs.mkdirSync(sourcemapOutputDir)
  const { bundleName, entryFile, os } = config
  const sourcemapOutput = path.join(sourcemapOutputDir, bundleName + '.map')

  await runReactNativeBundleCommand(
    bundleName,
    false, // development
    entryFile, // entryFile
    outputDir, // outputFolder
    os, // platform
    sourcemapOutput, // sourcemapOutput
    ['--reset-cache'] // extraBundlerOptions
  )
  if (shouldBuildSourceMaps) {
    await runHermesEmitBinaryCommand(
      bundleName,
      outputDir,
      sourcemapOutput,
      [] // extraHermesFlags
    )
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
