import { error } from "@sveltejs/kit"
import { logger } from "@vtfk/logger"
import { getAuthenticatedUser } from "#lib/authentication.js"
import { getUserData } from "#lib/elevdok-api/get-user-data.js"
import { getSystemInfo } from "#lib/system-info.js"
import { MAINTENANCE_MODE } from "$app/env/private"

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ request }) {
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
    logger("error", ["Could not get data...", err.response?.data || err.stack || err.toString()])
    throw error(500, `Could not get data... ${err.toString()}`)
  }
}
