import { error } from "@sveltejs/kit"
import { logger } from "@vtfk/logger"
import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { getUserData } from "#lib/server/elevdok-api/get-user-data.js"
import { getErrorDetails } from "#lib/server/error-details.js"
import { getSystemInfo } from "#lib/server/system-info.js"
import { MAINTENANCE_MODE } from "$app/env/private"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ request }) => {
  try {
    const user = await getAuthenticatedUser(request.headers)

    // If maintenance no need to return data
    if (MAINTENANCE_MODE === "true") {
      return {
        user,
        maintenanceMode: true
      }
    }

    const userData = await getUserData(user)
    const systemInfo = getSystemInfo()

    return {
      systemInfo,
      user,
      ...userData
    }
  } catch (err) {
    logger("error", ["Could not get data...", getErrorDetails(err)])
    throw error(500, `Could not get data... ${String(err)}`)
  }
}
