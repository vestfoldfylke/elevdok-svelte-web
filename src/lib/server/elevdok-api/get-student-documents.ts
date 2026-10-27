import { logger } from "@vestfoldfylke/loglady"
import type { User } from "#lib/server/authentication.js"
import { getAzfArchiveDocuments } from "#lib/server/call-archive/azf-archive.js"
import { getMockDocuments } from "#lib/server/call-archive/mock-data.js"
import type { ArchiveDocument, ArchiveDocumentsResult, ArchiveFile } from "#lib/server/call-archive/types.js"
import { requireStudentAccess } from "#lib/server/guards/require-student-access.js"
import { getFileAccessForStudent } from "#lib/server/permissions.js"
import { MOCK_API } from "$app/env/private"
import { createUserLogEntry } from "./user-logs.js"

export type StudentDocument = ArchiveDocument & {
  files: (ArchiveFile & { canView: boolean })[]
}

export type StudentDocumentsResult = {
  documents: StudentDocument[]
  errors: string[]
}

export const getStudentDocuments = async (user: User, studentFeidenavn: string): Promise<StudentDocumentsResult> => {
  if (!studentFeidenavn) {
    throw new Error('Missing required parameter "studentFeidenavn"')
  }

  logger.info("Getting documents for student {StudentFeidenavn}", studentFeidenavn)

  const teacherStudent = await requireStudentAccess(user, studentFeidenavn)

  const result: ArchiveDocumentsResult = {
    documents: [],
    errors: []
  }

  if (MOCK_API === "true") {
    logger.info("MOCK_API is true, returning mock documents")
    const documents = getMockDocuments(teacherStudent, 300)
    result.documents.push(...documents)
    result.errors.push("Bare en mocke-feil for å se hvordan det ser ut")
  } else {
    // XFYLKE (mainArchive)
    try {
      const { documents, errors } = await getAzfArchiveDocuments(teacherStudent.fodselsnummer, studentFeidenavn)
      result.documents.push(...documents)
      result.errors.push(...errors)
    } catch (error) {
      logger.errorException(error, "Failed when fetching documents for student {StudentFeidenavn} from main archive", studentFeidenavn)
    }

    // VTFK
    // To be implemented
  }

  const { hasAccess, type } = getFileAccessForStudent(user, teacherStudent)
  const documents: StudentDocument[] = result.documents.map((document) => {
    return {
      ...document,
      files: document.files.map((file) => {
        return {
          ...file,
          canView: hasAccess
        }
      })
    }
  })

  // Sort documents - newest first
  documents.sort((a, b) => {
    return new Date(b.documentDate).getTime() - new Date(a.documentDate).getTime()
  })

  const logData = {
    user,
    teacherStudent,
    accessType: type,
    action: "Åpnet oversikten over elevens dokumenter"
  }
  await createUserLogEntry(logData)
  logger.info("Returning {DocumentCount} documents for student {StudentFeidenavn}", documents.length, studentFeidenavn)

  return { documents, errors: result.errors }
}
