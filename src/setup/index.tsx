import { setupCustomSourceTransformer } from './assetsResolver'
import { setupCodepushInfo } from './codepushInfo'
import bundle from '../../bundle_config.json'

export function setupCodepushDiff<Config extends Record<string, any>>(config: Config) {
  const codepushInfo = setupCodepushInfo(config)
  const changedAssets = codepushInfo.changedAssets ?? null
  const mainBundlePath = codepushInfo?.mainBundlePath ?? ''
  if (changedAssets) {
    setupCustomSourceTransformer(mainBundlePath, changedAssets)
  }

  return codepushInfo
}

setupCodepushDiff(bundle)
