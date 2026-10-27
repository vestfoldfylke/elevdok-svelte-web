import { logger } from "@vestfoldfylke/loglady"
import vtfkSchoolsInfo from "vtfk-schools-info"
import { DEFAULT_ROLE, FEIDENAVN_SUFFIX, LEDER_ROLE, MOCK_API, MOCK_AUTH, MOCK_AUTH_LARER_ROLE, MOCK_AUTH_LEDER_ROLE } from "$app/env/private"
import { fetchJsonWithMsalToken } from "./http/fetch-json-with-msal-token.js"
import { getInternalCache } from "./internal-cache.js"

// Only the fields this app reads from Microsoft Graph

type AppRole = {
  id: string
  allowedMemberTypes: string[]
  isEnabled: boolean
  value: string
}

type Application = {
  appRoles: AppRole[]
}

type GroupMember = {
  id: string
  displayName: string
  userPrincipalName: string
}

type AppRoleAssignment = {
  id: string
  appRoleId: string
  principalDisplayName: string
  principalId: string
  principalType: string
}

type GraphPage<T> = {
  value: T[]
  "@odata.nextLink"?: string
}

type ApplicationUser = AppRoleAssignment & {
  appRoleValue: string
}

export type LeaderUser = ApplicationUser & {
  /** upn */
  principalName: string
  schoolNumber: string
  schoolName: string
  schoolShortName: string | null
}

const graphScope = "https://graph.microsoft.com/.default"
const graphUrl = "https://graph.microsoft.com/v1.0"

const fetchAllGraphPages = async <T>(firstPageUrl: string): Promise<T[]> => {
  const items: T[] = []
  let pageUrl: string | undefined = firstPageUrl
  while (pageUrl) {
    // Graph requires ConsistencyLevel for $count queries
    const page: GraphPage<T> = await fetchJsonWithMsalToken<GraphPage<T>>(pageUrl, { scope: graphScope, headers: { ConsistencyLevel: "eventual" } })
    items.push(...page.value)
    pageUrl = page["@odata.nextLink"]
    // The next page is fetched with our Graph token, so it must never point anywhere else
    if (pageUrl && !pageUrl.startsWith(`${graphUrl}/`)) {
      throw new Error(`Graph returned an @odata.nextLink outside ${graphUrl} (${pageUrl}). Refusing to send the Graph token there.`)
    }
  }
  return items
}

const getApplicationRoles = async (appId: string): Promise<Application> => {
  return fetchJsonWithMsalToken<Application>(`${graphUrl}/applications(appId='${appId}')?$select=appId,displayName,appRoles`, { scope: graphScope })
}

const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
  // OBS OBS trenger groupMember.read.all
  return fetchAllGraphPages<GroupMember>(`${graphUrl}/groups/${groupId}/members?$select=id,displayName,userPrincipalName&$top=999&$count=true`)
}

const getAppRoleAssignments = async (appId: string): Promise<AppRoleAssignment[]> => {
  return fetchAllGraphPages<AppRoleAssignment>(
    `${graphUrl}/servicePrincipals(appId='${appId}')/appRoleAssignedTo?$select=id,appRoleId,principalDisplayName,principalId,principalType&$top=999&$count=true`
  )
}

export const getApplicationUsers = async (appId: string): Promise<ApplicationUser[]> => {
  if (MOCK_API === "true") {
    logger.info("MOCK_API is true, returning mock users")
    const mockUsers = [
      {
        appRoleValue: LEDER_ROLE,
        appRoleId: "mockleder",
        id: "mockId1",
        principalDisplayName: "Mock Leder 1",
        principalId: "mockPrincipalId1",
        principalType: "User"
      },
      {
        appRoleValue: LEDER_ROLE,
        appRoleId: "mockleder",
        id: "mockId2",
        principalDisplayName: "Mock Leder 2",
        principalId: "mockPrincipalId2",
        principalType: "User"
      },
      {
        appRoleValue: LEDER_ROLE,
        appRoleId: "mockleder",
        id: "mockId3",
        principalDisplayName: "Mock Leder 3",
        principalId: "mockPrincipalId3",
        principalType: "User"
      },
      {
        appRoleValue: DEFAULT_ROLE,
        appRoleId: "mocklarer",
        id: "mockId4",
        principalDisplayName: "Mock Lærer 1",
        principalId: "mockPrincipalId4",
        principalType: "User"
      }
    ]
    // Legg til MOCK auth sin bruker med de rollene den har satt i env
    if (MOCK_AUTH === "true") {
      if (MOCK_AUTH_LARER_ROLE === "true") {
        mockUsers.push({
          appRoleValue: DEFAULT_ROLE,
          appRoleId: "mocklarer",
          id: "mockId6",
          principalDisplayName: "Demo Spøkelse",
          principalId: "12345-4378493-fjdiofjd",
          principalType: "User"
        })
      }
      if (MOCK_AUTH_LEDER_ROLE === "true") {
        mockUsers.push({
          appRoleValue: LEDER_ROLE,
          appRoleId: "mockleder",
          id: "mockId7",
          principalDisplayName: "Demo Spøkelse",
          principalId: "12345-4378493-fjdiofjd",
          principalType: "User"
        })
      }
    }

    return mockUsers
  }

  const allAppRoles = await getApplicationRoles(appId)
  const relevantAppRoles = allAppRoles.appRoles.filter((appRole) => appRole.isEnabled && appRole.allowedMemberTypes.includes("User"))

  const allAppRoleAssignments = await getAppRoleAssignments(appId)
  const relevantAppRoleAssignments = allAppRoleAssignments.filter((appRoleAssignment) => relevantAppRoles.some((role) => role.id === appRoleAssignment.appRoleId))

  const userAssignments = relevantAppRoleAssignments.filter((appRoleAssignment) => appRoleAssignment.principalType === "User")
  const groupAssignments = relevantAppRoleAssignments.filter((appRoleAssignment) => appRoleAssignment.principalType === "Group")
  logger.info("App {AppId} has {UserCount} user and {GroupCount} group assignments", appId, userAssignments.length, groupAssignments.length)

  for (const groupAssignment of groupAssignments) {
    const groupMembers = await getGroupMembers(groupAssignment.principalId)
    for (const groupMember of groupMembers) {
      if (!userAssignments.some((user) => user.principalId === groupMember.id && user.appRoleId === groupAssignment.appRoleId)) {
        userAssignments.push({
          appRoleId: groupAssignment.appRoleId,
          id: groupAssignment.id,
          principalDisplayName: groupMember.displayName,
          principalId: groupMember.id,
          principalType: "User"
        })
      }
    }
  }

  const users = userAssignments.map((userAssignment) => {
    const appRole = relevantAppRoles.find((role) => role.id === userAssignment.appRoleId)
    if (!appRole) {
      throw new Error(`App role ${userAssignment.appRoleId} for ${userAssignment.principalDisplayName} is not among the enabled user app roles of app ${appId}`)
    }
    return { ...userAssignment, appRoleValue: appRole.value }
  })

  // Legg til MOCK auth sin bruker med de rollene den har satt i env om vi har MOCK_AUTH lik true
  if (MOCK_AUTH === "true") {
    if (MOCK_AUTH_LARER_ROLE === "true") {
      users.push({
        appRoleValue: DEFAULT_ROLE,
        appRoleId: "mocklarer",
        id: "mockId6",
        principalDisplayName: "Demo Spøkelse",
        principalId: "12345-4378493-fjdiofjd",
        principalType: "User"
      })
    }
    if (MOCK_AUTH_LEDER_ROLE === "true") {
      users.push({
        appRoleValue: LEDER_ROLE,
        appRoleId: "mockleder",
        id: "mockId7",
        principalDisplayName: "Demo Spøkelse",
        principalId: "12345-4378493-fjdiofjd",
        principalType: "User"
      })
    }
  }

  return users
}

export const getAllLeaderUsers = async (appId: string): Promise<LeaderUser[]> => {
  /*
  Ledere kommer fra egne tilgangsgrupper per skole, der gruppen er satt til å få leder-rolle i enterprise-appen. Ny skole => ny gruppe med leder-rolle.
  Skolen hentes fra gruppas navn, og vi kan slenge på skolenummer og navn på skolen fra vtfk-schools info. Merk at gruppas navn må matche et eller annet i vtfk-schools - tipper kortnavn
  Vi kan expande appRoleAssignment med upn siden alle brukerne ligger i en gruppe, og vi må hente de fra gruppa
  */
  const cacheKey = "all-leader-users"
  const internalCache = getInternalCache()
  const cachedData = internalCache.get<LeaderUser[]>(cacheKey)
  if (cachedData) {
    logger.info("Found leader users in cache")
    return cachedData
  }

  if (MOCK_API === "true") {
    logger.info("MOCK_API is true, returning mock users")
    const mockUsers: LeaderUser[] = [
      {
        appRoleValue: LEDER_ROLE,
        appRoleId: "mockleder",
        id: "mockId1",
        principalDisplayName: "Mock Leder 1",
        principalId: "mockPrincipalId1",
        principalName: `mockPrincipal1@${FEIDENAVN_SUFFIX}`,
        principalType: "User",
        schoolNumber: "12345",
        schoolName: "Mock Skole 1",
        schoolShortName: "MS1"
      },
      {
        appRoleValue: LEDER_ROLE,
        appRoleId: "mockleder",
        id: "mockId2",
        principalDisplayName: "Mock Leder 2",
        principalId: "mockPrincipalId2",
        principalName: `mockPrincipal2@${FEIDENAVN_SUFFIX}`,
        principalType: "User",
        schoolNumber: "23456",
        schoolName: "Mock Skole 2",
        schoolShortName: "MS2"
      },
      {
        appRoleValue: LEDER_ROLE,
        appRoleId: "mockleder",
        id: "mockId3",
        principalDisplayName: "Mock Leder 3",
        principalId: "mockPrincipalId3",
        principalName: `mockPrincipal3@${FEIDENAVN_SUFFIX}`,
        principalType: "User",
        schoolNumber: "34567",
        schoolName: "Mock Skole 3",
        schoolShortName: "MS3"
      }
    ]
    // Legg til MOCK auth sin bruker med de rollene den har satt i env
    if (MOCK_AUTH === "true") {
      if (MOCK_AUTH_LEDER_ROLE === "true") {
        mockUsers.push({
          appRoleValue: LEDER_ROLE,
          appRoleId: "mockleder",
          id: "mockId7",
          principalDisplayName: "Demo Spøkelse",
          principalId: "12345-4378493-fjdiofjd",
          principalName: `demo.spokelse@${FEIDENAVN_SUFFIX}`,
          principalType: "User",
          schoolNumber: "12345",
          schoolName: "Mordor vidergående skole",
          schoolShortName: "MRD"
        })
      }
    }

    internalCache.set(cacheKey, mockUsers)

    return mockUsers
  }

  const allAppRoles = await getApplicationRoles(appId)
  const relevantAppRoles = allAppRoles.appRoles.filter((appRole) => appRole.isEnabled && appRole.allowedMemberTypes.includes("User"))

  const allAppRoleAssignments = await getAppRoleAssignments(appId)

  const leaderAppRole = relevantAppRoles.find((role) => role.value === LEDER_ROLE)
  if (!leaderAppRole) {
    throw new Error(`App ${appId} has no enabled user app role with value LEDER_ROLE (${LEDER_ROLE}). Check the app roles of the app registration and the LEDER_ROLE setting.`)
  }

  const leaderGroupAssignments = allAppRoleAssignments.filter((appRoleAssignment) => appRoleAssignment.principalType === "Group" && appRoleAssignment.appRoleId === leaderAppRole.id)
  logger.info("App {AppId} has {GroupCount} leader groups", appId, leaderGroupAssignments.length)

  const leaderUsers: LeaderUser[] = []

  for (const groupAssignment of leaderGroupAssignments) {
    const allSchools = vtfkSchoolsInfo().map((school) => {
      return { schoolNumber: school.schoolNumber, fullname: school.fullName, shortName: school.shortName }
    })

    const groupNameParts = groupAssignment.principalDisplayName.split("-")
    const groupSchoolShortName = groupNameParts.at(-1)?.trim()

    const school = allSchools.find((school) => school.shortName === groupSchoolShortName)
    if (!school) {
      logger.warn("Group {GroupName} does not end with a known school short name, skipping it", groupAssignment.principalDisplayName)
      continue
    }

    const groupMembers = await getGroupMembers(groupAssignment.principalId)
    for (const groupMember of groupMembers) {
      if (!leaderUsers.some((user) => user.principalId === groupMember.id && user.schoolNumber === school.schoolNumber)) {
        leaderUsers.push({
          appRoleId: groupAssignment.appRoleId,
          appRoleValue: leaderAppRole.value,
          id: groupAssignment.id,
          principalDisplayName: groupMember.displayName,
          principalId: groupMember.id,
          principalType: "User",
          principalName: groupMember.userPrincipalName,
          schoolNumber: school.schoolNumber,
          schoolName: school.fullname,
          schoolShortName: school.shortName
        })
      }
    }
  }

  logger.info("Found {LeaderUserCount} leader users", leaderUsers.length)

  // Legg til MOCK auth sin bruker med de rollene den har satt i env om vi har MOCK_AUTH lik true
  if (MOCK_AUTH === "true") {
    if (MOCK_AUTH_LEDER_ROLE === "true") {
      leaderUsers.push({
        appRoleValue: LEDER_ROLE,
        appRoleId: "mockleder",
        id: "mockId7",
        principalDisplayName: "Demo Spøkelse",
        principalId: "12345-4378493-fjdiofjd",
        principalType: "User",
        principalName: `demo.spokelse@${FEIDENAVN_SUFFIX}`,
        schoolNumber: "12345",
        schoolName: "Mordor vidergående skole",
        schoolShortName: "MRD"
      })
    }
  }

  internalCache.set(cacheKey, leaderUsers)

  return leaderUsers
}
