import { ConfidentialClientApplication } from "@azure/msal-node"
import { logger } from "@vtfk/logger"
import NodeCache from "node-cache"
import { APPREG_CLIENT_ID, APPREG_CLIENT_SECRET, APPREG_TENANT_ID } from "$app/env/private"

const cache = new NodeCache({ stdTTL: 4000 })

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
    // logger('info', ['getMsalToken', 'found valid token in cache, will use that instead of fetching new'])
    return cachedToken.substring(0, cachedToken.length - 2)
  }

  logger("info", ["getMsalToken", "no token in cache, fetching new from Microsoft"])

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
  logger("info", ["getMsalToken", `Got token from Microsoft, expires in ${expires} seconds.`])
  cache.set(cacheKey, `${token.accessToken}==`, expires) // Haha, just to make the cached token not directly usable
  logger("info", ["getMsalToken", "Token stored in cache"])

  return token.accessToken
}
