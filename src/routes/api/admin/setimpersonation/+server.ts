import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { setAdminImpersonation } from "#lib/server/elevdok-api/admin-impersonation.js"
import { getErrorDetails } from "#lib/server/error-details.js"
import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { target, type } = await request.json()
    if (!type) {
      return Response.json({ message: 'Missing "type"' }, { status: 400 })
    }
    if (!target) {
      return Response.json({ message: 'Missing "target"' }, { status: 400 })
    }

    const user = await getAuthenticatedUser(request.headers)
    await setAdminImpersonation(user, target, type)

    return Response.json({ target, type })
  } catch (error) {
    return Response.json({ message: "Failed when setting user impersonation", error: getErrorDetails(error) }, { status: 400 })
  }
}
