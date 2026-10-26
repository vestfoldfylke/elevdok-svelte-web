import { getAuthenticatedUser } from "#lib/authentication.js"
import { getAllLeaderAccess } from "#lib/elevdok-api/leder-access.js"
import { getErrorDetails } from "#lib/helpers/error-details.js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ request }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const leaderAccess = await getAllLeaderAccess(user)

    return Response.json(leaderAccess)
  } catch (error) {
    return Response.json({ message: "Failed when getting all leader access", error: getErrorDetails(error) }, { status: 400 })
  }
}
