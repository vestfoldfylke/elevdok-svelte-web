import type { FintGruppeElev } from "#lib/server/fintfolk-api/types.js"
import type { ElevKlasse, ElevSkole, MiniSchool, TeacherStudent } from "./get-user-data.js"

/** The user sees the student at the school, through the class when there is one */
export type StudentMembership = {
  elev: FintGruppeElev
  school: MiniSchool
  klasse: ElevKlasse | null
}

type StudentListOptions = {
  maskSsn: boolean
  isIopEnabled: boolean
}

type StudentList = {
  students: TeacherStudent[]
  /** elevnummer of the students left out because they have no feidenavn */
  skippedElevnummer: string[]
}

type StudentWithSchools = FintGruppeElev & {
  skoler: ElevSkole[]
}

const IOP_COURSE_IDS = ["IOP1000", "IOP2000", "IOP3000", "IOP4000", "IOP5000"]

/** One entry per student and school, in the order they first appear. A school is kontaktlarer when any of its memberships is. */
const groupByStudentAndSchool = (memberships: StudentMembership[]): StudentWithSchools[] => {
  const studentsByElevnummer = new Map<string, StudentWithSchools>()
  for (const { elev, school, klasse } of memberships) {
    let student = studentsByElevnummer.get(elev.elevnummer)
    if (!student) {
      student = { ...elev, skoler: [] }
      studentsByElevnummer.set(elev.elevnummer, student)
    }

    let studentSchool = student.skoler.find((existingSchool) => existingSchool.skolenummer === school.skolenummer)
    if (!studentSchool) {
      studentSchool = { ...school, kontaktlarer: false, klasser: [] }
      student.skoler.push(studentSchool)
    }

    if (klasse && !studentSchool.klasser.some((existingKlasse) => existingKlasse.systemId === klasse.systemId)) {
      studentSchool.klasser.push(klasse)
    }
    if (elev.kontaktlarer) {
      studentSchool.kontaktlarer = true
    }
  }

  return [...studentsByElevnummer.values()]
}

const hasIopCourse = (school: ElevSkole): boolean => {
  return school.klasser.some((klasse) => klasse.fag.some((fag) => IOP_COURSE_IDS.includes(fag.systemId?.identifikatorverdi)))
}

/** Groups the memberships per student and school, drops students without feidenavn, masks the ssn when asked, marks IOP schools when enabled, adds feidenavnPrefix and sorts by name */
export const buildStudentList = (memberships: StudentMembership[], { maskSsn, isIopEnabled }: StudentListOptions): StudentList => {
  const groupedStudents = groupByStudentAndSchool(memberships)
  const skippedElevnummer = groupedStudents.filter((student) => !student.feidenavn).map((student) => student.elevnummer)
  const studentsWithFeidenavn = groupedStudents.filter((student): student is StudentWithSchools & { feidenavn: string } => Boolean(student.feidenavn))

  const students: TeacherStudent[] = studentsWithFeidenavn.map((student) => {
    if (maskSsn) {
      student.fodselsnummer = `${student.fodselsnummer.substring(0, 6)}*****`
    }
    // kontaktlarer belongs to each school on the student, not to the student
    delete student.kontaktlarer
    if (isIopEnabled) {
      student.skoler = student.skoler.map((school) => ({ ...school, iop: hasIopCourse(school) }))
    }
    return {
      ...student,
      feidenavnPrefix: student.feidenavn.substring(0, student.feidenavn.indexOf("@"))
    }
  })
  students.sort((a, b) => (a.navn > b.navn ? 1 : b.navn > a.navn ? -1 : 0))

  return { students, skippedElevnummer }
}
