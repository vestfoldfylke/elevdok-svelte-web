import { FAGLARER_ACCESS_ENABLED, IOP_FAGLARER_ACCESS_ENABLED } from '$app/env/private'
import { version } from '../../package.json'

export const getSystemInfo = () => {
  return {
    version,
    IOP_FAGLARER_ACCESS_ENABLED: IOP_FAGLARER_ACCESS_ENABLED === 'true',
    FAGLARER_ACCESS_ENABLED: FAGLARER_ACCESS_ENABLED === 'true'
  }
}
