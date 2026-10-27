import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { deleteAdminImpersonation } from "#lib/server/elevdok-api/admin-impersonation.js"
import { getErrorDetails } from "#lib/server/error-details.js"
import type { RequestHandler } from "./$types"

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    deleteAdminImpersonation(user)

    return Response.json({ message: "Deleted" })
  } catch (error) {
    return Response.json({ message: "Failed when deleting user impersonation", error: getErrorDetails(error) }, { status: 400 })
  }
}
