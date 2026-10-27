import { error } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import type { User } from "#lib/server/authentication.js"
import { getMockDb } from "#lib/server/mock-db.js"
import { getMongoClient } from "#lib/server/mongo-client.js"
import { MOCK_API, MONGODB_DB_NAME, MONGODB_USER_SETTINGS_COLLECTION } from "$app/env/private"

type UserSettings = {
  principalId: string
  principalName: string
  activeRole: string
  changedTimestamp: string
}

export const getActiveRole = async (principalId: string): Promise<string | null> => {
  if (MOCK_API === "true") {
    const mockDb = getMockDb()
    const activeRole = mockDb.get<string>("activeRole")
    return activeRole || null
  }
  const mongoClient = await getMongoClient()
  const collection = mongoClient.db(MONGODB_DB_NAME).collection<UserSettings>(MONGODB_USER_SETTINGS_COLLECTION)
  const userSettings = await collection.findOne({ principalId })
  if (!userSettings) {
    return null
  }
  return userSettings.activeRole || null
}

export const setActiveRole = async (user: User, requestedRole: string): Promise<void> => {
  logger.info("Requested role change to {RequestedRole}", requestedRole)
  if (!user.roles.some((role) => role.value === requestedRole)) {
    logger.warn("User does not have the role {RequestedRole}", requestedRole)
    throw error(403, `Du har ikke rollen "${requestedRole}", så du kan ikke bytte til den.`)
  }
  logger.info("User has the role {RequestedRole}, changing active role", requestedRole)
  if (MOCK_API === "true") {
    const mockDb = getMockDb()
    mockDb.set("activeRole", requestedRole)
    logger.info("MOCK_API is enabled: changed active role to {RequestedRole} in mock db", requestedRole)
    return
  }
  const mongoClient = await getMongoClient()
  const collection = mongoClient.db(MONGODB_DB_NAME).collection<UserSettings>(MONGODB_USER_SETTINGS_COLLECTION)
  await collection.findOneAndUpdate(
    { principalId: user.principalId },
    { $set: { principalId: user.principalId, principalName: user.principalName, activeRole: requestedRole, changedTimestamp: new Date().toISOString() } },
    { upsert: true }
  )
  logger.info("Changed active role to {RequestedRole} in db", requestedRole)
}
