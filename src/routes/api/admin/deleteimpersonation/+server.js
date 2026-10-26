import { getAuthenticatedUser } from "#lib/authentication.js"
import { deleteAdminImpersonation } from "#lib/elevdok-api/admin-impersonation.js"

export const DELETE = async ({ params, request, url }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    deleteAdminImpersonation(user)

    return Response.json({ message: "Deleted" })
  } catch (error) {
    return Response.json({ message: "Failed when deleting user impersonation", error: error.response?.data || error.stack || error.toString() }, { status: 400 })
  }
}
