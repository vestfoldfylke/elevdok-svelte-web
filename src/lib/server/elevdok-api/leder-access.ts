import { error } from "@sveltejs/kit"
import { logger } from "@vtfk/logger"
import type { User } from "#lib/server/authentication.js"
import { requireAdminRole } from "#lib/server/guards/require-admin-role.js"
import { getInternalCache } from "#lib/server/internal-cache.js"
import { getAllLeaderUsers, type LeaderUser } from "#lib/server/microsoft-graph.js"
import { FRONTEND_APP_ID, LEDER_ROLE } from "$app/env/private"

export type SchoolAccess = {
  schoolNumber: string
  schoolName: string
  leaders: {
    principalName: string
    principalId: string
    displayName: string
  }[]
}

export const getAllLeaderAccess = async (user: User): Promise<SchoolAccess[]> => {
  const loggerPrefix = `getAllLeaderAccess - user: ${user.principalName}`
  requireAdminRole(user)
  logger("info", [loggerPrefix, "Getting all leaders access"])

  // Internal caching in getAllLeaderUsers
  const leaderUsers = await getAllLeaderUsers(FRONTEND_APP_ID)

  const schoolAccess: SchoolAccess[] = []
  for (const leaderUser of leaderUsers) {
    let existingSchool = schoolAccess.find((school) => school.schoolNumber === leaderUser.schoolNumber)
    if (!existingSchool) {
      existingSchool = { schoolNumber: leaderUser.schoolNumber, schoolName: leaderUser.schoolName, leaders: [] }
      schoolAccess.push(existingSchool)
    }
    existingSchool.leaders.push({ principalName: leaderUser.principalName, principalId: leaderUser.principalId, displayName: leaderUser.principalDisplayName })
  }
  logger("info", [loggerPrefix, `Got all leader access for ${schoolAccess.length} schools`])
  return schoolAccess
}

export const getLeaderAccess = async (user: User): Promise<LeaderUser[]> => {
  const loggerPrefix = `getLeaderAccess - user: ${user.principalName}`

  if (user.activeRole !== LEDER_ROLE && !(user.hasAdminRole && user.impersonating && user.impersonating?.type === "leder")) {
    logger("warn", [loggerPrefix, "User is not leader and not impersonating leader, no access"])
    throw error(403, "Du må være leder / rådgiver for å se dette. Bytt rolle i brukermenyen om du har flere roller.")
  }

  const leaderId = user.hasAdminRole && user.impersonating?.type === "leder" ? user.impersonating.target : user.principalName
  logger("info", [loggerPrefix, `Getting leader access for leader: ${leaderId}`])

  // Først sjekk om det er et entry i internalCache for denne lederen
  const cacheKey = `leder-access-${leaderId}`
  const internalCache = getInternalCache()
  const cachedLeaderAccess = internalCache.get<LeaderUser[]>(cacheKey)
  if (cachedLeaderAccess) {
    logger("info", [
      loggerPrefix,
      `Found leader access in cache. Got leader access to ${cachedLeaderAccess.length} schools: ${cachedLeaderAccess.map((entry) => entry.schoolName).join(", ")} returning`
    ])
    return cachedLeaderAccess
  }

  // OBS, Internal caching in getAllLeaderUsers as well - reset cache if you need newest data
  const leaderUsers = await getAllLeaderUsers(FRONTEND_APP_ID)

  const leaderAccess = leaderUsers.filter((leaderUser) => leaderUser.principalId === leaderId || leaderUser.principalName === leaderId)

  internalCache.set(cacheKey, leaderAccess)

  logger("info", [loggerPrefix, `Got leader access to ${leaderAccess.length} schools: ${leaderAccess.map((entry) => entry.schoolName).join(", ")} returning`])
  return leaderAccess
}
