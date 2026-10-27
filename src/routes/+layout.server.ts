import { getAuthenticatedUser } from "#lib/server/authentication.js"
import { getUserData } from "#lib/server/elevdok-api/get-user-data.js"
import { getSystemInfo } from "#lib/server/system-info.js"
import { MAINTENANCE_MODE } from "$app/env/private"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ request }) => {
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
}
