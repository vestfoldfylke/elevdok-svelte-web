export type ApiResult<T> = { ok: true; value: T } | { ok: false; message: string }

type ApiRequestOptions = {
  method?: "GET" | "POST" | "DELETE"
  body?: unknown
}

const readErrorMessage = async (response: Response): Promise<string> => {
  const fallbackMessage = `Forespørselen feilet med status ${response.status}. Prøv igjen, eller kontakt support om det fortsetter.`
  try {
    const errorBody: unknown = await response.json()
    if (typeof errorBody === "object" && errorBody !== null && "message" in errorBody && typeof errorBody.message === "string") {
      return errorBody.message
    }
    return fallbackMessage
  } catch {
    return fallbackMessage
  }
}

/** Calls the app's own API. Failures are returned, not thrown, with a message that is safe to show the user. */
export const requestApi = async <T>(path: string, { method = "GET", body }: ApiRequestOptions = {}): Promise<ApiResult<T>> => {
  let response: Response
  try {
    response = await fetch(path, body === undefined ? { method } : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  } catch {
    return { ok: false, message: "Fikk ikke kontakt med serveren. Sjekk nettverket og prøv igjen." }
  }

  if (!response.ok) {
    return { ok: false, message: await readErrorMessage(response) }
  }
  return { ok: true, value: (await response.json()) as T }
}
