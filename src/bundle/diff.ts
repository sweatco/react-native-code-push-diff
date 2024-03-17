import * as fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { assetExts } from './assetExts'
import type { Hashes } from './types'

const HASH_ALGORITHM = 'sha256'

export function ext(filePath: string) {
  const extname = path.extname(filePath)
  if (extname.startsWith('.')) {
    return extname.substr(1)
  }
  return extname
}

function getAllFiles(folderName: string, result: string[] = [], prefix = '') {
  const folderFiles = fs.readdirSync(folderName)

  for (const file of folderFiles) {
    const fullPath = path.join(folderName, file)
    const stat = fs.statSync(fullPath)
    const relativePath = path.join(prefix, file)
    if (stat.isDirectory()) {
      getAllFiles(fullPath, result, relativePath)
    } else {
      result.push(relativePath)
    }
  }

  return result
}

export async function fileHash(filePath: fs.PathLike) {
  const readStream = fs.createReadStream(filePath)
  const hashStream = crypto.createHash(HASH_ALGORITHM)

  return new Promise<string>((resolve, reject) => {
    readStream
      .pipe(hashStream)
      .on('error', reject)
      .on('finish', function () {
        hashStream.end()
        const buffer = hashStream.read()
        const hash = buffer.toString('hex')
        resolve(hash)
      })
  })
}

export async function hashes(output: string) {
  const map: Hashes = {}
  const filteTypes = await assetExts()

  for (const filePath of getAllFiles(output)) {
    if (filteTypes.includes(ext(filePath))) {
      const hash = await fileHash(path.join(output, filePath))
      map[hash] = filePath
    }
  }

  return map
}

export async function removeUnchangedAssets(output: string, current: Hashes, base: Hashes) {
  for (const [hash, filePath] of Object.entries(current)) {
    if (base[hash]) {
      fs.rmSync(path.join(output, filePath))
    }
  }
}
