import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it, mock } from "node:test"
import { TtlCache } from "./ttl-cache.ts"

describe("TtlCache", () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ["Date"], now: 0 })
  })

  afterEach(() => {
    mock.timers.reset()
  })

  it("returns a value until its ttl has passed", () => {
    const cache = new TtlCache(60)
    cache.set("key", "value", 10)

    mock.timers.tick(10_000)
    const beforeExpiry = cache.get<string>("key")
    mock.timers.tick(1)
    const afterExpiry = cache.get<string>("key")

    assert.equal(beforeExpiry, "value")
    assert.equal(afterExpiry, undefined)
  })

  it("uses the default ttl when set is called without one", () => {
    const cache = new TtlCache(5)
    cache.set("key", "value")

    mock.timers.tick(5_001)

    assert.equal(cache.get("key"), undefined)
  })

  it("returns undefined for a key that was never set", () => {
    const cache = new TtlCache(60)

    assert.equal(cache.get("missing"), undefined)
  })

  it("does not let callers mutate the cached value through set or get", () => {
    const cache = new TtlCache(60)
    const original = { items: ["a"] }
    cache.set("key", original)

    original.items.push("changed after set")
    cache.get<{ items: string[] }>("key")?.items.push("changed after get")

    assert.deepEqual(cache.get("key"), { items: ["a"] })
  })

  it("removes a deleted key", () => {
    const cache = new TtlCache(60)
    cache.set("key", "value")

    cache.delete("key")

    assert.equal(cache.get("key"), undefined)
  })

  it("lists only keys that have not expired", () => {
    const cache = new TtlCache(60)
    cache.set("short", "value", 1)
    cache.set("long", "value", 100)

    mock.timers.tick(1_001)

    assert.deepEqual(cache.keys(), ["long"])
  })
})
