import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { deleteAdminImpersonation } from "#lib/server/elevdok-api/admin-impersonation.js"
import type { RequestHandler } from "./$types"

export const DELETE: RequestHandler = async ({ request }) => {
  const user = await getAuthenticatedUser(request.headers)
  deleteAdminImpersonation(user)

  return Response.json({ message: "Deleted" })
}
