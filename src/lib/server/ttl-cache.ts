type CacheEntry = {
  value: unknown
  expiresAt: number
}

const MILLISECONDS_PER_SECOND = 1000

/** In-memory cache with per-entry expiry. Values are deep-copied on set and get, so callers can't mutate what is cached. */
export class TtlCache {
  private readonly store = new Map<string, CacheEntry>()
  private readonly defaultTtlSeconds: number

  constructor(defaultTtlSeconds: number) {
    this.defaultTtlSeconds = defaultTtlSeconds
  }

  set(key: string, value: unknown, ttlSeconds = this.defaultTtlSeconds): void {
    this.deleteExpired()
    this.store.set(key, { value: structuredClone(value), expiresAt: Date.now() + ttlSeconds * MILLISECONDS_PER_SECOND })
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) {
      return undefined
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }

    return structuredClone(entry.value) as T
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  keys(): string[] {
    this.deleteExpired()
    return [...this.store.keys()]
  }

  private deleteExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
      }
    }
  }
}
