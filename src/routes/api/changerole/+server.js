import { getAuthenticatedUser } from "#lib/authentication"
import { setActiveRole } from "#lib/elevdok-api/roles"

export const POST = async ({ params, request, url }) => {
  try {
    const { requestedRole } = await request.json()
    if (!requestedRole || typeof requestedRole !== "string") return Response.json({ message: 'Missing "requestedRole" (string)' }, { status: 400 })

    const user = await getAuthenticatedUser(request.headers)
    await setActiveRole(user, requestedRole)

    return Response.json({ requestedRole })
  } catch (error) {
    return Response.json({ message: "Failed when changing role for user", error: error.response?.data || error.stack || error.toString() }, { status: 500 })
  }
}
