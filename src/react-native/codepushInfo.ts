import { NativeModules, Platform } from 'react-native'

/**
 * These parameters are set during codepush build.
 */
export interface CodepushInfo {
  mainBundlePath?: string
}

const CodepushInfoModule: CodepushInfo | null = NativeModules.CodePushDiff

if (process.env.NODE_ENV !== 'test' && Platform.OS === 'ios' && !CodepushInfoModule) {
  throw new Error('You seem to have forgotten to link the native part!')
}

const mainBundlePath = CodepushInfoModule?.mainBundlePath

export function setupCodepushInfo(): CodepushInfo {
  return {
    mainBundlePath,
  }
}
