import crypto from 'crypto'

// A simple in-memory cache for serverless environment.
// Note: This will be cleared on cold starts, but it effectively prevents
// accidental double-submissions or immediate retries of the same file.
const globalCache = new Map<string, any>()

export function getFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export function getCachedResult(hash: string) {
  return globalCache.get(hash)
}

export function setCachedResult(hash: string, result: any) {
  globalCache.set(hash, result)
}
