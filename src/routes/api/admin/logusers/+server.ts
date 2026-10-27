import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { logUserSearch } from "#lib/server/elevdok-api/user-logs.js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ request, url }) => {
  const user = await getAuthenticatedUser(request.headers)
  const searchName = url.searchParams.get("search_name")

  const users = await logUserSearch(user, searchName)
  return Response.json(users)
}
