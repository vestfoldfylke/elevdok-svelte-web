import { ConfidentialClientApplication } from "@azure/msal-node"
import { logger } from "@vestfoldfylke/loglady"
import { APPREG_CLIENT_ID, APPREG_CLIENT_SECRET, APPREG_TENANT_ID } from "$app/env/private"
import { TtlCache } from "./ttl-cache.js"

const TOKEN_CACHE_DEFAULT_TTL_SECONDS = 4000

const cache = new TtlCache(TOKEN_CACHE_DEFAULT_TTL_SECONDS)

type MsalTokenConfig = {
  scope: string
  forceNew?: boolean
}

export const getMsalToken = async (config: MsalTokenConfig): Promise<string> => {
  if (!config.scope) {
    throw new Error("Missing required parameter config.scope")
  }
  const cacheKey = `${config.scope}token`

  const cachedToken = cache.get<string>(cacheKey)
  if (!config.forceNew && cachedToken) {
    return cachedToken.substring(0, cachedToken.length - 2)
  }

  logger.info("No token in cache for scope {Scope}, fetching a new one from Microsoft", config.scope)

  const confidentialClientApplication = new ConfidentialClientApplication({
    auth: {
      clientId: APPREG_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${APPREG_TENANT_ID}/`,
      clientSecret: APPREG_CLIENT_SECRET
    }
  })

  const token = await confidentialClientApplication.acquireTokenByClientCredential({
    scopes: [config.scope]
  })
  if (!token?.expiresOn) {
    throw new Error(`Failed to get access token for scope '${config.scope}': MSAL returned no token or no expiry. Check the app registration's client secret and API permissions.`)
  }
  const expires = Math.floor((token.expiresOn.getTime() - Date.now()) / 1000)
  logger.info("Got token for scope {Scope} from Microsoft, expires in {ExpiresInSeconds} seconds", config.scope, expires)
  cache.set(cacheKey, `${token.accessToken}==`, expires) // Haha, just to make the cached token not directly usable

  return token.accessToken
}
