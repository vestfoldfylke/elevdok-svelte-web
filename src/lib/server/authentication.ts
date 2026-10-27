import { error } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { ADMIN_ROLE, DEFAULT_ROLE, FEIDENAVN_SUFFIX, LEDER_ROLE, MOCK_AUTH, MOCK_AUTH_ADMIN_ROLE, MOCK_AUTH_LARER_ROLE, MOCK_AUTH_LEDER_ROLE } from "$app/env/private"
import { getAdminImpersonation } from "./elevdok-api/admin-impersonation.js"
import { getActiveRole } from "./elevdok-api/roles.js"

export type Role = {
  value: string
  roleName: string
}

export type Impersonation = {
  target: string
  type: "larer" | "leder"
}

export type User = {
  /** upn */
  principalName: string
  /** objectId */
  principalId: string
  /** guid for the app */
  audience: string
  /** displayName */
  name: string
  activeRole: string
  roles: Role[]
  hasAdminRole: boolean
  impersonating: Impersonation | null
}

type Claim = {
  typ: string
  val: string
}

/** Decoded x-ms-client-principal header from App Service authentication */
type ClientPrincipal = {
  auth_typ: string
  claims: Claim[]
  name_typ: string
  role_typ: string
}

export const getAuthenticatedUser = async (headers: Headers): Promise<User> => {
  if (MOCK_AUTH === "true") {
    logger.warn("MOCK_AUTH is true: injecting mock App Service authentication headers. This must never happen in production.")
    headers.set("x-ms-client-principal-name", `demo.spokelse@${FEIDENAVN_SUFFIX}`)
    headers.set("x-ms-client-principal-id", "12345-4378493-fjdiofjd")

    // Create mock claims with necessary values
    const mockClaims: ClientPrincipal = {
      auth_typ: "aad",
      claims: [
        {
          typ: "aud",
          val: "guid-guid"
        },
        {
          typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
          val: `demo.spokelse@${FEIDENAVN_SUFFIX}`
        },
        {
          typ: "name",
          val: "Demo Spøkelse"
        },
        {
          typ: "http://schemas.microsoft.com/identity/claims/objectidentifier",
          val: "12345-4378493-fjdiofjd"
        },
        {
          typ: "preferred_username",
          val: `demo.spokelse@${FEIDENAVN_SUFFIX}`
        }
      ],
      name_typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      role_typ: "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    }
    if (MOCK_AUTH_LARER_ROLE === "true") {
      mockClaims.claims.push({
        typ: "roles",
        val: DEFAULT_ROLE
      })
    }
    if (MOCK_AUTH_LEDER_ROLE === "true") {
      mockClaims.claims.push({
        typ: "roles",
        val: LEDER_ROLE
      })
    }
    if (MOCK_AUTH_ADMIN_ROLE === "true") {
      mockClaims.claims.push({
        typ: "roles",
        val: ADMIN_ROLE
      })
    }

    const mockClaimsBase64 = Buffer.from(JSON.stringify(mockClaims), "utf-8").toString("base64")
    headers.set("x-ms-client-principal", mockClaimsBase64)
  }

  // Get MS Auth headers (https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-user-identities)
  const principalName = headers.get("x-ms-client-principal-name")
  const principalId = headers.get("x-ms-client-principal-id")
  const encodedClaims = headers.get("x-ms-client-principal")

  if (!principalName || !principalId || !encodedClaims) {
    throw new Error("Missing x-ms-client-principal headers: the request did not pass App Service authentication. Check that authentication is enabled and requires login on the Web App.")
  }

  const decodedClaims: ClientPrincipal | null = JSON.parse(Buffer.from(encodedClaims, "base64").toString())
  if (!decodedClaims) {
    throw new Error("x-ms-client-principal decoded to null: App Service authentication sent an empty principal. Check the authentication settings on the Web App.")
  }
  const roles = decodedClaims.claims.filter((claim) => claim.typ === "roles").map((claim) => claim.val)
  const name = decodedClaims.claims.find((claim) => claim.typ === "name")?.val
  const audience = decodedClaims.claims.find((claim) => claim.typ === "aud")?.val
  if (!name || !audience) {
    throw new Error("Missing 'name' or 'aud' claim in x-ms-client-principal: App Service authentication must issue both. Check the token configuration of the app registration.")
  }

  let activeRole = ""
  const firstRole = roles[0]
  if (!firstRole) {
    throw error(403, "Du har ingen roller i ElevDok. Kontakt servicedesk om du skal ha tilgang.")
  }
  if (roles.length > 1) {
    // Check in db for activeRole for principalId (save principalName as well)
    const activeDbRole = await getActiveRole(principalId)
    if (!activeDbRole) {
      if (roles.includes(LEDER_ROLE)) {
        activeRole = LEDER_ROLE // Default to leder if user have several, and none selected in db
      } else {
        activeRole = firstRole // Else just set first role as active
      }
    } else {
      if (!roles.includes(activeDbRole)) {
        logger.warn("User {PrincipalName} has active role {ActiveDbRole} in db, but not that role in Entra ID. Using {FirstRole} instead", principalName, activeDbRole, firstRole)
        activeRole = firstRole
      } else {
        activeRole = activeDbRole
      }
    }
    // Check that activeRole is present in current roles as well. If so - set as active, if not, just set first role as
  } else {
    activeRole = firstRole
  }

  // Add displayNames to roles
  const repackedRoles = roles.map((role) => {
    let roleName = ""
    if (role === DEFAULT_ROLE) {
      roleName = "Lærer"
    }
    if (role === LEDER_ROLE) {
      roleName = "Leder / Rådgiver"
    }
    if (role === ADMIN_ROLE) {
      roleName = "Administrator"
    }
    if (!roleName) {
      throw new Error(`HEIHEI, her mangler det displayName for rollen med verdi ${role}`)
    }
    return {
      value: role,
      roleName
    }
  })

  let impersonating = null

  // Check if has admin role (for easier checks later on)
  const hasAdminRole = repackedRoles.some((role) => role.value === ADMIN_ROLE)

  // Check if hasAdmin and is impersonating
  if (hasAdminRole) {
    const impersonation = getAdminImpersonation({ principalId, hasAdminRole })
    if (impersonation) {
      impersonating = impersonation
    }
  }

  return {
    principalName,
    principalId,
    name,
    audience,
    activeRole,
    roles: repackedRoles,
    hasAdminRole,
    impersonating
  }
}
