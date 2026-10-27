import { error } from "@sveltejs/kit"
import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { setAdminImpersonation } from "#lib/server/elevdok-api/admin-impersonation.js"
import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async ({ request }) => {
  const { target, type } = await request.json()
  if (!type) {
    throw error(400, 'Mangler "type" i forespørselen.')
  }
  if (!target) {
    throw error(400, 'Mangler "target" i forespørselen.')
  }

  const user = await getAuthenticatedUser(request.headers)
  await setAdminImpersonation(user, target, type)

  return Response.json({ target, type })
}
