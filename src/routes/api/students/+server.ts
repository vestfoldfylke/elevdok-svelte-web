import { getUserData } from "#lib/server/elevdok-api/get-user-data.js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ locals }) => {
  const userData = await getUserData(locals.user)
  return Response.json(userData)
}
