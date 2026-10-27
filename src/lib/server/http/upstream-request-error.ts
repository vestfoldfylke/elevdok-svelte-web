const MAX_LOGGED_RESPONSE_BODY_LENGTH = 1000

/** An upstream API answered with a non-2xx status. The message includes the start of the response body, which usually says why. */
export class UpstreamRequestError extends Error {
  readonly url: string
  readonly status: number
  readonly responseBody: string

  constructor(url: string, status: number, responseBody: string) {
    super(`Request to ${url} failed with status ${status}: ${responseBody.slice(0, MAX_LOGGED_RESPONSE_BODY_LENGTH)}`)
    this.name = "UpstreamRequestError"
    this.url = url
    this.status = status
    this.responseBody = responseBody
  }
}
