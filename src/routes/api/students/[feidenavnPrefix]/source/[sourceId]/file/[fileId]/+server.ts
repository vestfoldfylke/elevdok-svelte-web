import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { getFile } from "#lib/server/elevdok-api/get-file.js"
import { getErrorDetails } from "#lib/server/error-details.js"
import { FEIDENAVN_SUFFIX } from "$app/env/private"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ params, request }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const studentFeidenavn = `${params.feidenavnPrefix}@${FEIDENAVN_SUFFIX}`
    const sourceId = params.sourceId
    const fileId = params.fileId
    const base64 = await getFile(user, studentFeidenavn, sourceId, fileId)
    return Response.json(base64)
  } catch (error) {
    return Response.json({ message: "Failed when getting student", error: getErrorDetails(error) }, { status: 500 })
  }
}
