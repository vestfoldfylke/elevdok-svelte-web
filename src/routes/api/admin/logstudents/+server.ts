import { logStudentSearch } from "#lib/server/elevdok-api/user-logs.js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ locals, url }) => {
  const searchName = url.searchParams.get("search_name")

  const students = await logStudentSearch(locals.user, searchName)
  return Response.json(students)
}
