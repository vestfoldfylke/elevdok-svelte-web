import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { getAdminImpersonation } from "#lib/server/elevdok-api/admin-impersonation.js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ request }) => {
  const user = await getAuthenticatedUser(request.headers)
  const impersonation = getAdminImpersonation(user)

  return Response.json({ impersonation })
}
