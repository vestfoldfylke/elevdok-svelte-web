import { error } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import type { User } from "#lib/server/authentication.js"
import { getUserData, type TeacherStudent } from "#lib/server/elevdok-api/get-user-data.js"
import { DEFAULT_ROLE, LEDER_ROLE } from "$app/env/private"

/** Returns the student, with unmasked ssn, when the user's role can view documents and the student is one of the user's students */
export const requireStudentAccess = async (user: User, studentFeidenavn: string): Promise<TeacherStudent> => {
  const isImpersonating = user.hasAdminRole && user.impersonating !== null
  const canViewDocuments = user.activeRole === DEFAULT_ROLE || user.activeRole === LEDER_ROLE || isImpersonating
  if (!canViewDocuments) {
    logger.warn("Active role {ActiveRole} can not view documents", user.activeRole)
    throw error(403, "Rollen din gir ikke tilgang til elevdokumenter. Bytt rolle i brukermenyen om du har flere roller.")
  }

  const userData = await getUserData(user, false)
  const teacherStudent = userData.students.find((student) => student.feidenavn === studentFeidenavn)
  if (!teacherStudent) {
    logger.warn("No access to student {StudentFeidenavn}, or the student does not exist", studentFeidenavn)
    throw error(403, "Du har ikke tilgang til denne eleven, eller eleven finnes ikke.")
  }
  return teacherStudent
}
