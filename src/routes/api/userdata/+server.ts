import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { getUserData } from "#lib/server/elevdok-api/get-user-data.js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ request }) => {
  const user = await getAuthenticatedUser(request.headers)
  const userData = await getUserData(user)
  return Response.json({ user, ...userData })
}
