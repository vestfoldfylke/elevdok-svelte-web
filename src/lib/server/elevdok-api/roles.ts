import { error } from "@sveltejs/kit"
import { logger } from "@vtfk/logger"
import type { User } from "#lib/server/authentication.js"
import { getMockDb } from "#lib/server/mock-db.js"
import { closeMongoClient, getMongoClient } from "#lib/server/mongo-client.js"
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
  try {
    const mongoClient = await getMongoClient()
    const collection = mongoClient.db(MONGODB_DB_NAME).collection<UserSettings>(MONGODB_USER_SETTINGS_COLLECTION)
    const userSettings = await collection.findOne({ principalId })
    if (!userSettings) {
      return null
    }
    return userSettings.activeRole || null
  } catch (error) {
    if (String(error).startsWith("MongoTopologyClosedError")) {
      logger("warn", "Oh no, topology is closed! Closing client")
      closeMongoClient()
    }
    throw error
  }
}

export const setActiveRole = async (user: User, requestedRole: string): Promise<void> => {
  logger("info", [`${user.principalName} requested role change to role: ${requestedRole}`])
  if (!user.roles.some((role) => role.value === requestedRole)) {
    logger("warn", [`${user.principalName} does not have access to role: ${requestedRole}`])
    throw error(403, `Du har ikke rollen "${requestedRole}", så du kan ikke bytte til den.`)
  }
  logger("info", [`${user.principalName} has access to role ${requestedRole}, changing role for user`])
  if (MOCK_API === "true") {
    const mockDb = getMockDb()
    mockDb.set("activeRole", requestedRole)
    logger("info", ["MOCK-API is enabled", `${user.principalName} succesfully changed role to ${requestedRole} in mock db`])
    return
  }
  try {
    const mongoClient = await getMongoClient()
    const collection = mongoClient.db(MONGODB_DB_NAME).collection<UserSettings>(MONGODB_USER_SETTINGS_COLLECTION)
    await collection.findOneAndUpdate(
      { principalId: user.principalId },
      { $set: { principalId: user.principalId, principalName: user.principalName, activeRole: requestedRole, changedTimestamp: new Date().toISOString() } },
      { upsert: true }
    )
    logger("info", [`${user.principalName} succesfully changed role to ${requestedRole} in db`])
  } catch (error) {
    if (String(error).startsWith("MongoTopologyClosedError")) {
      logger("warn", "Oh no, topology is closed! Closing client")
      closeMongoClient()
    }
    throw error
  }
}
