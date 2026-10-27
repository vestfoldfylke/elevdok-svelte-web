import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { getUserLogs } from "#lib/server/elevdok-api/user-logs.js"
import { getErrorDetails } from "#lib/server/error-details.js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ request, url }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const studentNumber = url.searchParams.get("student_number")
    const userPrincipalId = url.searchParams.get("user_principal_id")
    const documentNumber = url.searchParams.get("document_number")

    const filter = {
      studentNumber,
      userPrincipalId,
      documentNumber
    }

    const logEntries = await getUserLogs(user, filter)

    return Response.json(logEntries)
  } catch (error) {
    return Response.json({ message: "Failed when getting log entries", error: getErrorDetails(error) }, { status: 400 })
  }
}
