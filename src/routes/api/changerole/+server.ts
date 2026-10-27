import { error } from "@sveltejs/kit"
import { setActiveRole } from "#lib/server/elevdok-api/roles.js"
import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async ({ locals, request }) => {
  const { requestedRole } = await request.json()
  if (!requestedRole || typeof requestedRole !== "string") {
    throw error(400, 'Mangler "requestedRole" (tekst) i forespørselen.')
  }

  await setActiveRole(locals.user, requestedRole)

  return Response.json({ requestedRole })
}
