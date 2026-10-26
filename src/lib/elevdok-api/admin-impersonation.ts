import { logger } from "@vtfk/logger"
import type { InsertOneResult } from "mongodb"
import type { Impersonation, User } from "#lib/authentication.js"
import { getInternalCache } from "#lib/internal-cache.js"
import { closeMongoClient, getMongoClient } from "#lib/mongo-client.js"
import { FEIDENAVN_SUFFIX, MOCK_API, MONGODB_DB_NAME, MONGODB_USER_IMPERSONATION_COLLECTION } from "$app/env/private"

type ImpersonationLogEntry = {
  timestamp: string
  user: {
    principalName: string
    principalId: string
  }
  impersonationTarget: string
  impersonationRole: Impersonation["type"]
}

const isGuid = (value: string) => {
  return String(value).match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/)
}

export const getAdminImpersonation = (user: Pick<User, "principalId" | "hasAdminRole">): Impersonation | null => {
  if (!user.hasAdminRole) {
    throw new Error("You do not have permission to do this")
  }
  const internalCache = getInternalCache()
  const impersonation = internalCache.get<Impersonation>(`${user.principalId}-impersonation`)
  return impersonation || null
}

export const setAdminImpersonation = async (user: User, target: string, type: Impersonation["type"]): Promise<InsertOneResult<ImpersonationLogEntry> | undefined> => {
  if (!user.hasAdminRole) {
    throw new Error("You do not have permission to do this")
  }
  if (typeof target !== "string") {
    throw new Error("target må værra string")
  }
  if (!target.endsWith(`@${FEIDENAVN_SUFFIX}`) && !isGuid(target)) {
    throw new Error(`Target må ende på @${FEIDENAVN_SUFFIX} eller værra en guid`)
  }
  if (!["larer", "leder"].includes(type)) {
    throw new Error('type må værra "larer" eller "leder"')
  }
  const internalCache = getInternalCache()
  internalCache.set(`${user.principalId}-impersonation`, { target, type })
  logger("warn", [
    `Admin user ${user.principalName} is impersonating user ${target} (type: ${type})`,
    `${user.principalName} probably need to do this, but logging for extra safety.`,
    "Saving impersonation-logEntry to db as well"
  ])
  if (MOCK_API === "true") {
    return
  }
  try {
    const mongoClient = await getMongoClient()
    const collection = mongoClient.db(MONGODB_DB_NAME).collection<ImpersonationLogEntry>(MONGODB_USER_IMPERSONATION_COLLECTION)
    const logEntry: ImpersonationLogEntry = {
      timestamp: new Date().toISOString(),
      user: {
        principalName: user.principalName,
        principalId: user.principalId
      },
      impersonationTarget: target,
      impersonationRole: type
    }
    const insertLogResult = await collection.insertOne(logEntry)
    return insertLogResult
  } catch (error) {
    if (String(error).startsWith("MongoTopologyClosedError")) {
      logger("warn", "Oh no, topology is closed! Closing client")
      closeMongoClient()
    }
    throw error
  }
}

export const deleteAdminImpersonation = (user: User): void => {
  if (!user.hasAdminRole) {
    throw new Error("You do not have permission to do this")
  }
  const internalCache = getInternalCache()
  internalCache.delete(`${user.principalId}-impersonation`)
}
