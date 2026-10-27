/** An upstream API answered with a non-2xx status */
export class UpstreamRequestError extends Error {
  readonly url: string
  readonly status: number
  readonly responseBody: string

  constructor(url: string, status: number, responseBody: string) {
    super(`Request to ${url} failed with status ${status}`)
    this.name = "UpstreamRequestError"
    this.url = url
    this.status = status
    this.responseBody = responseBody
  }
}
