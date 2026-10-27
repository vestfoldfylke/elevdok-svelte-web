import { getMsalToken } from "#lib/server/msal-token.js"
import { fetchJson } from "./fetch-json.js"

type MsalRequestInit = RequestInit & {
  scope: string
}

export const fetchJsonWithMsalToken = async <T>(url: string, { scope, ...init }: MsalRequestInit): Promise<T> => {
  const accessToken = await getMsalToken({ scope })
  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${accessToken}`)
  return fetchJson<T>(url, { ...init, headers })
}
