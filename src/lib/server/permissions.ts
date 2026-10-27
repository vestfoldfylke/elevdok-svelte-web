import { logger } from "@vestfoldfylke/loglady"
import { FAGLARER_ACCESS_ENABLED, IOP_FAGLARER_ACCESS_ENABLED, LEDER_ROLE } from "$app/env/private"
import type { User } from "./authentication.js"
import type { TeacherStudent } from "./elevdok-api/get-user-data.js"

export type FileAccess = {
  access: boolean
  type: "leader" | "kontaktlarer" | "faglarer" | "iop" | "ingen filtilgang"
}

export const hasFileAccessForStudent = (user: User, teacherStudent: TeacherStudent): FileAccess => {
  if (user.activeRole === LEDER_ROLE || (user.hasAdminRole && user.impersonating?.type === "leder")) {
    logger.info("File access to {StudentFeidenavn}: leader", teacherStudent.feidenavn)
    return { access: true, type: "leader" }
  }
  if (teacherStudent.skoler.some((school) => school.kontaktlarer)) {
    logger.info("File access to {StudentFeidenavn}: contact teacher", teacherStudent.feidenavn)
    return { access: true, type: "kontaktlarer" }
  }
  if (FAGLARER_ACCESS_ENABLED === "true") {
    logger.info("File access to {StudentFeidenavn}: subject teacher (FAGLARER_ACCESS_ENABLED is true)", teacherStudent.feidenavn)
    return { access: true, type: "faglarer" }
  }
  if (IOP_FAGLARER_ACCESS_ENABLED === "true" && teacherStudent.skoler.some((school) => school.iop)) {
    logger.info("File access to {StudentFeidenavn}: IOP teacher (IOP_FAGLARER_ACCESS_ENABLED is true)", teacherStudent.feidenavn)
    return { access: true, type: "iop" }
  }
  logger.info("No file access to {StudentFeidenavn}", teacherStudent.feidenavn)
  return { access: false, type: "ingen filtilgang" }
}
