import { NativeModules, Platform } from 'react-native'

/**
 * These parameters are set during codepush build.
 */
export type Info = Partial<{
  changedAssets: string[]
  mainBundlePath: string
}>

interface CodepushInfoIOSModule {
  mainBundlePath?: string
}

const CodepushInfoModule: CodepushInfoIOSModule | null = NativeModules.CodePushDiff

if (process.env.NODE_ENV !== 'test' && Platform.OS === 'ios' && !CodepushInfoModule) {
  throw new Error('You seem to have forgotten to link the native part!')
}

const mainBundlePath = CodepushInfoModule?.mainBundlePath

export function setupCodepushInfo<Config extends Record<string, any>>(config: Config): Info & Partial<Config> {
  return {
    mainBundlePath,
    ...config,
  }
}
