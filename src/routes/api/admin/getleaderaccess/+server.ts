import { getAllLeaderAccess } from "#lib/server/elevdok-api/leder-access.js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ locals }) => {
  const leaderAccess = await getAllLeaderAccess(locals.user)

  return Response.json(leaderAccess)
}
