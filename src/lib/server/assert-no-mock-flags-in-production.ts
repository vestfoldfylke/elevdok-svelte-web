import { MOCK_API, MOCK_AUTH, NODE_ENV } from "$app/env/private"

/** Mock flags bypass authentication and skip the access log, so the server refuses to start with them in production */
export const assertNoMockFlagsInProduction = (): void => {
  if (NODE_ENV !== "production") {
    return
  }
  const enabledMockFlags = Object.entries({ MOCK_API, MOCK_AUTH })
    .filter(([, value]) => value === "true")
    .map(([name]) => name)
  if (enabledMockFlags.length > 0) {
    throw new Error(`${enabledMockFlags.join(", ")} is "true" while NODE_ENV is "production". Mock data and mock authentication must never run in production: remove the setting from the Web App.`)
  }
}
