import { setupCustomSourceTransformer } from './assetsResolver'
import { setupCodepushInfo } from './codepushInfo'

export function setupCodepushDiff() {
  const codepushInfo = setupCodepushInfo()
  const mainBundlePath = codepushInfo?.mainBundlePath ?? ''
  setupCustomSourceTransformer(mainBundlePath)

  return codepushInfo
}
