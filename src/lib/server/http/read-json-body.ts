import { error } from "@sveltejs/kit"

/** The request body as a JSON object. Answers 400 for invalid JSON or anything that is not an object, so callers only check their own fields. */
export const readJsonBody = async (request: Request): Promise<Record<string, unknown>> => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw error(400, "Forespørselen må ha en gyldig JSON-body.")
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw error(400, "Forespørselen må ha et JSON-objekt som body.")
  }
  return body as Record<string, unknown>
}
