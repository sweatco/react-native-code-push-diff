import simpleGit from 'simple-git'
import { info } from './utils'

export function fetchOrigin() {
  return simpleGit().fetch('origin')
}

export function revParseHead() {
  return simpleGit().revparse(['HEAD'])
}

export function checkout(commit: string) {
  info(`Switch to ${commit}`)
  return simpleGit().raw(['switch', '--detach', commit])
}

export function gitRestore() {
  return simpleGit().raw(['switch', '-'])
}
