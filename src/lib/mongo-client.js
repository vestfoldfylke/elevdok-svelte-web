import { logger } from "@vtfk/logger"
import { MongoClient } from "mongodb"
import { MONGODB_CONNECTION_STRING } from "$app/env/private"

let client = null

/**
 *
 * @returns { import('mongodb').MongoClient }
 */
export const getMongoClient = async () => {
  if (!client) {
    logger("info", ["mongo-client", "Client does not exist - creating"])
    client = new MongoClient(MONGODB_CONNECTION_STRING)
    await client.connect()
    logger("info", ["mongo-client", "Client connected"])
  }
  return client
}

export const closeMongoClient = () => {
  if (client) {
    client.close()
  }
}
