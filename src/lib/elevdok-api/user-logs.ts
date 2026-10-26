import { logger } from "@vtfk/logger"
import { ObjectId } from "mongodb"
import type { Impersonation, User } from "#lib/authentication.js"
import { getMockDb } from "#lib/mock-db.js"
import { closeMongoClient, getMongoClient } from "#lib/mongo-client.js"
import { MOCK_API, MONGODB_DB_NAME, MONGODB_LOGS_COLLECTION } from "$app/env/private"
import { getCurrentSchoolYear, type TeacherStudent } from "./get-user-data.js"

type LogFile = {
  id: string
  title: string
  documentNumber: string
  sourceId: string
}

type UserLogData = {
  user: User
  teacherStudent: TeacherStudent
  accessType: string
  action: string
  file?: LogFile
}

type LogStudent = {
  name: string
  feidenavn: string
  elevnummer: string
}

type LogUser = {
  name: string
  principalId: string
  principalName: string
}

export type LogEntry = {
  timestamp: string
  user: LogUser & {
    role: string
    hasAdminRole: boolean
    impersonating: Impersonation | null
  }
  student: LogStudent
  accessType: string
  action: string
  file: LogFile | null
}

type MockLogEntry = LogEntry & {
  type: "logElement"
  _id: string
}

type LogFilter = {
  studentNumber: string | null
  userPrincipalId: string | null
  documentNumber: string | null
}

const escapeRegex = (str: string): string => {
  return str.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&")
}

export const createUserLogEntry = async (logData: UserLogData, loggerPrefix: string): Promise<{ insertedId: string | ObjectId }> => {
  const { user, teacherStudent, accessType, action, file } = logData
  if (!action) {
    throw new Error('Missing required parameter "action"')
  }
  if (!user) {
    throw new Error('Missing required parameter "user"')
  }
  if (!teacherStudent) {
    throw new Error('Missing required parameter "teacherStudent"')
  }
  if (!accessType) {
    throw new Error('Missing required parameter "accessType"')
  }
  if (!loggerPrefix) {
    throw new Error('Missing required parameter "loggerPrefix"')
  }

  if (file) {
    if (!file.id) {
      throw new Error('Missing required parameter "file.id"')
    }
    if (!file.title) {
      throw new Error('Missing required parameter "file.title"')
    }
    if (!file.documentNumber) {
      throw new Error('Missing required parameter "file.documentNumber"')
    }
    if (!file.sourceId) {
      throw new Error('Missing required parameter "file.sourceId"')
    }
  }

  logger("info", [loggerPrefix, "Creating logEntry"])
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    user: {
      principalName: user.principalName,
      principalId: user.principalId,
      name: user.name,
      role: user.activeRole,
      hasAdminRole: user.hasAdminRole,
      impersonating: user.impersonating || null
    },
    student: {
      name: teacherStudent.navn,
      feidenavn: teacherStudent.feidenavn,
      elevnummer: teacherStudent.elevnummer
    },
    accessType,
    action,
    file: file || null
  }
  if (MOCK_API === "true") {
    logger("info", [loggerPrefix, "MOCK_API is true, adding logEntry to mockDb"])
    const mockDb = getMockDb()
    const randomId = new ObjectId().toString()
    const mockLogEntry: MockLogEntry = { ...logEntry, type: "logElement", _id: randomId }
    mockDb.set(randomId, mockLogEntry)
    logger("info", [loggerPrefix, `MOCK_API is true, document successfully added to mockDb with id: ${randomId}`])
    return { insertedId: randomId }
  }
  logger("info", [loggerPrefix, "Inserting logEntry in db"])
  try {
    const mongoClient = await getMongoClient()
    const collection = mongoClient.db(MONGODB_DB_NAME).collection<LogEntry>(`${MONGODB_LOGS_COLLECTION}-${getCurrentSchoolYear("-")}`)
    const insertLogResult = await collection.insertOne(logEntry)
    logger("info", [loggerPrefix, `LogEntry successfully inserted: ${insertLogResult.insertedId}`])
    return insertLogResult
  } catch (error) {
    if (String(error).startsWith("MongoTopologyClosedError")) {
      logger("warn", "Oh no, topology is closed! Closing client")
      closeMongoClient()
    }
    throw error
  }
}

export const logStudentSearch = async (user: User, searchName: string | null): Promise<LogStudent[]> => {
  const loggerPrefix = `logStudentSearch - user: ${user.principalName} - searchName: ${searchName}`
  logger("info", [loggerPrefix, "New student search"])
  if (!user.hasAdminRole) {
    logger("warn", [loggerPrefix, "Missing required admin access to log student search"])
    throw new Error("You do not have permission to do this")
  }
  if (!searchName) {
    searchName = ""
  }
  if (MOCK_API === "true") {
    logger("info", [loggerPrefix, "MOCK_API is true, getting logs from mockDb"])
    const students: LogStudent[] = []
    const mockDb = getMockDb()
    const dbKeys = mockDb.keys()
    for (const key of dbKeys) {
      const logElement = mockDb.get<MockLogEntry | string>(key)
      if (typeof logElement !== "object" || logElement.type !== "logElement") {
        continue
      }
      if (logElement.student.name.toLowerCase().startsWith(searchName.toLowerCase())) {
        if (students.some((student) => student.elevnummer === logElement.student.elevnummer)) {
          continue
        }
        students.push(logElement.student)
      }
    }
    logger("info", [loggerPrefix, "MOCK_API is true", `Found ${students.length} students with searchName ${searchName} in mockdb - returning`])
    return students
  }
  // Get top 50 logs from mongodb
  try {
    const mongoClient = await getMongoClient()

    const collection = mongoClient.db(MONGODB_DB_NAME).collection<LogEntry>(`${MONGODB_LOGS_COLLECTION}-${getCurrentSchoolYear("-")}`)

    const escapedSearchName = escapeRegex(searchName)
    const regex = new RegExp(`^${escapedSearchName}`, "i")
    const distinctStudents = await collection
      .aggregate<{ _id: LogStudent }>([
        { $group: { _id: { elevnummer: "$student.elevnummer", name: "$student.name", feidenavn: "$student.feidenavn" } } },
        { $match: { "_id.name": { $regex: regex } } }
      ])
      .sort({ "_id.name": 1 })
      .limit(15)
      .toArray()

    logger("info", [loggerPrefix, `Found ${distinctStudents.length} students - returning`])
    return distinctStudents.map((student) => student._id)
  } catch (error) {
    if (String(error).startsWith("MongoTopologyClosedError")) {
      logger("warn", "Oh no, topology is closed! Closing client")
      closeMongoClient()
    }
    throw error
  }
}

export const logUserSearch = async (user: User, searchName: string | null): Promise<LogUser[]> => {
  const loggerPrefix = `logUserSearch - user: ${user.principalName} - searchName: ${searchName}`
  logger("info", [loggerPrefix, "New student search"])
  if (!user.hasAdminRole) {
    logger("warn", [loggerPrefix, "Missing required admin access to log user search"])
    throw new Error("You do not have permission to do this")
  }
  if (!searchName) {
    searchName = ""
  }
  if (MOCK_API === "true") {
    logger("info", [loggerPrefix, "MOCK_API is true, getting logs from mockDb"])
    const users: LogEntry["user"][] = []
    const mockDb = getMockDb()
    const dbKeys = mockDb.keys()
    for (const key of dbKeys) {
      const logElement = mockDb.get<MockLogEntry | string>(key)
      if (typeof logElement !== "object" || logElement.type !== "logElement") {
        continue
      }
      if (logElement.user.name.toLowerCase().startsWith(searchName.toLowerCase())) {
        if (users.some((user) => user.principalId === logElement.user.principalId)) {
          continue
        }
        users.push(logElement.user)
      }
    }
    logger("info", [loggerPrefix, "MOCK_API is true", `Found ${users.length} users with searchName ${searchName} in mockdb - returning`])
    return users.map((user) => {
      return { name: user.name, principalId: user.principalId, principalName: user.principalName }
    })
  }
  // Get top 50 logs from mongodb
  try {
    const mongoClient = await getMongoClient()

    const collection = mongoClient.db(MONGODB_DB_NAME).collection<LogEntry>(`${MONGODB_LOGS_COLLECTION}-${getCurrentSchoolYear("-")}`)

    const escapedSearchName = escapeRegex(searchName)
    const regex = new RegExp(`^${escapedSearchName}`, "i")
    const distinctUsers = await collection
      .aggregate<{ _id: LogUser }>([{ $group: { _id: { principalId: "$user.principalId", name: "$user.name", principalName: "$user.principalName" } } }, { $match: { "_id.name": { $regex: regex } } }])
      .sort({ "_id.name": 1 })
      .limit(15)
      .toArray()

    logger("info", [loggerPrefix, `Found ${distinctUsers.length} users - returning`])
    return distinctUsers.map((user) => user._id)
  } catch (error) {
    if (String(error).startsWith("MongoTopologyClosedError")) {
      logger("warn", "Oh no, topology is closed! Closing client")
      closeMongoClient()
    }
    throw error
  }
}

export const getUserLogs = async (user: User, filter: LogFilter): Promise<LogEntry[]> => {
  const { studentNumber, userPrincipalId, documentNumber } = filter
  const loggerPrefix = `getUserLogs - user: ${user.principalName} - filter: { elevnummer: ${studentNumber}, userPrincipalId: ${userPrincipalId}, documentNumber: ${documentNumber} }`
  if (!user.hasAdminRole) {
    logger("warn", [loggerPrefix, "Missing required admin access to get user logs"])
    throw new Error("You do not have permission to do this")
  }
  logger("info", [loggerPrefix, "Getting user logs from db"])
  if (MOCK_API === "true") {
    logger("info", [loggerPrefix, "MOCK_API is true, getting logs from mockDb"])
    let userLogs: MockLogEntry[] = []
    const mockDb = getMockDb()
    const dbKeys = mockDb.keys()
    for (const key of dbKeys) {
      const logElement = mockDb.get<MockLogEntry | string>(key)
      if (typeof logElement !== "object" || logElement.type !== "logElement") {
        continue
      }
      userLogs.push(logElement)
    }

    // then we apply filters
    if (studentNumber) {
      userLogs = userLogs.filter((log) => log.student.elevnummer === studentNumber)
    }
    if (userPrincipalId) {
      userLogs = userLogs.filter((log) => log.user.principalId === userPrincipalId)
    }
    if (documentNumber) {
      userLogs = userLogs.filter((log) => log.file && log.file.documentNumber === documentNumber)
    }

    logger("info", [loggerPrefix, "MOCK_API is true", `Found ${userLogs.length} log entries in mockdb - returning`])
    return userLogs.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
  }
  // Get logs from mongodb
  try {
    const mongoClient = await getMongoClient()
    const collection = mongoClient.db(MONGODB_DB_NAME).collection<LogEntry>(`${MONGODB_LOGS_COLLECTION}-${getCurrentSchoolYear("-")}`)
    if (!studentNumber && !userPrincipalId && !documentNumber) {
      logger("info", [loggerPrefix, "No filters applied, returning 50 most recent logs"])
      const top50 = await collection.find().sort({ _id: -1 }).limit(50).toArray() // sort({_id:-1}) returns newest first
      return top50
    }
    const query: Record<string, string> = {}
    if (studentNumber) {
      query["student.elevnummer"] = studentNumber
    }
    if (userPrincipalId) {
      query["user.principalId"] = userPrincipalId
    }
    if (documentNumber) {
      query["file.documentNumber"] = documentNumber
    }
    logger("info", [loggerPrefix, "Querying for logs with query", JSON.stringify(query)])
    const logs = await collection.find(query).sort({ _id: -1 }).toArray() // sort({_id:-1}) returns newest first
    logger("info", [loggerPrefix, `Found ${logs.length} log entries - returning`])
    return logs
  } catch (error) {
    if (String(error).startsWith("MongoTopologyClosedError")) {
      logger("warn", "Oh no, topology is closed! Closing client")
      closeMongoClient()
    }
    throw error
  }
}
