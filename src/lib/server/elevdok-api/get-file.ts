import { error } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import type { User } from "#lib/server/authentication.js"
import { fetchAzfArchiveFile, getAzfArchiveDocuments } from "#lib/server/call-archive/azf-archive.js"
import { mockFile } from "#lib/server/call-archive/mock-data.js"
import { requireStudentAccess } from "#lib/server/guards/require-student-access.js"
import { getFileAccessForStudent } from "#lib/server/permissions.js"
import { MOCK_API, VTFK_ARCHIVE_ENABLED } from "$app/env/private"
import { createUserLogEntry } from "./user-logs.js"

/** Returns the file as base64 */
export const getFile = async (user: User, studentFeidenavn: string, sourceId: string, fileId: string): Promise<string> => {
  if (!studentFeidenavn) {
    throw new Error('Missing required parameter "studentFeidenavn"')
  }
  if (!sourceId) {
    throw new Error('Missing required parameter "sourceId"')
  }
  if (!fileId) {
    throw new Error('Missing required parameter "fileId"')
  }

  logger.info("Getting file {FileId} from source {SourceId} for student {StudentFeidenavn}", fileId, sourceId, studentFeidenavn)

  const teacherStudent = await requireStudentAccess(user, studentFeidenavn)

  // Sjekk også at bruker har tilgang til å faktisk åpne filen!! Basert på ENV-variabler
  const { hasAccess, type } = getFileAccessForStudent(user, teacherStudent)
  if (!hasAccess) {
    logger.warn("No access to files for student {StudentFeidenavn}", studentFeidenavn)
    throw error(403, "Du har ikke tilgang til å se dokumentene til denne eleven.")
  }

  const result: { base64: string | null; metadata: { title: string; documentNumber: string } | null } = {
    base64: null,
    metadata: null
  }

  if (MOCK_API === "true") {
    logger.info("MOCK_API is true, returning mock file")
    const { base64 } = mockFile
    result.base64 = base64
    result.metadata = {
      title: "Mocke-fil",
      documentNumber: "24/mock1234"
    }
  } else if (sourceId === "mainArchive") {
    // Her må vi sjekke om at filen faktisk tilhører et dokument i elevmappen
    const { documents } = await getAzfArchiveDocuments(teacherStudent.fodselsnummer, studentFeidenavn)
    const document = documents.find((archiveDocument) => Array.isArray(archiveDocument.files) && archiveDocument.files.some((file) => file.id.toString() === fileId.toString()))

    if (!document) {
      logger.warn("File {FileId} is not in any {SourceId} document for student {StudentFeidenavn}", fileId, sourceId, studentFeidenavn)
      throw error(403, "Filen hører ikke til et dokument i elevmappen, så du har ikke tilgang til den.")
    }
    logger.info("File {FileId} is in document {DocumentNumber}, fetching it", fileId, document.documentNumber)

    const { base64, metadata } = await fetchAzfArchiveFile(fileId)
    result.base64 = base64
    result.metadata = metadata
  } else if (VTFK_ARCHIVE_ENABLED === "true" && sourceId === "vtfk") {
    // implement
  }

  if (!result.base64 || !result.metadata) {
    logger.warn("No file fetched: source {SourceId} is unknown or not implemented", sourceId)
    throw error(404, `Kan ikke hente filer fra kilden "${sourceId}": kilden er ukjent eller ikke støttet ennå.`)
  }

  const logData = {
    user,
    teacherStudent,
    accessType: type,
    action: `Åpnet filen ${result.metadata.title} i dokument ${result.metadata.documentNumber}`,
    file: {
      ...result.metadata,
      sourceId,
      id: fileId
    }
  }
  await createUserLogEntry(logData)
  logger.info("Returning file {FileId} for student {StudentFeidenavn}", fileId, studentFeidenavn)

  return result.base64
}
