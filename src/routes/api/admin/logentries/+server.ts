import { getUserLogs } from "#lib/server/elevdok-api/user-logs.js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ locals, url }) => {
  const studentNumber = url.searchParams.get("student_number")
  const userPrincipalId = url.searchParams.get("user_principal_id")
  const documentNumber = url.searchParams.get("document_number")

  const filter = {
    studentNumber,
    userPrincipalId,
    documentNumber
  }

  const logEntries = await getUserLogs(locals.user, filter)

  return Response.json(logEntries)
}
