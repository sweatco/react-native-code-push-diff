import path from 'path'
import { ROOT } from './utils'

const metroConfig = require(path.join(ROOT, 'metro.config.js'))

const { assetExts } = metroConfig.resolver

if (!assetExts) {
  throw new Error('There is no assetExts metro.config.js')
}

export { assetExts }
