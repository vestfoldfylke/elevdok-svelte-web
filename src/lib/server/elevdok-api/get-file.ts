import { error } from "@sveltejs/kit"
import { logger } from "@vtfk/logger"
import type { User } from "#lib/server/authentication.js"
import { getAzfArchiveDocuments, getAzfArchiveFile } from "#lib/server/call-archive/azf-archive.js"
import { mockFile } from "#lib/server/call-archive/mock-data.js"
import { hasFileAccessForStudent } from "#lib/server/permissions.js"
import { DEFAULT_ROLE, LEDER_ROLE, MOCK_API, VTFK_ARCHIVE_ENABLED } from "$app/env/private"
import { getUserData } from "./get-user-data.js"
import { createUserLogEntry } from "./user-logs.js"

/** Returns the file as base64 */
export const getFile = async (user: User, studentFeidenavn: string, sourceId: string, fileId: string): Promise<string> => {
  const loggerPrefix = `getFile - user: ${user.principalName} - student: ${studentFeidenavn} - sourceId: ${sourceId} - fileId: ${fileId}`
  logger("info", [loggerPrefix, "New request"])

  // Validate parameteres
  if (!studentFeidenavn) {
    logger("error", [loggerPrefix, 'Missing required parameter "studentFeidenavn'])
    throw new Error('Missing required parameter "studentFeidenavn"')
  }
  if (!sourceId) {
    logger("error", [loggerPrefix, 'Missing required parameter "sourceId'])
    throw new Error('Missing required parameter "sourceId"')
  }
  if (!fileId) {
    logger("error", [loggerPrefix, 'Missing required parameter "fileId'])
    throw new Error('Missing required parameter "fileId"')
  }

  // Check if regular teacher or administrator impersonating teacher or leder
  const canViewDocuments =
    user.activeRole === DEFAULT_ROLE || user.activeRole === LEDER_ROLE || (user.hasAdminRole && user.impersonating?.type === "larer") || (user.hasAdminRole && user.impersonating?.type === "leder")
  if (!canViewDocuments) {
    logger("warn", [loggerPrefix, "Not allowed to view documents with current role"])
    throw error(403, "Rollen din gir ikke tilgang til elevdokumenter. Bytt rolle i brukermenyen om du har flere roller.")
  }

  // Then validate access to student
  const userData = await getUserData(user, false)
  const availableStudents = userData.students
  logger("info", [loggerPrefix, "Validating access to student"])
  const teacherStudent = availableStudents.find((stud) => stud.feidenavn === studentFeidenavn)
  if (!teacherStudent) {
    logger("warn", [loggerPrefix, "No access to student, or student does not exist"])
    throw error(403, "Du har ikke tilgang til denne eleven, eller eleven finnes ikke.")
  }

  logger("info", [loggerPrefix, "Access to student validated"])

  // Sjekk også at bruker har tilgang til å faktisk åpne filen!! Basert på ENV-variabler
  logger("info", [loggerPrefix, "Validating access to files for student"])
  const { access, type } = hasFileAccessForStudent(user, teacherStudent, loggerPrefix)

  if (!access) {
    logger("warn", [loggerPrefix, "Teacher does NOT have access to files for student"])
    throw error(403, "Du har ikke tilgang til å se dokumentene til denne eleven.")
  } else {
    logger("info", [loggerPrefix, `Validated access to files for student - accessType: ${type}`])
  }

  const result: { base64: string | null; metadata: { title: string; documentNumber: string } | null } = {
    base64: null,
    metadata: null
  }
  logger("info", [loggerPrefix, `Fetching file from source ${sourceId}`])

  if (MOCK_API === "true") {
    logger("info", [loggerPrefix, "MOCK_API is true", "Returning mock file"])
    const { base64 } = mockFile
    result.base64 = base64
    result.metadata = {
      title: "Mocke-fil",
      documentNumber: "24/mock1234"
    }
  } else if (sourceId === "mainArchive") {
    // Her må vi sjekke om at filen faktisk tilhører et dokument i elevmappen
    logger("info", [loggerPrefix, "Fetching student documents from main archive to validate that fileId belongs to a document in elevmappen"])
    const { documents } = await getAzfArchiveDocuments(teacherStudent.fodselsnummer, studentFeidenavn, loggerPrefix)
    logger("info", [loggerPrefix, `Got ${documents.length} student documents from main archive, validating that fileId is in one of them`])
    const document = documents.find((doc) => Array.isArray(doc.files) && doc.files.some((file) => file.id.toString() === fileId.toString()))

    if (!document) {
      logger("warn", [loggerPrefix, `FileId ${fileId} does not exist in any of the ${sourceId} documents for student ${studentFeidenavn}`])
      throw error(403, "Filen hører ikke til et dokument i elevmappen, så du har ikke tilgang til den.")
    }
    logger("info", [loggerPrefix, `FileId ${fileId} exists in document ${document.documentNumber} for student ${studentFeidenavn} - fetching file`])

    const { base64, metadata } = await getAzfArchiveFile(fileId, loggerPrefix)
    result.base64 = base64
    result.metadata = metadata
  } else if (VTFK_ARCHIVE_ENABLED === "true" && sourceId === "vtfk") {
    // implement
  }
  if (!result.base64 || !result.metadata) {
    logger("error", [loggerPrefix, `No file fetched: sourceId ${sourceId} is unknown or not implemented`])
    throw error(404, `Kan ikke hente filer fra kilden "${sourceId}": kilden er ukjent eller ikke støttet ennå.`)
  }
  logger("info", [loggerPrefix, "Got base64file - creating logEntry"])
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
  const logEntryId = await createUserLogEntry(logData, loggerPrefix)
  logger("info", [loggerPrefix, `LogEntry with id ${logEntryId.insertedId} successfully created, returning file`])

  return result.base64
}
