import { utcNowMs } from '../../shared/utils/time'

const startedAtMs = utcNowMs()

export function isRestartEnabled() {
  return process.env.APP_RESTART_ENABLED?.trim().toLowerCase() === 'true'
}

export function restartExitCode() {
  const parsed = Number(process.env.APP_RESTART_EXIT_CODE)
  return Number.isInteger(parsed) ? parsed : 0
}

export function processUptimeSeconds() {
  return Math.max(0, Math.floor((utcNowMs() - startedAtMs) / 1000))
}

export function safeNodeEnv() {
  const value = process.env.NODE_ENV?.trim()
  if (value === 'production' || value === 'test' || value === 'development') {
    return value
  }
  return 'development'
}

export const processControl = {
  exit(code: number) {
    setTimeout(() => {
      process.exit(code)
    }, 50)
  },
}
