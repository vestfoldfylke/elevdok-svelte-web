import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { getStudentDocuments } from "#lib/server/elevdok-api/get-student-documents.js"
import { FEIDENAVN_SUFFIX } from "$app/env/private"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ params, request }) => {
  const user = await getAuthenticatedUser(request.headers)
  const studentFeidenavn = `${params.feidenavnPrefix}@${FEIDENAVN_SUFFIX}`
  const { documents, errors } = await getStudentDocuments(user, studentFeidenavn)
  return {
    studentDocuments: {
      documents,
      errors
    }
  }
}
