import * as fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileExists } from './utils'
import { assetExts } from './assetExts'

const FILE_TYPES = new Set(assetExts)
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

async function fileHash(filePath: fs.PathLike) {
  const readStream = fs.createReadStream(filePath)
  const hashStream = crypto.createHash(HASH_ALGORITHM)

  return new Promise((resolve, reject) => {
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

export async function diffAssets(currentOutput: string, baseOutput: string) {
  const changed = []
  for (const filePath of getAllFiles(currentOutput)) {
    if (!fileExists(path.join(baseOutput, filePath))) {
      changed.push(filePath)
      continue
    }
    if (!FILE_TYPES.has(ext(filePath))) {
      continue
    }
    const [currentHash, baseHash] = await Promise.all([
      fileHash(path.join(currentOutput, filePath)),
      fileHash(path.join(baseOutput, filePath)),
    ])
    if (currentHash !== baseHash) {
      changed.push(filePath)
    }
  }

  return changed
}

export async function removeUnchangedAssets(currentOutput: string, baseOutput: string) {
  for (const filePath of getAllFiles(currentOutput)) {
    if (!FILE_TYPES.has(ext(filePath))) {
      continue
    }
    if (!fileExists(path.join(baseOutput, filePath))) {
      continue
    }
    const [currentHash, baseHash] = await Promise.all([
      fileHash(path.join(currentOutput, filePath)),
      fileHash(path.join(baseOutput, filePath)),
    ])
    if (currentHash === baseHash) {
      fs.rmSync(path.join(currentOutput, filePath))
    }
  }
}
