import { error } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import type { User } from "#lib/server/authentication.js"
import { getEffectiveRole } from "#lib/server/effective-role.js"
import { requireAdminRole } from "#lib/server/guards/require-admin-role.js"
import { getInternalCache } from "#lib/server/internal-cache.js"
import { getAllLeaderUsers, type LeaderUser } from "#lib/server/microsoft-graph.js"
import { FRONTEND_APP_ID } from "$app/env/private"

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
  requireAdminRole(user)
  logger.info("Getting all leaders access")

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
  logger.info("Got all leader access for {SchoolCount} schools", schoolAccess.length)
  return schoolAccess
}

export const getLeaderAccess = async (user: User): Promise<LeaderUser[]> => {
  if (getEffectiveRole(user) !== "leder") {
    logger.warn("User is not leader and not impersonating a leader, no access")
    throw error(403, "Du må være leder / rådgiver for å se dette. Bytt rolle i brukermenyen om du har flere roller.")
  }

  const leaderId = user.hasAdminRole && user.impersonating?.type === "leder" ? user.impersonating.target : user.principalName
  logger.info("Getting leader access for leader {LeaderId}", leaderId)

  // Først sjekk om det er et entry i internalCache for denne lederen
  const cacheKey = `leder-access-${leaderId}`
  const internalCache = getInternalCache()
  const cachedLeaderAccess = internalCache.get<LeaderUser[]>(cacheKey)
  if (cachedLeaderAccess) {
    logger.info(
      "Found leader access in cache, to {SchoolCount} schools: {@SchoolNames}",
      cachedLeaderAccess.length,
      cachedLeaderAccess.map((entry) => entry.schoolName)
    )
    return cachedLeaderAccess
  }

  // OBS, Internal caching in getAllLeaderUsers as well - reset cache if you need newest data
  const leaderUsers = await getAllLeaderUsers(FRONTEND_APP_ID)

  const leaderAccess = leaderUsers.filter((leaderUser) => leaderUser.principalId === leaderId || leaderUser.principalName === leaderId)

  internalCache.set(cacheKey, leaderAccess)

  logger.info(
    "Got leader access to {SchoolCount} schools: {@SchoolNames}",
    leaderAccess.length,
    leaderAccess.map((entry) => entry.schoolName)
  )
  return leaderAccess
}
