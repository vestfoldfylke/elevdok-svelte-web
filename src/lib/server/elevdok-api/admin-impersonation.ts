import { error } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import type { InsertOneResult } from "mongodb"
import type { Impersonation, User } from "#lib/server/authentication.js"
import { requireAdminRole } from "#lib/server/guards/require-admin-role.js"
import { getInternalCache } from "#lib/server/internal-cache.js"
import { getMongoClient } from "#lib/server/mongo-client.js"
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
  requireAdminRole(user)
  const internalCache = getInternalCache()
  const impersonation = internalCache.get<Impersonation>(`${user.principalId}-impersonation`)
  return impersonation || null
}

export const setAdminImpersonation = async (user: User, target: string, type: Impersonation["type"]): Promise<InsertOneResult<ImpersonationLogEntry> | undefined> => {
  requireAdminRole(user)
  if (!target.endsWith(`@${FEIDENAVN_SUFFIX}`) && !isGuid(target)) {
    throw error(400, `Brukeren du vil logge inn som må ende på @${FEIDENAVN_SUFFIX} eller være en guid.`)
  }
  const internalCache = getInternalCache()
  internalCache.set(`${user.principalId}-impersonation`, { target, type })
  // warn, not info: impersonation is legitimate, but should be easy to spot
  logger.warn("Admin is impersonating {ImpersonationTarget} as {ImpersonationType}, saving an impersonation log entry", target, type)
  if (MOCK_API === "true") {
    return
  }
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
}

export const deleteAdminImpersonation = (user: User): void => {
  requireAdminRole(user)
  const internalCache = getInternalCache()
  internalCache.delete(`${user.principalId}-impersonation`)
}
