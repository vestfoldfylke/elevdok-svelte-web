import { error } from "@sveltejs/kit"
import { setAdminImpersonation } from "#lib/server/elevdok-api/admin-impersonation.js"
import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async ({ locals, request }) => {
  const { target, type } = await request.json()
  if (!type) {
    throw error(400, 'Mangler "type" i forespørselen.')
  }
  if (!target) {
    throw error(400, 'Mangler "target" i forespørselen.')
  }

  await setAdminImpersonation(locals.user, target, type)

  return Response.json({ target, type })
}
