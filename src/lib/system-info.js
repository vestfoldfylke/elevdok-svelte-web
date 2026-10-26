import { FAGLARER_ACCESS_ENABLED, IOP_FAGLARER_ACCESS_ENABLED } from "$app/env/private"

export const getSystemInfo = () => {
  return {
    IOP_FAGLARER_ACCESS_ENABLED: IOP_FAGLARER_ACCESS_ENABLED === "true",
    FAGLARER_ACCESS_ENABLED: FAGLARER_ACCESS_ENABLED === "true"
  }
}
