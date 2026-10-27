import { TtlCache } from "./ttl-cache.js"

const MOCK_DB_TTL_SECONDS = 10000

let mockDb: TtlCache | null = null

export const getMockDb = (): TtlCache => {
  if (!mockDb) {
    mockDb = new TtlCache(MOCK_DB_TTL_SECONDS)
  }

  return mockDb
}
