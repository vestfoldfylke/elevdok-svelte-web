import { getAuthenticatedUser } from "#lib/authentication.js"
import { getUserData } from "#lib/elevdok-api/get-user-data.js"

export const GET = async ({ request }) => {
  const user = await getAuthenticatedUser(request.headers)
  const userData = await getUserData(user)
  return Response.json(userData)
}
