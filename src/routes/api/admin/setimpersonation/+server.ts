import { error } from "@sveltejs/kit"
import { setAdminImpersonation } from "#lib/server/elevdok-api/admin-impersonation.js"
import { readJsonBody } from "#lib/server/http/read-json-body.js"
import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async ({ locals, request }) => {
  const { target, type } = await readJsonBody(request)
  if (typeof target !== "string" || !target) {
    throw error(400, 'Mangler "target" (tekst) i forespørselen.')
  }
  if (type !== "larer" && type !== "leder") {
    throw error(400, 'Rollen du vil logge inn med ("type") må være "larer" eller "leder".')
  }

  await setAdminImpersonation(locals.user, target, type)

  return Response.json({ target, type })
}
