import { error, redirect } from "@sveltejs/kit"
import { logger } from "@vtfk/logger"
import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { setActiveRole } from "#lib/server/elevdok-api/roles.js"
import { getErrorDetails } from "#lib/server/error-details.js"
import type { Actions } from "./$types"

export const actions: Actions = {
  changeActiveRole: async (event) => {
    try {
      const requestedRole = (await event.request.formData()).get("active_role")
      if (!requestedRole || typeof requestedRole !== "string") {
        throw error(400, 'Missing required formdata "active_role')
      }
      const user = await getAuthenticatedUser(event.request.headers)
      await setActiveRole(user, requestedRole)
    } catch (err) {
      logger("error", ["Failed when changing active role for user", getErrorDetails(err)])
      throw error(500, `Failed when changing active role. Error: ${getErrorDetails(err)}`)
    }
    throw redirect(303, "/")
  }
}
