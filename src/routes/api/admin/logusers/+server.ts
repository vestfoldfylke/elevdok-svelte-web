import { logger } from "@vtfk/logger"
import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { logUserSearch } from "#lib/server/elevdok-api/user-logs.js"
import { getErrorDetails } from "#lib/server/error-details.js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ request, url }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const searchName = url.searchParams.get("search_name")

    const users = await logUserSearch(user, searchName)
    return Response.json(users)
  } catch (error) {
    logger("error", ["Failed when getting log users", getErrorDetails(error)])
    return Response.json({ message: "Feilet ved henting av brukere", error: getErrorDetails(error) }, { status: 400 })
  }
}
