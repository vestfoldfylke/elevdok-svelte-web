import { error } from "@sveltejs/kit"
import type { User } from "#lib/server/authentication.js"

export const requireAdminRole = (user: Pick<User, "hasAdminRole">): void => {
  if (!user.hasAdminRole) {
    throw error(403, "Du må ha administratorrollen for å bruke denne funksjonen.")
  }
}
