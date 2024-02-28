export interface VersionSearchParams {
  os: string
  version?: string
  plistFile?: string
  plistFilePrefix?: string
  projectFile?: string
  buildConfigurationName?: string
  xcodeTargetName?: string
  gradleFile?: string
}

export interface BundlerConfig {
  os: string
  entryFile: string
  reinstallNodeModulesCommand: string
  bundleName: string
  outputDir: string
  extraBundlerOptions?: string[]
  sourcemapOutput?: string
  sourcemapOutputDir?: string
  useHermes?: boolean
  extraHermesFlags?: string[]
}

type Config = Partial<BundlerConfig> & VersionSearchParams

export type Os = { os: string }
export type App = { app: string }
export type OsOrApp = Os | App

export type CommandArgs = Omit<Config, 'os'> &
  OsOrApp & {
    bundleJson?: Record<string, unknown | null | undefined>
  }

export type BundleArgs = CommandArgs & {
  base: string
}
