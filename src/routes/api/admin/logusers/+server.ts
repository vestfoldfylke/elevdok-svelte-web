import { searchLoggedUsers } from "#lib/server/elevdok-api/user-logs.js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ locals, url }) => {
  const searchName = url.searchParams.get("search_name")

  const users = await searchLoggedUsers(locals.user, searchName)
  return Response.json(users)
}
