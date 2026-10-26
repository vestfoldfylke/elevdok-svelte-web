import { getAuthenticatedUser } from "#lib/authentication.js"
import { getAdminImpersonation } from "#lib/elevdok-api/admin-impersonation.js"

export const GET = async ({ request }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const impersonation = getAdminImpersonation(user)

    return Response.json({ impersonation })
  } catch (error) {
    return Response.json({ message: "Failed when getting user impersonation", error: error.response?.data || error.stack || error.toString() }, { status: 400 })
  }
}
