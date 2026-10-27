import type { Handle, HandleServerError } from "@sveltejs/kit/hooks"
import { logger } from "@vtfk/logger"
import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { getErrorDetails } from "#lib/server/error-details.js"

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = await getAuthenticatedUser(event.request.headers)
  return resolve(event)
}

/** Expected errors (`error(...)`) and SvelteKit's own errors already carry a safe message. Unexpected errors are logged and replaced by a generic message. */
export const handleError: HandleServerError = ({ kind, error, event }) => {
  // locals.user is not set when authentication itself failed
  const requestDescription = `${event.request.method} ${event.url.pathname} - user: ${event.locals.user?.principalName ?? "unauthenticated"}`
  if (kind === "app") {
    logger("warn", [requestDescription, `${error.status}: ${error.message}`])
    return
  }
  if (kind !== "unknown") {
    return
  }
  const errorId = crypto.randomUUID()
  logger("error", [requestDescription, `errorId: ${errorId}`, getErrorDetails(error)])
  // The id is part of the message, because the fallback error page (error.html) only shows status and message
  return { message: `Noe gikk galt. Prøv igjen, og kontakt support med feil-id ${errorId} om det fortsetter.` }
}
