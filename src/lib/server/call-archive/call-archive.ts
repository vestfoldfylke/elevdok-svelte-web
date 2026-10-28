import { fetchJsonWithMsalToken } from "#lib/server/http/fetch-json-with-msal-token.js"
import { AZF_ARCHIVE_SCOPE, AZF_ARCHIVE_URL } from "$app/env/private"

type ArchiveRequest = {
  service: string
  method: string
  parameter: Record<string, unknown>
}

/** Calls a Public 360 SIF method through azf-archive */
export const callArchive = async <T>(archiveRequest: ArchiveRequest): Promise<T> => {
  return fetchJsonWithMsalToken<T>(`${AZF_ARCHIVE_URL}/Archive`, {
    scope: AZF_ARCHIVE_SCOPE,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(archiveRequest)
  })
}
