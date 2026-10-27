import { error } from "@sveltejs/kit"
import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { setActiveRole } from "#lib/server/elevdok-api/roles.js"
import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async ({ request }) => {
  const { requestedRole } = await request.json()
  if (!requestedRole || typeof requestedRole !== "string") {
    throw error(400, 'Mangler "requestedRole" (tekst) i forespørselen.')
  }

  const user = await getAuthenticatedUser(request.headers)
  await setActiveRole(user, requestedRole)

  return Response.json({ requestedRole })
}
