#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { appcenterArgs } from './appcenterArgs'
import { buildBundleConfig, getAppVersion, info } from '../bundle/utils'
import { bundle } from '../bundle/bundle'
import { execSync } from 'child_process'

yargs(hideBin(process.argv))
  .command(
    'target <app>',
    'Get the version of the app that will be uploaded to AppCenter.',
    (yargs) =>
      appcenterArgs(yargs).positional('app', { type: 'string', demandOption: true, alias: ['platform', 'os'] }),
    async (args) => {
      console.log(args)
      const bundlerConfig = buildBundleConfig(args)
      const version = await getAppVersion(bundlerConfig)

      console.log(version)
    }
  )
  .command(
    'bundle <app>',
    'Bundle the app for release.',
    (yargs) =>
      appcenterArgs(yargs)
        .positional('app', { type: 'string', demandOption: true, alias: ['platform', 'os'] })
        .option('base', { type: 'string', demandOption: true }),
    async (args) => {
      const result = await bundle(args)
      console.log(result)
    }
  )
  .command(
    'release-react',
    'Build and release a React Native app to AppCenter.',
    (yargs) =>
      appcenterArgs(yargs)
        .option('app', { type: 'string', demandOption: true, alias: ['a'] })
        .option('base', { type: 'string', demandOption: true }),
    async (args) => {
      const bundlerConfig = buildBundleConfig(args)
      const version = args.version ?? (await getAppVersion(bundlerConfig))
      const result = await bundle({ ...bundlerConfig, base: args.base })

      const keys = [
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
        .join(' ')

      const command = `appcenter codepush release-react ${keys}`

      info(`Realising bundle with command: ${command}`)

      execSync(command)
    }
  )
  .help()
  .demandCommand(1, 'Please specify a command')
  .parse()
