import { logger } from "@vtfk/logger"
import type { User } from "#lib/authentication.js"
import { getInternalCache } from "#lib/internal-cache.js"
import { getAllLeaderUsers, type LeaderUser } from "#lib/microsoft-graph.js"
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
  if (!user.hasAdminRole) {
    logger("warn", [loggerPrefix, "User does not have admin role, no access"])
    throw new Error("Du har ikke tilgang på denne funksjonen")
  }
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
    throw new Error("Du har ikke riktig rolle for å gjøre dette")
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
