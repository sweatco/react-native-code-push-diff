import { loadConfig } from 'metro'

export async function assetExts() {
  const config = await loadConfig()

  return config.resolver.assetExts
}
