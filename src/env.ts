import { defineEnvVars } from "@sveltejs/kit/env"
import { building } from "$app/env"

// The code reads an unset flag as off.
const optional = { schema: (value: string | undefined) => value }

// We only allow required to be missing while building, as they are all dynamic and we don't need them in ci/cd 
const required = {
  schema: (value: string | undefined): string => {
    if (value === undefined && !building) {
      throw new Error("Value is missing. Set it in the app settings or .env")
    }

    return value as string
  }
}

export const variables = defineEnvVars({
  NODE_ENV: optional,
  MOCK_AUTH: optional,
  MOCK_API: optional,
  MOCK_AUTH_LARER_ROLE: optional,
  MOCK_AUTH_LEDER_ROLE: optional,
  MOCK_AUTH_ADMIN_ROLE: optional,
  DEFAULT_ROLE: required,
  LEDER_ROLE: required,
  ADMIN_ROLE: required,
  APPREG_CLIENT_ID: required,
  APPREG_CLIENT_SECRET: required,
  APPREG_TENANT_ID: required,
  FEIDENAVN_SUFFIX: required,
  MONGODB_CONNECTION_STRING: required,
  MONGODB_DB_NAME: required,
  MONGODB_LOGS_COLLECTION: required,
  MONGODB_USER_SETTINGS_COLLECTION: required,
  MONGODB_USER_IMPERSONATION_COLLECTION: required,
  FINTFOLK_API_URL: required,
  FINTFOLK_API_SCOPE: required,
  AZF_ARCHIVE_URL: required,
  AZF_ARCHIVE_SCOPE: required,
  FAGLARER_ACCESS_ENABLED: optional,
  IOP_FAGLARER_ACCESS_ENABLED: optional,
  MAINTENANCE_MODE: optional,
  MAIN_SOURCE_NAME: required,
  VTFK_ARCHIVE_ENABLED: optional,
  FRONTEND_APP_ID: required
})
