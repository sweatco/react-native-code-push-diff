import child from 'child_process'
import { info } from './utils'

export async function checkout(commit: string) {
  info(`Switch to ${commit}`)
  child.execSync(`git checkout ${commit}`)
}

export async function gitRestore() {
  info('Restore to previous branch')
  child.execSync('git switch -')
}
