import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { setActiveRole } from "#lib/server/elevdok-api/roles.js"
import { getErrorDetails } from "#lib/server/error-details.js"
import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { requestedRole } = await request.json()
    if (!requestedRole || typeof requestedRole !== "string") {
      return Response.json({ message: 'Missing "requestedRole" (string)' }, { status: 400 })
    }

    const user = await getAuthenticatedUser(request.headers)
    await setActiveRole(user, requestedRole)

    return Response.json({ requestedRole })
  } catch (error) {
    return Response.json({ message: "Failed when changing role for user", error: getErrorDetails(error) }, { status: 500 })
  }
}
