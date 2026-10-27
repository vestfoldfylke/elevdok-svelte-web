import { logger } from "@vestfoldfylke/loglady"
import { TtlCache } from "./ttl-cache.js"

const MOCK_DB_TTL_SECONDS = 10000

let mockDb: TtlCache | null = null

export const getMockDb = (): TtlCache => {
  if (!mockDb) {
    logger.info("Mock db does not exist - creating")
    mockDb = new TtlCache(MOCK_DB_TTL_SECONDS)
    logger.info("Mock db created")
  }
  return mockDb
}
