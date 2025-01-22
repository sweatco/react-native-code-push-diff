#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { codepushArgs } from './codepushArgs'
import { buildBundleConfig, info } from '../bundle/utils'
import { getReactNativeProjectAppVersion } from './getReactNativeProjectAppVersion'
import { bundle } from '../bundle/bundle'
import { execSync } from 'child_process'
import { bundleArgs } from './bundleArgs'

yargs(hideBin(process.argv))
  .command(
    'bundle <platform>',
    'Bundle the app for release.',
    (yargs) => bundleArgs(codepushArgs(yargs)),
    async (args) => {
      const result = await bundle({ ...args })
      console.log(result)
    }
  )
  .command(
    'release-react <platform>',
    'Build and release a React Native app to a Code Push server.',
    (yargs) => bundleArgs(codepushArgs(yargs)).option('app', { type: 'string', demandOption: true, alias: ['a'] }),
    async (args) => {
      const bundlerConfig = buildBundleConfig({ ...args })
      const version = args.targetBinaryVersion ?? (await getReactNativeProjectAppVersion(bundlerConfig))
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

      const command = `${args.cmd} release ${keys}`

      info(`Realising bundle with command: ${command}`)

      execSync(command)
    }
  )
  .help()
  .demandCommand(1, 'Please specify a command')
  .parse()
