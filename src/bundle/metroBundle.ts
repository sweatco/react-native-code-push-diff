const path = require('path')
const { spawnSync } = require('child_process')

interface MetroBundleOptions {
  platform: string
  entryFile: string
  outputDir?: string
  development?: boolean
  resetCache?: boolean
  bundleName?: string
  bundleOutput?: string
  assetsDest?: string
  sourcemapOutputDir?: string
  sourcemapOutput?: string
  bundleCommand?: string
  extraBundlerOptions?: string[]
}

export const metroBundle = ({
  platform,
  entryFile,
  outputDir = '',
  development = false,
  resetCache = true,
  bundleCommand = 'bundle',
  bundleName,
  bundleOutput = path.join(outputDir, bundleName),
  assetsDest = outputDir,
  sourcemapOutputDir = '',
  sourcemapOutput = sourcemapOutputDir ? path.join(sourcemapOutputDir, `${bundleName}.map`) : null,
  extraBundlerOptions = [],
}: MetroBundleOptions) => {
  const args = [
    bundleCommand,
    `--platform=${platform}`,
    `--entry-file=${entryFile}`,
    `--dev=${development}`,
    `--bundle-output=${bundleOutput}`,
    sourcemapOutput && `--sourcemap-output=${sourcemapOutput}`,
    assetsDest && `--assets-dest=${assetsDest}`,
    resetCache && '--reset-cache',
    ...extraBundlerOptions,
  ].filter(Boolean)

  spawnSync(getCliPath(), args, { stdio: 'inherit' })
}

function getCliPath() {
  return path.join('node_modules', '.bin', 'react-native')
}
