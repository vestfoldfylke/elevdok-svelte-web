import { UpstreamRequestError } from "./upstream-request-error.js"

const UPSTREAM_TIMEOUT_MILLISECONDS = 60_000

/** Throws UpstreamRequestError for non-2xx responses. The body is cast to T, not validated. */
export const fetchJson = async <T>(url: string, init: RequestInit = {}): Promise<T> => {
  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MILLISECONDS), ...init })
  } catch (error) {
    throw new Error(`Request to ${url} got no response: ${String(error)}`, { cause: error })
  }

  if (!response.ok) {
    throw new UpstreamRequestError(url, response.status, await response.text())
  }

  return (await response.json()) as T
}
