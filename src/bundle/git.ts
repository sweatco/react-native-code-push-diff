import simpleGit from 'simple-git'
import { info } from './utils'

const git = simpleGit()

export async function fetchOrigin() {
  await git.fetch('origin')
}

export async function checkout(commit: string) {
  info(`Switch to ${commit}`)
  await git.checkout(commit)
}

export async function gitRestore() {
  await git.raw(['switch', '-'])
}
