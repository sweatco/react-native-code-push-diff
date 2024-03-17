import { Image, Platform } from 'react-native'
import type { ImageResolvedAssetSource } from 'react-native'
import type { MainAssets } from '../shared/types'

// See https://github.com/facebook/react-native/blob/v0.71.7/Libraries/Image/AssetSourceResolver.js#L53
interface AssetSourceResolver {
  asset: ImageResolvedAssetSource & {
    mainBundleAssets?: MainAssets
  }
  defaultAsset(): ImageResolvedAssetSource
}

type AssetTransformer = (resolver: AssetSourceResolver) => ImageResolvedAssetSource

const makeMainBundleUri = (mainBundlePath: string, mainBundleAsset: string) => {
  return Platform.OS === 'ios' ? `file://${mainBundlePath}/${mainBundleAsset}` : mainBundleAsset
}

const codePushTransformer =
  (mainBundlePath: string): AssetTransformer =>
  (resolver) => {
    const defaultAsset = resolver.defaultAsset()
    const mainBundleAsset = resolver.asset?.mainBundleAssets?.[defaultAsset.scale]

    if (mainBundleAsset) {
      return {
        ...defaultAsset,
        uri: makeMainBundleUri(mainBundlePath, mainBundleAsset),
      }
    }

    return defaultAsset
  }

type SetSourceTransformer = (transformer: AssetTransformer) => void

const setCustomSourceTransformer: SetSourceTransformer =
  // See https://github.com/facebook/react-native/blob/v0.71.7/Libraries/Image/resolveAssetSource.js#L77
  // @ts-expect-error
  Image.resolveAssetSource.addCustomSourceTransformer || Image.resolveAssetSource.setCustomSourceTransformer

if (__DEV__ && typeof setCustomSourceTransformer !== 'function') {
  throw new Error('There is no setCustomSourceTransformer frunction')
}

export const setupCustomSourceTransformer = (mainBundlePath: string) =>
  setCustomSourceTransformer(codePushTransformer(mainBundlePath))
