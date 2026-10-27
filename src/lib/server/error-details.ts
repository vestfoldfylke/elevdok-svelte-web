import { UpstreamRequestError } from "./http/upstream-request-error.js"

/** The most useful detail of a caught error for logging: the response body for upstream errors, otherwise the stack */
export const getErrorDetails = (error: unknown): string => {
  if (error instanceof UpstreamRequestError) {
    return `${error.message}: ${error.responseBody}`
  }
  if (error instanceof Error) {
    return error.stack ?? error.toString()
  }
  return String(error)
}
