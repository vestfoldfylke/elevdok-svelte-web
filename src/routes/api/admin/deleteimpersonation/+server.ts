import { deleteAdminImpersonation } from "#lib/server/elevdok-api/admin-impersonation.js"
import type { RequestHandler } from "./$types"

export const DELETE: RequestHandler = async ({ locals }) => {
  deleteAdminImpersonation(locals.user)

  return Response.json({ message: "Deleted" })
}
