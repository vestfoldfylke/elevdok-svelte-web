import { error } from "@sveltejs/kit"
import { setActiveRole } from "#lib/server/elevdok-api/roles.js"
import { readJsonBody } from "#lib/server/http/read-json-body.js"
import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async ({ locals, request }) => {
  const { requestedRole } = await readJsonBody(request)
  if (typeof requestedRole !== "string" || !requestedRole) {
    throw error(400, 'Mangler "requestedRole" (tekst) i forespørselen.')
  }

  await setActiveRole(locals.user, requestedRole)

  return Response.json({ requestedRole })
}
