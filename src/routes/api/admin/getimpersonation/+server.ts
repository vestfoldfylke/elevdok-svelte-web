import { getAdminImpersonation } from "#lib/server/elevdok-api/admin-impersonation.js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ locals }) => {
  const impersonation = getAdminImpersonation(locals.user)

  return Response.json({ impersonation })
}
