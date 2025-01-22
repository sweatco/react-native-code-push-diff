import child from 'child_process'
import util from 'util'
import * as fs from 'fs'
import { tmpdir } from 'os'
import * as Path from 'path'
import type { BundlerConfig, CommandArgs } from './types'

export const ROOT = process.env.PWD ?? ''

export function isDirectory(path: string): boolean {
  return fs.statSync(path).isDirectory()
}

export function fileDoesNotExistOrIsDirectory(path: string): boolean {
  try {
    return isDirectory(path)
  } catch (error) {
    return true
  }
}

export function defaultEntryFile(platform: string): string {
  let entryFile = `index.${platform}.js`
  if (!fileDoesNotExistOrIsDirectory(entryFile)) {
    return entryFile
  }
  entryFile = 'index.js'
  if (!fileDoesNotExistOrIsDirectory(entryFile)) {
    return entryFile
  }

  throw new Error(`Entry file "index.${platform}.js" or "index.js" does not exist.`)
}

export async function execCommand(command: string) {
  const exec = util.promisify(child.exec)
  const result = await exec(command)

  return result
}

export function fileExists(file: fs.PathLike) {
  try {
    return fs.statSync(file).isFile()
  } catch (e) {
    return false
  }
}

export const info = (message: string) => console.info(`[CodePushDiff] ${message}`)

export const rmRf = (pathToRemove: string) => fs.rmSync(pathToRemove, { recursive: true, force: true })

export const mkdir = (pathToCreate: string) => fs.mkdirSync(pathToCreate, { recursive: true })

export function installNodeModulesCommand() {
  if (fileExists(Path.join(ROOT, 'yarn.lock')) || fileExists(Path.join(ROOT, '.yarnrc.yml'))) {
    return 'yarn install'
  }
  if (fileExists(Path.join(ROOT, 'pnpm-lock.yaml'))) {
    return 'pnpm install'
  }

  return 'npm install'
}

export function buildBundleConfig(args: CommandArgs): BundlerConfig {
  const { os } = args

  return {
    outputDir: Path.join(tmpdir(), 'codepush-diff'),
    sourcemapOutputDir: Path.join(tmpdir(), args.sourcemapOutput ?? 'codepush-diff-sourcemap'),
    bundleName: os === 'ios' ? 'main.jsbundle' : `index.${os}.bundle`,
    ...args,
    os,
    platform: os,
    entryFile: args.entryFile ?? defaultEntryFile(os),
    reinstallNodeModulesCommand: args.reinstallNodeModulesCommand ?? installNodeModulesCommand(),
  }
}
