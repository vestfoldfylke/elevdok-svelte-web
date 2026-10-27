import type { HandleServerError } from "@sveltejs/kit/hooks"
import { logger } from "@vtfk/logger"
import { getErrorDetails } from "#lib/server/error-details.js"

/** Expected errors (`error(...)`) and SvelteKit's own errors already carry a safe message. Unexpected errors are logged and replaced by a generic message. */
export const handleError: HandleServerError = ({ kind, error, event }) => {
  if (kind === "app") {
    logger("warn", [`${event.request.method} ${event.url.pathname}`, `${error.status}: ${error.message}`])
    return
  }
  if (kind !== "unknown") {
    return
  }
  const errorId = crypto.randomUUID()
  logger("error", [`${event.request.method} ${event.url.pathname}`, `errorId: ${errorId}`, getErrorDetails(error)])
  // The id is part of the message, because the fallback error page (error.html) only shows status and message
  return { message: `Noe gikk galt. Prøv igjen, og kontakt support med feil-id ${errorId} om det fortsetter.` }
}
