import { getUserData } from "#lib/server/elevdok-api/get-user-data.js"
import { getSystemInfo } from "#lib/server/system-info.js"
import { MAINTENANCE_MODE } from "$app/env/private"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ locals }) => {
  // If maintenance no need to return data
  if (MAINTENANCE_MODE === "true") {
    return {
      user: locals.user,
      maintenanceMode: true
    }
  }

  const userData = await getUserData(locals.user)
  const systemInfo = getSystemInfo()

  return {
    systemInfo,
    user: locals.user,
    ...userData
  }
}
