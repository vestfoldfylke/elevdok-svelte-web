import { error, redirect } from "@sveltejs/kit"
import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { setActiveRole } from "#lib/server/elevdok-api/roles.js"
import type { Actions } from "./$types"

export const actions: Actions = {
  changeActiveRole: async (event) => {
    const requestedRole = (await event.request.formData()).get("active_role")
    if (!requestedRole || typeof requestedRole !== "string") {
      throw error(400, 'Mangler rollen du vil bytte til ("active_role").')
    }
    const user = await getAuthenticatedUser(event.request.headers)
    await setActiveRole(user, requestedRole)
    throw redirect(303, "/")
  }
}
