import { logger } from "@vtfk/logger"
import { getErrorDetails } from "#lib/server/error-details.js"
import { getInternalCache } from "#lib/server/internal-cache.js"
import { MAIN_SOURCE_NAME } from "$app/env/private"
import { callArchive } from "./call-archive.js"
import type { ArchiveDocument, ArchiveDocumentsResult, P360Case, P360Document, P360FileWithData } from "./types.js"

export const repackP360Document = (document: P360Document, feidenavn: string, source: string, sourceName: string): ArchiveDocument => {
  if (!document || !feidenavn || !source || !sourceName) {
    throw new Error('Missing required parameter "document" "feidenavn", "source", or "sourceName')
  }

  // First verify that the document has Contacts and Files as array
  if (!Array.isArray(document.Contacts)) {
    document.Contacts = []
  }
  if (!Array.isArray(document.Files)) {
    document.Files = []
  }
  const repacked = {
    title: document.Title,
    feidenavn,
    source,
    sourceName,
    documentNumber: document.DocumentNumber,
    documentDate: document.DocumentDate || document.JournalDate || "Ukjent dato",
    responsibleEnterprise: document.ResponsibleEnterpriseName || "Ukjent ansvarlig virksomhet",
    category: document.Category.Description || "Ukjent kategori",
    documentArchive: document.DocumentArchive.Description || "Ukjent dokumentarkiv",
    accessCode: document.AccessCodeDescription || "Ukjent tilgangskode",
    contacts: document.Contacts.map((contact) => {
      return {
        name: contact.SearchName || "Ukjent",
        role: contact.Role
      }
    }),
    files: document.Files.map((file) => {
      return {
        id: file.Recno,
        title: file.Title.endsWith(file.Format.toLowerCase()) ? file.Title : `${file.Title}.${file.Format.toLowerCase()}`,
        relation: file.RelationTypeDescription,
        format: file.Format,
        isAvailable: file.Format.toLowerCase() === "pdf"
      }
    })
  }

  return repacked
}

export const getAzfArchiveDocuments = async (ssn: string, feidenavn: string, loggerPrefix: string): Promise<ArchiveDocumentsResult> => {
  if (!ssn || !feidenavn || !loggerPrefix) {
    throw new Error('Missing required parameter "ssn" or "loggerPrefix"')
  }
  // Hent først saksnr for elevmappe(r), deretter dokumentene i elevmappe(ne)
  const result: ArchiveDocumentsResult = {
    documents: [],
    errors: []
  }

  // Check cache for response and return if found
  const internalCache = getInternalCache()
  const cacheKey = `azf-archive-documents-${feidenavn}`
  const cachedResult = internalCache.get<ArchiveDocumentsResult>(cacheKey)
  if (cachedResult) {
    logger("info", [loggerPrefix, "Found documents in cache quick returning"])
    result.documents = cachedResult.documents
    result.errors = cachedResult.errors
    return result
  }

  const caseNumbers: string[] = []

  try {
    const elevmappeRequest = {
      service: "CaseService",
      method: "GetCases",
      parameter: {
        Title: "Elevmappe",
        CaseType: "Elev",
        ContactReferenceNumber: ssn
      }
    }
    const allCases = await callArchive<P360Case[]>(elevmappeRequest)

    const allowedCaseStatuses = ["Under behandling", "Avsluttet"]
    const allowedAccessGroups = ["VFK Robot", "TFK Robot"]
    logger("info", [loggerPrefix, `Filtering ${allCases.length} cases to where Status is one of`, JSON.stringify(allowedCaseStatuses)])
    const cases = allCases.filter((archiveCase) => {
      const allowedStatus = allowedCaseStatuses.includes(archiveCase.Status)
      const allowedAccessGroup = allowedAccessGroups.includes(archiveCase.AccessGroup)
      return allowedStatus && allowedAccessGroup
    })

    if (cases.length > 1) {
      logger("info", [loggerPrefix, `Found several (${cases.length}) elevmapper`])
    }
    if (cases.length === 0) {
      logger("warn", [loggerPrefix, `No elevmappe found for ${feidenavn}`])
      result.errors.push("Fant ingen elevmappe i Public 360")
      return result
    }
    if (cases.length === 1) {
      logger("info", [loggerPrefix, `Found elevmappe. CaseNumber: ${cases[0]?.CaseNumber}`])
    }
    for (const archiveCase of cases) {
      caseNumbers.push(archiveCase.CaseNumber)
    }
  } catch (error) {
    logger("info", [loggerPrefix, "Failed when fetching elevmappe", getErrorDetails(error)])
    result.errors.push("Feilet ved henting av elevmappe fra arkivet. Prøv igjen senere.")
  }
  const allowedDocumentStatuses = ["J", "F", "E", "A"]
  const archiveDocuments: P360Document[] = []
  for (const caseNumber of caseNumbers) {
    try {
      const documentsRequest = {
        service: "DocumentService",
        method: "GetDocuments",
        parameter: {
          CaseNumber: caseNumber
        }
      }
      logger("info", [loggerPrefix, `Fetching documents from CaseNumber ${caseNumber}`])
      const allCaseDocuments = await callArchive<P360Document[]>(documentsRequest)
      logger("info", [loggerPrefix, `Filtering ${allCaseDocuments.length} documents to where StatusCode is one of`, JSON.stringify(allowedDocumentStatuses)])
      const caseDocuments = allCaseDocuments.filter((doc) => allowedDocumentStatuses.includes(doc.StatusCode))
      logger("info", [loggerPrefix, `Adding ${caseDocuments.length} documents to result`])

      archiveDocuments.push(...caseDocuments)
    } catch (error) {
      logger("info", [loggerPrefix, `Failed when documents for Case: ${caseNumber}`, getErrorDetails(error)])
      result.errors.push(`Feilet ved henting av dokumenter for sak ${caseNumber}. Prøv igjen senere.`)
    }
  }
  logger("info", [loggerPrefix, `Found ${archiveDocuments.length} documents. Repacking result, caching and returning.`])
  result.documents = archiveDocuments.map((doc) => repackP360Document(doc, feidenavn, "mainArchive", MAIN_SOURCE_NAME))

  // Cache the result for 10 minutes
  internalCache.set(cacheKey, result, 600)

  return result
}

type ArchiveFileWithData = {
  base64: string
  metadata: {
    title: string
    documentNumber: string
  }
}

export const getAzfArchiveFile = async (fileId: string, loggerPrefix: string): Promise<ArchiveFileWithData> => {
  if (!fileId || !loggerPrefix) {
    throw new Error('Missing required parameter "fileId" or "loggerPrefix"')
  }

  const fileRequest = {
    service: "FileService",
    method: "GetFileWithMetadata",
    parameter: {
      Recno: fileId,
      IncludeFileData: true
    }
  }
  const file = await callArchive<P360FileWithData>(fileRequest)
  return {
    base64: file.Base64Data,
    metadata: {
      title: file.Title,
      documentNumber: file.DocumentNumber
    }
  }
}
