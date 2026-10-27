import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { getFile } from "#lib/server/elevdok-api/get-file.js"
import { FEIDENAVN_SUFFIX } from "$app/env/private"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ params, request }) => {
  const user = await getAuthenticatedUser(request.headers)
  const studentFeidenavn = `${params.feidenavnPrefix}@${FEIDENAVN_SUFFIX}`
  const sourceId = params.sourceId
  const fileId = params.fileId
  const base64 = await getFile(user, studentFeidenavn, sourceId, fileId)
  return Response.json(base64)
}
