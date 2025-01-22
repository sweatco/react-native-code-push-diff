import type { Argv } from 'yargs'

export const bundleArgs = <T = {}>(yargs: Argv<T>) =>
  yargs
    .positional('os', {
      type: 'string',
      demandOption: true,
      alias: ['platform'],
    })
    .option('base', { type: 'string', demandOption: true })
    .option('reinstallNodeModulesCommand', { type: 'string', alias: ['npm'] })
    .option('rest', { type: 'string', default: '' })
    .option('bundle-command', { type: 'string' })
