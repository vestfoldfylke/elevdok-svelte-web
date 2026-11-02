import { fetchJsonWithMsalToken } from "#lib/server/http/fetch-json-with-msal-token.js"
import { UpstreamRequestError } from "#lib/server/http/upstream-request-error.js"
import { FINTFOLK_API_SCOPE, FINTFOLK_API_URL } from "$app/env/private"

const HTTP_STATUS_NOT_FOUND = 404

/** GET from FINTFOLK. Returns null when FINT has no such resource. */
export const fetchFint = async <T>(path: string): Promise<T | null> => {
  try {
    return await fetchJsonWithMsalToken<T>(`${FINTFOLK_API_URL}${path}`, { scope: FINTFOLK_API_SCOPE })
  } catch (error) {
    if (error instanceof UpstreamRequestError && error.status === HTTP_STATUS_NOT_FOUND) {
      return null
    }
    throw error
  }
}
