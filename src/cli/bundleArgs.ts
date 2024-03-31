import type { Argv } from 'yargs'

export const bundleArgs = <T = {}>(yargs: Argv<T>) =>
  yargs
    .option('base', { type: 'string', demandOption: true })
    .option('reinstallNodeModulesCommand', { type: 'string', alias: ['npm'] })
    .option('rest', { type: 'string', default: '' })
