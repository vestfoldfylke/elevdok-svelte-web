// Only the fields this app reads from Public 360 (via azf-archive)

export type P360Case = {
  CaseNumber: string
  Status: string
  AccessGroup: string
}

export type P360Contact = {
  SearchName: string | null
  Role: string
}

export type P360File = {
  Recno: number
  Title: string
  Format: string
  RelationTypeDescription: string
}

export type P360Document = {
  Title: string
  DocumentNumber: string
  DocumentDate: string | null
  JournalDate: string | null
  ResponsibleEnterpriseName: string | null
  Category: {
    Description: string | null
  }
  DocumentArchive: {
    Description: string | null
  }
  AccessCodeDescription: string | null
  StatusCode: string
  Contacts?: P360Contact[] | null
  Files?: P360File[] | null
}

export type P360FileWithData = {
  Base64Data: string
  Title: string
  DocumentNumber: string
}

export type ArchiveFile = {
  id: number
  title: string
  relation: string
  format: string
  isAvailable: boolean
}

export type ArchiveDocument = {
  title: string
  feidenavn: string
  source: string
  sourceName: string
  documentNumber: string
  documentDate: string
  responsibleEnterprise: string
  category: string
  documentArchive: string
  accessCode: string
  contacts: {
    name: string
    role: string
  }[]
  files: ArchiveFile[]
}

export type ArchiveDocumentsResult = {
  documents: ArchiveDocument[]
  errors: string[]
}
