import axios from "axios"

/** The most useful detail of a caught error for logging: the HTTP response body for axios errors, otherwise the stack */
export const getErrorDetails = (error: unknown): string => {
  if (axios.isAxiosError(error) && error.response?.data) {
    const responseBody: unknown = error.response.data
    return typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody)
  }
  if (error instanceof Error) {
    return error.stack ?? error.toString()
  }
  return String(error)
}
