import { logger } from "@vestfoldfylke/loglady"
import { MongoClient } from "mongodb"
import { MONGODB_CONNECTION_STRING } from "$app/env/private"

let client: MongoClient | null = null

/** One client for the lifetime of the process. The driver reconnects by itself, so the client must not be closed while the server runs. */
export const getMongoClient = async (): Promise<MongoClient> => {
  if (!client) {
    logger.info("MongoDB client does not exist - creating")
    client = new MongoClient(MONGODB_CONNECTION_STRING)
    await client.connect()
    logger.info("MongoDB client connected")
  }

  return client
}

/** Only for shutdown: a closed MongoClient can not be reconnected */
export const closeMongoClient = async (): Promise<void> => {
  const closingClient = client
  client = null
  await closingClient?.close()
}
