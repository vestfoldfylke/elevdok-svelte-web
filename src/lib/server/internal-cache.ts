import { logger } from "@vestfoldfylke/loglady"
import { TtlCache } from "./ttl-cache.js"

const INTERNAL_CACHE_TTL_SECONDS = 10000

let internalCache: TtlCache | null = null

export const getInternalCache = (): TtlCache => {
  if (!internalCache) {
    logger.info("Internal cache does not exist - creating")
    internalCache = new TtlCache(INTERNAL_CACHE_TTL_SECONDS)
    logger.info("Internal cache created")
  }

  return internalCache
}
