import { logger } from "@vtfk/logger"
import NodeCache from "node-cache"

let internalCache: NodeCache | null = null

export const getInternalCache = (): NodeCache => {
  if (!internalCache) {
    logger("info", ["internal-cache", "Internal cache does not exist - creating"])
    internalCache = new NodeCache({ stdTTL: 10000 })
    logger("info", ["internal-cache", "Internal cache created - returning"])
  }
  return internalCache
}

export const resetInternalCache = (): boolean => {
  if (!internalCache) {
    return true
  }
  logger("info", ["internal-cache", "Resetting internal cache"])
  internalCache.flushAll()
  logger("info", ["internal-cache", "Reset internal cache - done"])
  return true
}
