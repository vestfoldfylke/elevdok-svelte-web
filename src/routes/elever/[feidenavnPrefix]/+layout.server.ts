import { getStudentDocuments } from "#lib/server/elevdok-api/get-student-documents.js"
import { FEIDENAVN_SUFFIX } from "$app/env/private"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ locals, params }) => {
  const studentFeidenavn = `${params.feidenavnPrefix}@${FEIDENAVN_SUFFIX}`
  const { documents, errors } = await getStudentDocuments(locals.user, studentFeidenavn)

  return {
    studentDocuments: {
      documents,
      errors
    }
  }
}
