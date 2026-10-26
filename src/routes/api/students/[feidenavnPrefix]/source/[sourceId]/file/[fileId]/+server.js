import { getAuthenticatedUser } from "#lib/authentication.js"
import { getFile } from "#lib/elevdok-api/get-file.js"
import { FEIDENAVN_SUFFIX } from "$app/env/private"

export const GET = async ({ params, request, url }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const studentFeidenavn = `${params.feidenavnPrefix}@${FEIDENAVN_SUFFIX}`
    const sourceId = params.sourceId
    const fileId = params.fileId
    const base64 = await getFile(user, studentFeidenavn, sourceId, fileId)
    return Response.json(base64)
  } catch (error) {
    return Response.json({ message: "Failed when getting student", error: error.response?.data || error.stack || error.toString() }, { status: 500 })
  }
}
