// ONLY SERVER SIDE

import { logger } from "@vtfk/logger"
import { FAGLARER_ACCESS_ENABLED, IOP_FAGLARER_ACCESS_ENABLED, LEDER_ROLE } from "$app/env/private"
import type { User } from "./authentication.js"
import type { TeacherStudent } from "./elevdok-api/get-user-data.js"

export type FileAccess = {
  access: boolean
  type: "leader" | "kontaktlarer" | "faglarer" | "iop" | "ingen filtilgang"
}

export const hasFileAccessForStudent = (user: User, teacherStudent: TeacherStudent, loggerPrefix: string): FileAccess => {
  logger("info", [loggerPrefix, "Checking if user has leader access"])
  if (user.activeRole === LEDER_ROLE || (user.hasAdminRole && user.impersonating && user.impersonating?.type === "leder")) {
    logger("info", [loggerPrefix, "User has leader access"])
    return { access: true, type: "leader" }
  }
  logger("info", [loggerPrefix, "Checking if teacher has contactTeacher access"])
  if (teacherStudent.skoler.some((school) => school.kontaktlarer)) {
    logger("info", [loggerPrefix, "Teacher has contactTeacher access"])
    return { access: true, type: "kontaktlarer" }
  }
  if (FAGLARER_ACCESS_ENABLED === "true") {
    logger("info", [loggerPrefix, "env.FAGLARER_ACCESS_ENABLED is true - all teachers have access"])
    return { access: true, type: "faglarer" }
  }
  if (IOP_FAGLARER_ACCESS_ENABLED === "true") {
    logger("info", [loggerPrefix, "env.IOP_FAGLARER_ACCESS_ENABLED is true - checking if teacher has IOP access"])
    if (teacherStudent.skoler.some((school) => school.iop)) {
      logger("info", [loggerPrefix, "Teacher has IOP access"])
      return { access: true, type: "iop" }
    }
  }
  return { access: false, type: "ingen filtilgang" }
}
