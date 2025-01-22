import { type Argv } from 'yargs'

export const codepushArgs = <T = {}>(yargs: Argv<T>) =>
  yargs
    .option('deployment-name', { alias: 'd', default: 'Staging', type: 'string' })
    .option('cmd', { type: 'string', alias: 'cmd' })
    .option('description', { type: 'string' })
    .option('private-key-path', { alias: 'k', type: 'string' })
    .option('rollout', { alias: 'r', default: '100', type: 'string' })
    .option('disabled', { alias: 'x', default: false })
    .option('mandatory', { alias: 'm', default: false })
    .option('target-binary-version', {
      alias: ['t'],
      type: 'string',
    })
    .option('bundleName', {
      alias: 'b',
      type: 'string',
    })
    .option('development', { type: 'boolean', default: false })
    .option('entry-file', { alias: 'e', type: 'string' })
    .option('gradle-file', { alias: 'g', type: 'string' })
    .option('pod-file', { type: 'string' })
    .option('plist-file', { alias: 'p', type: 'string' })
    .option('xcode-project-file', { alias: ['xp', 'project-file'], type: 'string' })
    .option('plist-file-prefix', { type: 'string' })
    .option('build-configuration-name', { alias: 'c', type: 'string' })
    .option('xcode-target-name', { alias: 'xt', type: 'string' })
    .option('sourcemap-output', { alias: 's', type: 'string' })
    .option('sourcemap-output-dir', { type: 'string' })
    .option('output-dir', { alias: ['o', 'output-path'], type: 'string' })
    .option('extra-bundler-option', { alias: ['extra-bundler-options'], default: [], type: 'array' })
    .option('extra-hermes-flag', { alias: ['extra-hermes-flags'], type: 'array', default: [] })
    .option('use-hermes', { default: true, type: 'boolean' })
    .option('disable-duplicate-release-error', { type: 'boolean', default: true })
    .option('buildConfigurationName', {
      alias: 'c',
      type: 'string',
    })
