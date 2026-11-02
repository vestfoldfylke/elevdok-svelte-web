import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { setTimeout as delay } from "node:timers/promises"
import { getLogContext, runInLogContext, updateLogContext } from "./log-context.ts"

describe("log context", () => {
  it("keeps the context across awaits inside the callback", async () => {
    const contextId = await runInLogContext({ contextId: "request-1" }, async () => {
      await delay(1)
      return getLogContext()?.contextId
    })

    assert.equal(contextId, "request-1")
  })

  it("keeps concurrent contexts apart", async () => {
    const runRequest = (contextId: string, delayMilliseconds: number): Promise<string | undefined> =>
      runInLogContext({ contextId }, async () => {
        await delay(delayMilliseconds)
        return getLogContext()?.contextId
      })

    const contextIds = await Promise.all([runRequest("slow", 20), runRequest("fast", 1)])

    assert.deepEqual(contextIds, ["slow", "fast"])
  })

  it("updates only the context of the current run", async () => {
    let otherPrefix: string | undefined
    const updated = runInLogContext({ contextId: "updated" }, async () => {
      updateLogContext({ prefix: "user@fylke.no" })
      await delay(5)
      return getLogContext()?.prefix
    })
    const other = runInLogContext({ contextId: "other" }, async () => {
      await delay(10)
      otherPrefix = getLogContext()?.prefix
    })

    const [updatedPrefix] = await Promise.all([updated, other])

    assert.equal(updatedPrefix, "user@fylke.no")
    assert.equal(otherPrefix, undefined)
  })

  it("has no context outside a run", () => {
    assert.equal(getLogContext(), undefined)
  })
})
