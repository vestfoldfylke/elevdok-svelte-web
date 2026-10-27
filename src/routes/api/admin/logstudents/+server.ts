import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { logStudentSearch } from "#lib/server/elevdok-api/user-logs.js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ request, url }) => {
  const user = await getAuthenticatedUser(request.headers)
  const searchName = url.searchParams.get("search_name")

  const students = await logStudentSearch(user, searchName)
  return Response.json(students)
}
