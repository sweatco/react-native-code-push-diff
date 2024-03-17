import simpleGit from 'simple-git'
import { info } from './utils'

export function fetchOrigin() {
  return simpleGit().fetch('origin')
}

export function checkout(commit: string) {
  info(`Switch to ${commit}`)
  return simpleGit().raw(['switch', '--detach', commit])
}

export async function gitRestore() {
  await simpleGit().raw(['restore', '.'])
  await simpleGit().raw(['switch', '-'])
}
