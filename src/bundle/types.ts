export type Hashes = Record<string, string>

export interface VersionSearchParams {
  platform: string
  version?: string
  plistFile?: string
  plistFilePrefix?: string
  projectFile?: string
  buildConfigurationName?: string
  xcodeTargetName?: string
  gradleFile?: string
  xcodeProjectFile?: string
}

export interface BundlerConfig extends VersionSearchParams {
  os: string
  entryFile: string
  reinstallNodeModulesCommand: string
  bundleName: string
  outputDir: string
  extraBundlerOptions?: string[]
  sourcemapOutput?: string
  sourcemapOutputDir: string
  useHermes?: boolean
  extraHermesFlags?: string[]
  bundleCommand?: string
  development?: boolean
}

export type CommandArgs = Partial<BundlerConfig> & { os: string }

export type BundleArgs = CommandArgs & {
  base: string
}
