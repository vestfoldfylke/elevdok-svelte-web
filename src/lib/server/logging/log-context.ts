import { AsyncLocalStorage } from "node:async_hooks"
import { type LogConfig, logger } from "@vestfoldfylke/loglady"

const logContextStorage = new AsyncLocalStorage<LogConfig>()

logger.setContextProvider((): LogConfig | undefined => logContextStorage.getStore())

/** Runs the callback with its own LogConfig, so concurrent requests log with their own contextId */
export const runInLogContext = <T>(logConfig: LogConfig, callback: () => Promise<T>): Promise<T> => {
  return logContextStorage.run(logConfig, callback)
}

/** Merges values into the LogConfig of the current context */
export const updateLogContext = (logConfig: LogConfig): void => {
  const currentLogConfig = logContextStorage.getStore()
  if (currentLogConfig) {
    Object.assign(currentLogConfig, logConfig)
  }
}

export const getLogContext = (): LogConfig | undefined => {
  return logContextStorage.getStore()
}
