export interface VersionSearchParams {
  os: string
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
  outputPath: string
}

type Config = Partial<BundlerConfig> & VersionSearchParams

export type Os = { os: string }
export type App = { app: string }
export type OsOrApp = Os | App

export type BundleArgs = Omit<Config, 'os'> &
  OsOrApp & {
    base: string
    bundleJson?: Record<string, unknown | null | undefined>
  }
