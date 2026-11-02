import { DEFAULT_ROLE, LEDER_ROLE } from "$app/env/private"
import type { Impersonation, User } from "./authentication.js"

/** The role whose students and access the user gets: an admin's impersonation when there is one, otherwise the active role. Null when neither is a teacher or leader. */
export const getEffectiveRole = (user: Pick<User, "activeRole" | "hasAdminRole" | "impersonating">): Impersonation["type"] | null => {
  // Impersonation only counts for admins, even if a non-admin somehow had one
  if (user.hasAdminRole && user.impersonating) {
    return user.impersonating.type
  }
  if (user.activeRole === DEFAULT_ROLE) {
    return "larer"
  }
  if (user.activeRole === LEDER_ROLE) {
    return "leder"
  }
  return null
}
