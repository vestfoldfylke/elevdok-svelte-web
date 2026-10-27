import { logger } from "@vtfk/logger"
import { TtlCache } from "./ttl-cache.js"

const MOCK_DB_TTL_SECONDS = 10000

let mockDb: TtlCache | null = null

export const getMockDb = (): TtlCache => {
  if (!mockDb) {
    logger("info", ["mock-db", "Mock db does not exist - creating"])
    mockDb = new TtlCache(MOCK_DB_TTL_SECONDS)
    logger("info", ["mock-db", "Mock db created - returning"])
  }
  return mockDb
}
