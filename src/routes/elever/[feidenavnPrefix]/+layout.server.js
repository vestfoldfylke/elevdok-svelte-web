import { error } from "@sveltejs/kit"
import { logger } from "@vtfk/logger"
import { getAuthenticatedUser } from "#lib/authentication"
import { getStudentDocuments } from "#lib/elevdok-api/get-student-documents"
import { FEIDENAVN_SUFFIX } from "$app/env/private"

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ params, request }) {
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
    logger("error", ["Could not get student...", err.stack || err.toString()])
    throw error(500, `Kunne ikke hente elev. Feilmelding: ${err.toString()}`)
  }
}
