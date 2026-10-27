import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { getAdminImpersonation } from "#lib/server/elevdok-api/admin-impersonation.js"
import { getErrorDetails } from "#lib/server/error-details.js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ request }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const impersonation = getAdminImpersonation(user)

    return Response.json({ impersonation })
  } catch (error) {
    return Response.json({ message: "Failed when getting user impersonation", error: getErrorDetails(error) }, { status: 400 })
  }
}
