import { defineEnvVars } from "@sveltejs/kit/env"

// Without a schema a variable is required and the server will not start without it. The code reads an unset flag as off.
const optional = { schema: (value: string | undefined) => value }

export const variables = defineEnvVars({
  NODE_ENV: optional,
  MOCK_AUTH: optional,
  MOCK_API: optional,
  MOCK_AUTH_LARER_ROLE: optional,
  MOCK_AUTH_LEDER_ROLE: optional,
  MOCK_AUTH_ADMIN_ROLE: optional,
  DEFAULT_ROLE: {},
  LEDER_ROLE: {},
  ADMIN_ROLE: {},
  APPREG_CLIENT_ID: {},
  APPREG_CLIENT_SECRET: {},
  APPREG_TENANT_ID: {},
  FEIDENAVN_SUFFIX: {},
  MONGODB_CONNECTION_STRING: {},
  MONGODB_DB_NAME: {},
  MONGODB_LOGS_COLLECTION: {},
  MONGODB_USER_SETTINGS_COLLECTION: {},
  MONGODB_USER_IMPERSONATION_COLLECTION: {},
  FINTFOLK_API_URL: {},
  FINTFOLK_API_SCOPE: {},
  AZF_ARCHIVE_URL: {},
  AZF_ARCHIVE_SCOPE: {},
  FAGLARER_ACCESS_ENABLED: optional,
  IOP_FAGLARER_ACCESS_ENABLED: optional,
  MAINTENANCE_MODE: optional,
  MAIN_SOURCE_NAME: {},
  VTFK_ARCHIVE_ENABLED: optional,
  FRONTEND_APP_ID: {}
})
