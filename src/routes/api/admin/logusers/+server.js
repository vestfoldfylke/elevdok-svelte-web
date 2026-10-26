import { logger } from "@vtfk/logger"
import { getAuthenticatedUser } from "#lib/authentication"
import { logUserSearch } from "#lib/elevdok-api/user-logs"

export const GET = async ({ params, request, url }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const searchName = url.searchParams.get("search_name")

    const users = await logUserSearch(user, searchName)
    return Response.json(users)
  } catch (error) {
    logger("error", ["Failed when getting log users", error.response?.data || error.stack || error.toString()])
    return Response.json({ message: "Feilet ved henting av brukere", error: error.response?.data || error.stack || error.toString() }, { status: 400 })
  }
}
