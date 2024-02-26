import { execSync } from 'child_process'
import * as fs from 'fs'
import * as Path from 'path'
import type { VersionSearchParams } from './types'

export const ROOT = process.env.PWD ?? ''

export const {
  getReactNativeProjectAppVersion,
} = require('appcenter-cli/dist/commands/codepush/lib/react-native-utils')

export function getAppVersion(versionSearchParams: VersionSearchParams, projectRoot?: string): Promise<string> {
  return getReactNativeProjectAppVersion(versionSearchParams, projectRoot)
}

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

export const execCommand = (command: string) => execSync(command).toString().trim()

export function fileExists(file: fs.PathLike) {
  try {
    return fs.statSync(file).isFile()
  } catch (e) {
    return false
  }
}

export const info = (message: string) => console.info(`[CodePushDiff] ${message}`)

export const rmRf = (pathToRemove: string) => fs.rmSync(pathToRemove, { recursive: true, force: true })

export function installNodeModulesCommand() {
  if (fileExists(Path.join(ROOT, 'yarn.lock')) || fileExists(Path.join(ROOT, '.yarnrc.yml'))) {
    return 'yarn install'
  }
  if (fileExists(Path.join(ROOT, 'pnpm-lock.yaml'))) {
    return 'pnpm install'
  }

  return 'npm install'
}

export function getPlatform(app: string): string {
  const command = `appcenter apps show --app ${app} --output json`
  const json = JSON.parse(execCommand(command))

  return json.os.toLowerCase()
}
