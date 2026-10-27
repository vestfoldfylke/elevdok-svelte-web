import type { Handle, HandleServerError } from "@sveltejs/kit/hooks"
import { logger } from "@vestfoldfylke/loglady"
import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { getLogContext, runInLogContext, updateLogContext } from "#lib/server/logging/log-context.js"

// Log destinations like Betterstack and Teams send asynchronously, so flush before the server exits
process.on("sveltekit:shutdown", async () => {
  await logger.flush()
})

export const handle: Handle = async ({ event, resolve }) => {
  return runInLogContext({ contextId: crypto.randomUUID() }, async () => {
    event.locals.user = await getAuthenticatedUser(event.request.headers)
    updateLogContext({ prefix: event.locals.user.principalName })
    return resolve(event)
  })
}

/** Expected errors (`error(...)`) and SvelteKit's own errors already carry a safe message. Unexpected errors are logged and replaced by a generic message. */
export const handleError: HandleServerError = ({ kind, error, event }) => {
  if (kind === "app") {
    logger.warn("{Method} {Path} answered {Status}: {Message}", event.request.method, event.url.pathname, error.status, error.message)
    return
  }
  if (kind !== "unknown") {
    return
  }
  // The request's contextId, so support can find every log line for the request
  const errorId = getLogContext()?.contextId ?? crypto.randomUUID()
  logger.errorException(error, "{Method} {Path} failed with error id {ErrorId}", event.request.method, event.url.pathname, errorId)
  // The id is part of the message, because the fallback error page (error.html) only shows status and message
  return { message: `Noe gikk galt. Prøv igjen, og kontakt support med feil-id ${errorId} om det fortsetter.` }
}
