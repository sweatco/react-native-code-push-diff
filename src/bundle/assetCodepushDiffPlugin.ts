import type { AssetData } from 'metro'
import * as fs from 'fs'
import path from 'path'
import { fileHash } from './diff'
import type { Hashes } from './types'
import type { MainAssets } from '../shared/types'

interface DiffAssetData extends AssetData {
  mainBundleAssets?: MainAssets
}

let baseHashes: Hashes = {}
const BASE_ASSETS_PATH: string | undefined = process.env.BASE_ASSETS_PATH
const PLATFORM: string | undefined = process.env.CODE_PUSH_PLATFORM

if (BASE_ASSETS_PATH) {
  const json = fs.readFileSync(BASE_ASSETS_PATH, 'utf-8')
  baseHashes = JSON.parse(json)
}

export async function assetCodepushDiffPlugin(assetData: DiffAssetData) {
  if (PLATFORM == null) {
    return assetData
  }
  const assets: MainAssets = {}
  const { files, scales } = assetData

  for (let i = 0; i < scales.length; i++) {
    const file = files[i]
    const scale = scales[i]
    if (file != null && scale != null) {
      const hash = await fileHash(file)
      const baselineFile = baseHashes[hash]
      if (baselineFile) {
        assets[scale] = mainAssetPath(baselineFile)
      }
    }
  }

  if (Object.keys(assets).length > 0) {
    assetData.mainBundleAssets = assets
  }

  return assetData
}

function mainAssetPath(baselineFile: string) {
  if (PLATFORM === 'android') {
    return path.basename(baselineFile, path.extname(baselineFile))
  }

  return baselineFile
}
