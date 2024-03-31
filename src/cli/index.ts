#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { appcenterArgs } from './appcenterArgs'
import { buildBundleConfig, getAppVersion, info } from '../bundle/utils'
import { bundle } from '../bundle/bundle'
import { execSync } from 'child_process'
import { bundleArgs } from './bundleArgs'

yargs(hideBin(process.argv))
  .command(
    'bundle <app>',
    'Bundle the app for release.',
    (yargs) =>
      bundleArgs(appcenterArgs(yargs)).positional('app', {
        type: 'string',
        demandOption: true,
        alias: ['platform', 'os'],
      }),
    async (args) => {
      const result = await bundle({ ...args })
      console.log(result)
    }
  )
  .command(
    'release-react',
    'Build and release a React Native app to AppCenter.',
    (yargs) => bundleArgs(appcenterArgs(yargs)).option('app', { type: 'string', demandOption: true, alias: ['a'] }),
    async (args) => {
      const bundlerConfig = buildBundleConfig({ ...args })
      const version = args.version ?? (await getAppVersion(bundlerConfig))
      const result = await bundle({ ...bundlerConfig, base: args.base })

      const keys =
        [
          ['-a', args.app],
          ['-c', result.outputDir],
          ['-t', version],
          ['-d', args.deploymentName],
          ['--description', args.description],
          ['--disabled', args.disabled],
          ['--mandatory', args.mandatory],
          ['--private-key-path', args.privateKeyPath],
          ['--rollout', args.rollout],
          ['--disable-duplicate-release-error', args.disableDuplicateReleaseError],
        ]
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => `${key} ${value}`)
          .join(' ') + ` ${args.rest}`

      const command = `appcenter codepush release ${keys}`

      info(`Realising bundle with command: ${command}`)

      execSync(command)
    }
  )
  .help()
  .demandCommand(1, 'Please specify a command')
  .parse()
