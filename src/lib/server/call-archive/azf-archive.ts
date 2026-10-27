import { logger } from "@vestfoldfylke/loglady"
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

export const getAzfArchiveDocuments = async (ssn: string, feidenavn: string): Promise<ArchiveDocumentsResult> => {
  if (!ssn || !feidenavn) {
    throw new Error('Missing required parameter "ssn" or "feidenavn"')
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
    logger.info("Found archive documents for {StudentFeidenavn} in cache", feidenavn)
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
    const cases = allCases.filter((archiveCase) => {
      const hasAllowedStatus = allowedCaseStatuses.includes(archiveCase.Status)
      const hasAllowedAccessGroup = allowedAccessGroups.includes(archiveCase.AccessGroup)
      return hasAllowedStatus && hasAllowedAccessGroup
    })

    if (cases.length === 0) {
      logger.warn("No elevmappe found for {StudentFeidenavn}", feidenavn)
      result.errors.push("Fant ingen elevmappe i Public 360")
      return result
    }

    for (const archiveCase of cases) {
      caseNumbers.push(archiveCase.CaseNumber)
    }
  } catch (error) {
    logger.errorException(error, "Failed when fetching elevmappe for {StudentFeidenavn}", feidenavn)
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
      const allCaseDocuments = await callArchive<P360Document[]>(documentsRequest)
      const caseDocuments = allCaseDocuments.filter((document) => allowedDocumentStatuses.includes(document.StatusCode))

      archiveDocuments.push(...caseDocuments)
    } catch (error) {
      logger.errorException(error, "Failed when fetching documents in case {CaseNumber}", caseNumber)
      result.errors.push(`Feilet ved henting av dokumenter for sak ${caseNumber}. Prøv igjen senere.`)
    }
  }

  logger.info("Found {DocumentCount} archive documents in {CaseCount} elevmapper for {StudentFeidenavn}", archiveDocuments.length, caseNumbers.length, feidenavn)
  result.documents = archiveDocuments.map((document) => repackP360Document(document, feidenavn, "mainArchive", MAIN_SOURCE_NAME))

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

export const fetchAzfArchiveFile = async (fileId: string): Promise<ArchiveFileWithData> => {
  if (!fileId) {
    throw new Error('Missing required parameter "fileId"')
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
