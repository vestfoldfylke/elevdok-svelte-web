import { logger } from "@vestfoldfylke/loglady"
import vtfkSchoolsInfo from "vtfk-schools-info"
import type { User } from "#lib/server/authentication.js"
import { fintSchool } from "#lib/server/fintfolk-api/school.js"
import { fintTeacher } from "#lib/server/fintfolk-api/teacher.js"
import type { FintElev, FintFag, FintSkole } from "#lib/server/fintfolk-api/types.js"
import { DEFAULT_ROLE, IOP_FAGLARER_ACCESS_ENABLED, LEDER_ROLE } from "$app/env/private"
import { getLeaderAccess } from "./leder-access.js"
import { buildStudentList, type StudentMembership } from "./student-list.js"

const allowedUndervisningsforholdDescription = [
  "Adjunkt",
  "Adjunkt m/till utd",
  "Adjunkt 1",
  "Lærer",
  "Lærer-",
  "Lektor",
  "Lektor m/till utd",
  "Lektor 1",
  "Adjunkt med tilleggsutdanning",
  "Lektor med tilleggsutdanning"
]

const getSchoolYearFromDate = (date: Date, delimiter = "/"): string => {
  // Hvis vi er etter 15 juli inneværende år, så swapper vi til current/next. Ellers bruker vi previous/current
  const year = date.getFullYear()
  const previousYear = year - 1
  const nextYear = year + 1
  const midsommar = new Date(`${year}-07-15`)
  if (date > midsommar) {
    return `${year}${delimiter}${nextYear}`
  }
  return `${previousYear}${delimiter}${year}`
}

export const getCurrentSchoolYear = (delimiter = "/"): string => {
  return getSchoolYearFromDate(new Date(), delimiter)
}

export type MiniSchool = {
  /** shortName without UT- or OPT- */
  kortkortnavn: string
  skolenummer: string
  kortnavn: string
  navn: string
}

export const repackMiniSchool = (school: FintSkole): MiniSchool => {
  if (!school.skolenummer) {
    throw new Error("Could not find schoolNumber for school in FINT!")
  }
  // Sjekker om skolen har et kortnavn, hvis ikke slår vi opp i vtfk-schools-info for å finne det basert på skolenummer
  if (!school.kortnavn) {
    const schoolsInfo = vtfkSchoolsInfo({ schoolNumber: school.skolenummer })
    if (schoolsInfo.length === 1) {
      const shortName = schoolsInfo[0]?.shortName
      if (!shortName) {
        throw new Error(`Could not find shortName for school with schoolNumber "${school.skolenummer}" in vtfk-schools-info!`)
      }
      school.kortnavn = shortName // Sett kortnavn til kortnavnet i vtfk-schools-info dersom vi fant en skole på skolenummeret
    } else {
      throw new Error(`Could not find school with schoolNumber "${school.skolenummer}" in vtfk-schools-info!`)
    }
  }
  const kortkortnavn = school.kortnavn.includes("-") ? school.kortnavn.substring(school.kortnavn.indexOf("-") + 1) : school.kortnavn
  return {
    kortkortnavn,
    skolenummer: school.skolenummer,
    kortnavn: school.kortnavn,
    navn: school.navn
  }
}

export type ElevKlasse = {
  navn: string
  systemId: string
  type: "basisgruppe" | "undervisningsgruppe"
  fag: FintFag[]
}

export type ElevSkole = MiniSchool & {
  /** is current user contactTeacher for student at this school */
  kontaktlarer: boolean
  klasser: ElevKlasse[]
  /** om brukeren har tilgang via iop-klasse */
  iop?: boolean
}

export type TeacherStudent = FintElev & {
  feidenavn: string
  skoler: ElevSkole[]
  /** feidenavn without "@fylke.no" */
  feidenavnPrefix: string
}

export type PersonData = {
  upn: string
  feidenavn: string
  ansattnummer: string
  name: string
  firstName: string
  lastName: string
}

export type LarerKlasse = {
  navn: string
  type: string
  systemId: string
  fag: string[]
  /** school full name */
  skole: string
}

export type InvalidUndervisningsforhold = {
  beskrivelse: string
  systemId: string
}

export type UserData = {
  personData: PersonData | null
  students: TeacherStudent[]
  classes: LarerKlasse[]
  invalidUndervisningsforhold: InvalidUndervisningsforhold[]
}

const logSkippedStudents = (skippedElevnummer: string[]): void => {
  if (skippedElevnummer.length > 0) {
    logger.warn("Skipping {StudentCount} students without feidenavn: {@Elevnummer}", skippedElevnummer.length, skippedElevnummer)
  }
}

export const getUserData = async (user: User, maskSsn = true): Promise<UserData> => {
  const userData: UserData = {
    personData: null,
    invalidUndervisningsforhold: [],
    students: [],
    classes: []
  }

  // If regular teacher or administrator impersonating teacher
  if (user.activeRole === DEFAULT_ROLE || (user.hasAdminRole && user.impersonating?.type === "larer")) {
    const teacherUpn = user.hasAdminRole && user.impersonating?.type === "larer" ? user.impersonating.target : user.principalName
    logger.info("Getting teacher {TeacherUpn} from FINT", teacherUpn)
    const teacher = await fintTeacher(teacherUpn)
    if (!teacher) {
      return userData
    }

    userData.personData = {
      upn: teacher.upn,
      feidenavn: teacher.feidenavn,
      ansattnummer: teacher.ansattnummer,
      name: teacher.navn,
      firstName: teacher.fornavn,
      lastName: teacher.etternavn
    }

    const validUndervisningsforhold = teacher.undervisningsforhold.filter((forhold) => forhold.aktiv && allowedUndervisningsforholdDescription.includes(forhold.beskrivelse))
    const invalidUndervisningsforhold = teacher.undervisningsforhold.filter((forhold) => forhold.aktiv && !allowedUndervisningsforholdDescription.includes(forhold.beskrivelse))
    if (invalidUndervisningsforhold.length > 0) {
      for (const invalid of invalidUndervisningsforhold) {
        let hasElever = false
        if (invalid.basisgrupper.some((gruppe) => Array.isArray(gruppe.elever) && gruppe.elever.length > 0)) {
          hasElever = true
        }
        if (invalid.kontaktlarergrupper.some((gruppe) => Array.isArray(gruppe.elever) && gruppe.elever.length > 0)) {
          hasElever = true
        }
        if (invalid.undervisningsgrupper.some((gruppe) => Array.isArray(gruppe.elever) && gruppe.elever.length > 0)) {
          hasElever = true
        }
        if (hasElever) {
          logger.warn(
            "Teacher has undervisningsforhold {UndervisningsforholdSystemId} with description {Beskrivelse}, which does not give access to its students",
            invalid.systemId,
            invalid.beskrivelse
          )
          userData.invalidUndervisningsforhold.push({ beskrivelse: invalid.beskrivelse, systemId: invalid.systemId })
        }
      }
    }

    // A teacher can have the same undervisningsgruppe in several undervisningsforhold, buildStudentList adds each class once
    const memberships: StudentMembership[] = validUndervisningsforhold.flatMap((undervisningsforhold) => {
      const school = repackMiniSchool(undervisningsforhold.skole)
      const basisgruppeMemberships = undervisningsforhold.basisgrupper
        .filter((gruppe) => gruppe.aktiv)
        .flatMap((basisgruppe) => {
          const klasse: ElevKlasse = { navn: basisgruppe.navn, type: "basisgruppe", systemId: basisgruppe.systemId, fag: [] }
          return basisgruppe.elever.map((elev) => ({ elev, school, klasse }))
        })
      const undervisningsgruppeMemberships = undervisningsforhold.undervisningsgrupper
        .filter((gruppe) => gruppe.aktiv)
        .flatMap((undervisningsgruppe) => {
          const klasse: ElevKlasse = { navn: undervisningsgruppe.navn, type: "undervisningsgruppe", systemId: undervisningsgruppe.systemId, fag: undervisningsgruppe.fag }
          return undervisningsgruppe.elever.map((elev) => ({ elev, school, klasse }))
        })
      return [...basisgruppeMemberships, ...undervisningsgruppeMemberships]
    })
    const { students, skippedElevnummer } = buildStudentList(memberships, { maskSsn, isIopEnabled: IOP_FAGLARER_ACCESS_ENABLED === "true" })
    logSkippedStudents(skippedElevnummer)
    userData.students = students
  }

  // TODO - finn ut av leder rådgiver
  // If leder / rådgiver or administrator impersonating teacher
  if (user.activeRole === LEDER_ROLE || (user.hasAdminRole && user.impersonating?.type === "leder")) {
    const leaderId = user.hasAdminRole && user.impersonating?.type === "leder" ? user.impersonating.target : user.principalId

    logger.info("Getting school access for leader {LeaderId}", leaderId)
    // Sjekker først om vi har schoolaccess for brukeren i cachen
    const leaderAccess = await getLeaderAccess(user)

    const memberships: StudentMembership[] = []
    for (const schoolAccess of leaderAccess) {
      logger.info("Getting school {SchoolName} ({SchoolNumber}) from FINT", schoolAccess.schoolName, schoolAccess.schoolNumber)
      const school = await fintSchool(schoolAccess.schoolNumber)
      if (!school) {
        logger.warn("School {SchoolName} ({SchoolNumber}) does not exist in FINT, skipping it", schoolAccess.schoolName, schoolAccess.schoolNumber)
        continue
      }

      // If no shortname, try to find it in vtfk-schools-info
      if (school.skolenummer && !school.kortnavn) {
        const schoolsInfo = vtfkSchoolsInfo({ schoolNumber: school.skolenummer })
        if (schoolsInfo.length === 1) {
          const shortName = schoolsInfo[0]?.shortName
          if (!shortName) {
            throw new Error(`Could not find shortName for school with schoolNumber "${school.skolenummer}" in vtfk-schools-info!`)
          }
          school.kortnavn = shortName // Sett kortnavn til kortnavnet i vtfk-schools-info dersom vi fant en skole på skolenummeret
        } else {
          logger.info('School {SchoolNumber} is not in vtfk-schools-info, using the organisation short name or "SKOLE"', school.skolenummer)
          school.kortnavn = school.organisasjon?.kortnavn || "SKOLE" // Sett kortnavn til SKOLE dersom vi ikke finner noe annet
        }
      }

      const miniSchool = repackMiniSchool(school)

      // All students at the school, then the basisgrupper they are in
      memberships.push(...school.elever.map((elev) => ({ elev, school: miniSchool, klasse: null })))
      for (const basisgruppe of school.basisgrupper.filter((gruppe) => gruppe.aktiv)) {
        const klasse: ElevKlasse = { navn: basisgruppe.navn, type: "basisgruppe", systemId: basisgruppe.systemId, fag: [] }
        memberships.push(...basisgruppe.elever.map((elev) => ({ elev, school: miniSchool, klasse })))
      }
    }
    // IOP gives subject teachers access, leaders have access to all students at their schools anyway
    const { students, skippedElevnummer } = buildStudentList(memberships, { maskSsn, isIopEnabled: false })
    logSkippedStudents(skippedElevnummer)
    userData.students = students

    return userData
  }

  return userData
}
