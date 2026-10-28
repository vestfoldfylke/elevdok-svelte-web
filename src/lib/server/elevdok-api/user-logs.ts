import { logger } from "@vestfoldfylke/loglady"
import { ObjectId } from "mongodb"
import type { Impersonation, User } from "#lib/server/authentication.js"
import { requireAdminRole } from "#lib/server/guards/require-admin-role.js"
import { getMockDb } from "#lib/server/mock-db.js"
import { getMongoClient } from "#lib/server/mongo-client.js"
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

export type LogStudent = {
  name: string
  feidenavn: string
  elevnummer: string
}

export type LogUser = {
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

export const createUserLogEntry = async (logData: UserLogData): Promise<{ insertedId: string | ObjectId }> => {
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
    const mockDb = getMockDb()
    const randomId = new ObjectId().toString()
    const mockLogEntry: MockLogEntry = { ...logEntry, type: "logElement", _id: randomId }
    mockDb.set(randomId, mockLogEntry)
    logger.debug("MOCK_API is true: added log entry {LogEntryId} to mock db", randomId)
    return { insertedId: randomId }
  }

  const mongoClient = await getMongoClient()
  const collection = mongoClient.db(MONGODB_DB_NAME).collection<LogEntry>(`${MONGODB_LOGS_COLLECTION}-${getCurrentSchoolYear("-")}`)
  const insertLogResult = await collection.insertOne(logEntry)
  logger.info("Added log entry {LogEntryId}", insertLogResult.insertedId.toString())
  return insertLogResult
}

export const searchLoggedStudents = async (user: User, searchName: string | null): Promise<LogStudent[]> => {
  requireAdminRole(user)
  if (!searchName) {
    searchName = ""
  }

  if (MOCK_API === "true") {
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

    logger.debug("MOCK_API is true: found {StudentCount} students in mock db", students.length)
    return students
  }

  // Get top 50 logs from mongodb
  const mongoClient = await getMongoClient()
  const collection = mongoClient.db(MONGODB_DB_NAME).collection<LogEntry>(`${MONGODB_LOGS_COLLECTION}-${getCurrentSchoolYear("-")}`)

  const escapedSearchName = escapeRegex(searchName)
  const regex = new RegExp(`^${escapedSearchName}`, "i")
  const distinctStudents = await collection
    .aggregate<{ _id: LogStudent }>([{ $group: { _id: { elevnummer: "$student.elevnummer", name: "$student.name", feidenavn: "$student.feidenavn" } } }, { $match: { "_id.name": { $regex: regex } } }])
    .sort({ "_id.name": 1 })
    .limit(15)
    .toArray()

  logger.info("Found {StudentCount} log students matching {SearchName}", distinctStudents.length, searchName)
  return distinctStudents.map((student) => student._id)
}

export const searchLoggedUsers = async (user: User, searchName: string | null): Promise<LogUser[]> => {
  requireAdminRole(user)
  if (!searchName) {
    searchName = ""
  }

  if (MOCK_API === "true") {
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

    logger.debug("MOCK_API is true: found {UserCount} users in mock db", users.length)
    return users.map((user) => {
      return { name: user.name, principalId: user.principalId, principalName: user.principalName }
    })
  }

  // Get top 50 logs from mongodb
  const mongoClient = await getMongoClient()
  const collection = mongoClient.db(MONGODB_DB_NAME).collection<LogEntry>(`${MONGODB_LOGS_COLLECTION}-${getCurrentSchoolYear("-")}`)

  const escapedSearchName = escapeRegex(searchName)
  const regex = new RegExp(`^${escapedSearchName}`, "i")
  const distinctUsers = await collection
    .aggregate<{ _id: LogUser }>([{ $group: { _id: { principalId: "$user.principalId", name: "$user.name", principalName: "$user.principalName" } } }, { $match: { "_id.name": { $regex: regex } } }])
    .sort({ "_id.name": 1 })
    .limit(15)
    .toArray()

  logger.info("Found {UserCount} log users matching {SearchName}", distinctUsers.length, searchName)
  return distinctUsers.map((user) => user._id)
}

export const getUserLogs = async (user: User, filter: LogFilter): Promise<LogEntry[]> => {
  const { studentNumber, userPrincipalId, documentNumber } = filter
  requireAdminRole(user)
  logger.info("Getting user logs with filter {@Filter}", filter)

  if (MOCK_API === "true") {
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

    logger.debug("MOCK_API is true: found {LogEntryCount} log entries in mock db", userLogs.length)
    return userLogs.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
  }

  // Get logs from mongodb
  const mongoClient = await getMongoClient()
  const collection = mongoClient.db(MONGODB_DB_NAME).collection<LogEntry>(`${MONGODB_LOGS_COLLECTION}-${getCurrentSchoolYear("-")}`)

  if (!studentNumber && !userPrincipalId && !documentNumber) {
    logger.info("No filters applied, returning the 50 most recent log entries")
    const latestLogEntries = await collection.find().sort({ _id: -1 }).limit(50).toArray() // sort({_id:-1}) returns newest first
    return latestLogEntries
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

  const logs = await collection.find(query).sort({ _id: -1 }).toArray() // sort({_id:-1}) returns newest first
  logger.info("Found {LogEntryCount} log entries", logs.length)
  return logs
}
