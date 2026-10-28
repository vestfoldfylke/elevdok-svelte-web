// Only the fields this app reads from the FINT API responses

export type FintElev = {
  navn: string
  fornavn: string
  etternavn: string
  feidenavn: string | null
  elevnummer: string
  fodselsnummer: string
}

export type FintGruppeElev = FintElev & {
  kontaktlarer?: boolean
}

export type FintFag = {
  systemId: {
    identifikatorverdi: string
  }
}

export type FintSkole = {
  navn: string
  skolenummer: string
  kortnavn?: string | null
}

export type FintBasisgruppe = {
  navn: string
  systemId: string
  aktiv: boolean
  elever: FintGruppeElev[]
}

export type FintUndervisningsgruppe = FintBasisgruppe & {
  fag: FintFag[]
}

export type FintKontaktlarergruppe = {
  systemId: string
  elever?: FintGruppeElev[]
}

export type FintUndervisningsforhold = {
  systemId: string
  beskrivelse: string
  aktiv: boolean
  skole: FintSkole
  basisgrupper: FintBasisgruppe[]
  kontaktlarergrupper: FintKontaktlarergruppe[]
  undervisningsgrupper: FintUndervisningsgruppe[]
}

export type FintTeacher = {
  upn: string
  feidenavn: string
  ansattnummer: string
  navn: string
  fornavn: string
  etternavn: string
  undervisningsforhold: FintUndervisningsforhold[]
}

export type FintSchool = FintSkole & {
  organisasjon?: {
    kortnavn: string | null
  }
  elever: FintElev[]
  basisgrupper: FintBasisgruppe[]
}
