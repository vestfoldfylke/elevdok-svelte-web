import { TtlCache } from "./ttl-cache.js"

const INTERNAL_CACHE_TTL_SECONDS = 10000

let internalCache: TtlCache | null = null

export const getInternalCache = (): TtlCache => {
  if (!internalCache) {
    internalCache = new TtlCache(INTERNAL_CACHE_TTL_SECONDS)
  }

  return internalCache
}
