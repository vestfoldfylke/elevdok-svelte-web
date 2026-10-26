import { error } from "@sveltejs/kit"
import { logger } from "@vtfk/logger"
import { getAuthenticatedUser } from "#lib/authentication.js"
import { getStudentDocuments } from "#lib/elevdok-api/get-student-documents.js"
import { getErrorDetails } from "#lib/helpers/error-details.js"
import { FEIDENAVN_SUFFIX } from "$app/env/private"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ params, request }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)
    const studentFeidenavn = `${params.feidenavnPrefix}@${FEIDENAVN_SUFFIX}`
    const { documents, errors } = await getStudentDocuments(user, studentFeidenavn)
    return {
      studentDocuments: {
        documents,
        errors
      }
    }
  } catch (err) {
    logger("error", ["Could not get student...", getErrorDetails(err)])
    throw error(500, `Kunne ikke hente elev. Feilmelding: ${String(err)}`)
  }
}
