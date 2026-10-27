import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { getAllLeaderAccess } from "#lib/server/elevdok-api/leder-access.js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ request }) => {
  const user = await getAuthenticatedUser(request.headers)
  const leaderAccess = await getAllLeaderAccess(user)

  return Response.json(leaderAccess)
}
