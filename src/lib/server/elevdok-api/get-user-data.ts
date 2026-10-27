import { logger } from "@vestfoldfylke/loglady"
import vtfkSchoolsInfo from "vtfk-schools-info"
import type { User } from "#lib/server/authentication.js"
import { fintSchool } from "#lib/server/fintfolk-api/school.js"
import { fintTeacher } from "#lib/server/fintfolk-api/teacher.js"
import type { FintElev, FintFag, FintGruppeElev, FintSkole } from "#lib/server/fintfolk-api/types.js"
import { DEFAULT_ROLE, IOP_FAGLARER_ACCESS_ENABLED, LEDER_ROLE } from "$app/env/private"
import { getLeaderAccess } from "./leder-access.js"

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
  /** is current user contactTeacher for student at this school */
  kontaktlarer: boolean
}

export const repackMiniSchool = (school: FintSkole, kontaktlarer: boolean | undefined): MiniSchool => {
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
    navn: school.navn,
    kontaktlarer: kontaktlarer || false
  }
}

const getIOPSchools = (teacherStudent: { skoler: ElevSkole[] }): ElevSkole[] => {
  const IOPCourseIds = ["IOP1000", "IOP2000", "IOP3000", "IOP4000", "IOP5000"]
  if (!teacherStudent) {
    throw new Error('Missing required parameter "teacherStudent"')
  }
  if (!Array.isArray(teacherStudent.skoler)) {
    throw new Error('Missing "skoler" array from teacherStudent')
  }
  if (!teacherStudent.skoler.every((school) => Array.isArray(school.klasser) && school.klasser.every((group) => Array.isArray(group.fag)))) {
    throw new Error('Either missing "klasser" array from skole, or missing "fag" array from klasse')
  }
  // Getting IOPSchools in case of future requirement where teachers can only see documents for specific schools
  const IOPSchools = teacherStudent.skoler.filter((school) => school.klasser.some((group) => group.fag.some((course) => IOPCourseIds.includes(course.systemId?.identifikatorverdi))))
  return IOPSchools
}

export type ElevKlasse = {
  navn: string
  systemId: string
  type: "basisgruppe" | "undervisningsgruppe"
  fag: FintFag[]
}

export type ElevSkole = MiniSchool & {
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

/** A student while it is being assembled from FINT groups, before feidenavnPrefix is added */
type StudentDraft = FintGruppeElev & {
  skoler: ElevSkole[]
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

    // Kontaktlærer flyttes fra rett på eleven til skolearrayet på eleven - sett om læreren er kontaktlærer for eleven på gitt skole
    const students: StudentDraft[] = []
    for (const undervisningsforhold of validUndervisningsforhold) {
      for (const basisgruppe of undervisningsforhold.basisgrupper.filter((gruppe) => gruppe.aktiv)) {
        for (const elev of basisgruppe.elever) {
          // I tilfelle eleven er med i flere basisgrupper
          const existingStudent = students.find((student) => student.elevnummer === elev.elevnummer)
          if (existingStudent) {
            const existingSchoolOnStudent = existingStudent.skoler.find((school) => school.skolenummer === undervisningsforhold.skole.skolenummer)
            if (!existingSchoolOnStudent) {
              // Ikke registrert lærerforholdet på eleven ved denne skolen enda, legger til i lista
              existingStudent.skoler.push({
                ...repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer),
                klasser: [{ navn: basisgruppe.navn, type: "basisgruppe", systemId: basisgruppe.systemId, fag: [] }]
              })
            } else {
              // Skolen allerede lagt inn, legger inn klassen på skolen (om den ikke er der allerede)
              if (!existingSchoolOnStudent.klasser.some((group) => group.systemId === basisgruppe.systemId)) {
                existingSchoolOnStudent.klasser.push({ navn: basisgruppe.navn, type: "basisgruppe", systemId: basisgruppe.systemId, fag: [] })
              }
            }
            if (existingSchoolOnStudent && !existingSchoolOnStudent.kontaktlarer && elev.kontaktlarer) {
              // Sjekker om er kontaktlærer på ekisterende skole (som ikke var funnet fra før av, for sikkerhets skyld)
              existingSchoolOnStudent.kontaktlarer = true
            }
          } else {
            // Ikke lagt inn eleven i students enda
            students.push({
              ...elev,
              skoler: [{ ...repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer), klasser: [{ navn: basisgruppe.navn, type: "basisgruppe", systemId: basisgruppe.systemId, fag: [] }] }]
            })
          }
        }
      }
      for (const undervisningsgruppe of undervisningsforhold.undervisningsgrupper.filter((gruppe) => gruppe.aktiv)) {
        // Note to self - læreren kan ha flere undervisningsforhold med de samme undervisningsgruppene.. Lollert, lar det være inntil videre
        for (const elev of undervisningsgruppe.elever) {
          const existingStudent = students.find((student) => student.elevnummer === elev.elevnummer)
          if (existingStudent) {
            const existingSchoolOnStudent = existingStudent.skoler.find((school) => school.skolenummer === undervisningsforhold.skole.skolenummer)
            if (!existingSchoolOnStudent) {
              // Ikke registrert lærerforholdet på eleven ved denne skolen enda, legger til i lista
              existingStudent.skoler.push({
                ...repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer),
                klasser: [{ navn: undervisningsgruppe.navn, type: "undervisningsgruppe", systemId: undervisningsgruppe.systemId, fag: undervisningsgruppe.fag }]
              })
            } else {
              // Skolen allerede lagt inn, legger inn klassen på skolen (om den ikke er der allerede)
              if (!existingSchoolOnStudent.klasser.some((group) => group.systemId === undervisningsgruppe.systemId)) {
                existingSchoolOnStudent.klasser.push({ navn: undervisningsgruppe.navn, type: "undervisningsgruppe", systemId: undervisningsgruppe.systemId, fag: undervisningsgruppe.fag })
              }
            }
            if (existingSchoolOnStudent && !existingSchoolOnStudent.kontaktlarer && elev.kontaktlarer) {
              // Sjekker om er kontaktlærer på ekisterende skole (som ikke var funnet fra før av, for sikkerhets skyld)
              existingSchoolOnStudent.kontaktlarer = true
            }
          } else {
            // Ikke lagt inn eleven i students enda
            students.push({
              ...elev,
              skoler: [
                {
                  ...repackMiniSchool(undervisningsforhold.skole, elev.kontaktlarer),
                  klasser: [{ navn: undervisningsgruppe.navn, type: "undervisningsgruppe", systemId: undervisningsgruppe.systemId, fag: undervisningsgruppe.fag }]
                }
              ]
            })
          }
        }
      }
    }
    // Filtrer vekk elever uten feidenavn - fåkke brukt de (enda hvertfall)
    const studentsWithoutFeidenavn = students.filter((stud) => !stud.feidenavn)
    if (studentsWithoutFeidenavn.length > 0) {
      logger.warn(
        "Skipping {StudentCount} students without feidenavn: {@Elevnummer}",
        studentsWithoutFeidenavn.length,
        studentsWithoutFeidenavn.map((stud) => stud.elevnummer)
      )
    }
    const studentsWithFeidenavn = students.filter((stud): stud is StudentDraft & { feidenavn: string } => Boolean(stud.feidenavn))

    // Fjern kontaktlærer-property rett på eleven (den ligger på skoler i stedet), og sleng på kort-feidenavn på alle elever, sleng på IOP-access rett på skole-info om det IOP er skrudd på i ENV
    const teacherStudents: TeacherStudent[] = studentsWithFeidenavn.map((stud) => {
      if (maskSsn) {
        stud.fodselsnummer = `${stud.fodselsnummer.substring(0, 6)}*****`
      }
      delete stud.kontaktlarer
      // IOP special access
      if (IOP_FAGLARER_ACCESS_ENABLED === "true") {
        const iopSchools = getIOPSchools(stud)
        stud.skoler = stud.skoler.map((school) => {
          return {
            ...school,
            iop: iopSchools.some((IOPschool) => IOPschool.skolenummer === school.skolenummer)
          }
        })
      }
      return {
        ...stud,
        feidenavnPrefix: stud.feidenavn.substring(0, stud.feidenavn.indexOf("@"))
      }
    })
    // Sorter elevene alfabetisk
    teacherStudents.sort((a, b) => (a.navn > b.navn ? 1 : b.navn > a.navn ? -1 : 0))

    userData.students = teacherStudents
  }

  // TODO - finn ut av leder rådgiver
  // If leder / rådgiver or administrator impersonating teacher
  if (user.activeRole === LEDER_ROLE || (user.hasAdminRole && user.impersonating?.type === "leder")) {
    const leaderId = user.hasAdminRole && user.impersonating?.type === "leder" ? user.impersonating.target : user.principalId

    logger.info("Getting school access for leader {LeaderId}", leaderId)
    // Sjekker først om vi har schoolaccess for brukeren i cachen
    const leaderAccess = await getLeaderAccess(user)

    const students: StudentDraft[] = []
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

      const miniSchool = repackMiniSchool(school, false)

      // Dytt inn alle elevene på skolen
      for (const student of school.elever) {
        const existingStudent = students.find((stud) => stud.elevnummer === student.elevnummer)
        if (existingStudent) {
          if (!existingStudent.skoler.some((skole) => skole.skolenummer === school.skolenummer)) {
            existingStudent.skoler.push({ ...miniSchool, klasser: [] })
          }
        } else {
          students.push({ ...student, skoler: [{ ...miniSchool, klasser: [] }] })
        }
      }
      // Dytt inn alle elever fra basisgruppene (og basisgruppene på eleven)
      for (const basisgruppe of school.basisgrupper.filter((gruppe) => gruppe.aktiv)) {
        // classes.push({ navn: basisgruppe.navn, type: 'basisgruppe', systemId: basisgruppe.systemId, fag: ['Basisgruppe'], skole: miniSchool.navn })
        for (const elev of basisgruppe.elever) {
          // Vi bør ha eleven allerede, men sjekker for sikkerhets skyld
          const existingStudent = students.find((student) => student.elevnummer === elev.elevnummer)
          if (existingStudent) {
            const existingSchoolOnStudent = existingStudent.skoler.find((school) => school.skolenummer === miniSchool.skolenummer)
            if (!existingSchoolOnStudent) {
              // Ikke registrert skoletilgangen enda, legger til
              existingStudent.skoler.push({ ...miniSchool, klasser: [{ navn: basisgruppe.navn, type: "basisgruppe", systemId: basisgruppe.systemId, fag: [] }] })
            } else {
              // Skolen allerede lagt inn, legger inn klassen på skolen (om den ikke er der allerede)
              if (!existingSchoolOnStudent.klasser.some((group) => group.systemId === basisgruppe.systemId)) {
                existingSchoolOnStudent.klasser.push({ navn: basisgruppe.navn, type: "basisgruppe", systemId: basisgruppe.systemId, fag: [] })
              }
            }
            if (existingSchoolOnStudent && !existingSchoolOnStudent.kontaktlarer && elev.kontaktlarer) {
              // Sjekker om er kontaktlærer på ekisterende skole (som ikke var funnet fra før av, for sikkerhets skyld)
              existingSchoolOnStudent.kontaktlarer = true
            }
          } else {
            // Ikke lagt inn eleven i students enda
            students.push({ ...elev, skoler: [{ ...miniSchool, klasser: [{ navn: basisgruppe.navn, type: "basisgruppe", systemId: basisgruppe.systemId, fag: [] }] }] })
          }
        }
      }
    }
    // Filtrer vekk elever uten feidenavn - fåkke brukt de (enda hvertfall)
    const studentsWithoutFeidenavn = students.filter((stud) => !stud.feidenavn)
    if (studentsWithoutFeidenavn.length > 0) {
      logger.warn("Skipping {StudentCount} students without feidenavn", studentsWithoutFeidenavn.length)
    }
    const studentsWithFeidenavn = students.filter((stud): stud is StudentDraft & { feidenavn: string } => Boolean(stud.feidenavn))

    // Fjern kontaktlærer-property rett på eleven (den ligger på skoler i stedet), og sleng på kort-feidenavn på alle elever, sleng på IOP-access rett på skole-info om det IOP er skrudd på i ENV
    const teacherStudents: TeacherStudent[] = studentsWithFeidenavn.map((stud) => {
      if (maskSsn) {
        stud.fodselsnummer = `${stud.fodselsnummer.substring(0, 6)}*****`
      }
      delete stud.kontaktlarer

      return {
        ...stud,
        feidenavnPrefix: stud.feidenavn.substring(0, stud.feidenavn.indexOf("@"))
      }
    })
    // Sorter elevene alfabetisk
    teacherStudents.sort((a, b) => (a.navn > b.navn ? 1 : b.navn > a.navn ? -1 : 0))

    userData.students = teacherStudents

    return userData
  }

  return userData
}
