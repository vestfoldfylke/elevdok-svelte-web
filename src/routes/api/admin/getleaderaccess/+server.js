import { getAuthenticatedUser } from "#lib/authentication.js"
import { getAllLeaderAccess } from "#lib/elevdok-api/leder-access.js"

export const GET = async ({ params, request, url }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const leaderAccess = await getAllLeaderAccess(user)

    return Response.json(leaderAccess)
  } catch (error) {
    return Response.json({ message: "Failed when getting all leader access", error: error.response?.data || error.stack || error.toString() }, { status: 400 })
  }
}
