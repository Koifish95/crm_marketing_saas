import { addCalendarDays, BUSINESS_TIMEZONE, denverParts, denverWallToUtc, denverYmd } from './time'
import type { AppEnv } from '@crm/core/shared/utils/app-env'

export const BACKUP_RETENTION_DAYS = 14
export const BACKUP_SCHEDULE_HOUR = 2
export const BACKUP_SCHEDULE_MINUTE = 0
export const BACKUP_SCHEDULE_TIMEZONE = BUSINESS_TIMEZONE
export const DEFAULT_HOST_BACKUP_DIR = 'data/backups'
export const HOST_BACKUP_STATUS_FILE = 'status.json'

export function backupStamp(nowMs: number) {
  const parts = denverParts(nowMs)
  const hh = String(parts.hour).padStart(2, '0')
  const mm = String(parts.minute).padStart(2, '0')
  const offset = denverUtcOffsetLabel(nowMs)
  return `${parts.ymd}T${hh}${mm}00${offset}`
}

export function hostBackupEnvName(appEnv: AppEnv) {
  return appEnv
}

export function scheduledBackupMinuteOfDay(hour = BACKUP_SCHEDULE_HOUR, minute = BACKUP_SCHEDULE_MINUTE) {
  return hour * 60 + minute
}

export function nextScheduledBackupMs(
  nowMs: number,
  hour = BACKUP_SCHEDULE_HOUR,
  minute = BACKUP_SCHEDULE_MINUTE,
) {
  const today = denverYmd(nowMs)
  const todayRun = denverWallToUtc(today, scheduledBackupMinuteOfDay(hour, minute)).getTime()
  if (nowMs < todayRun) {
    return todayRun
  }
  return denverWallToUtc(addCalendarDays(today, 1), scheduledBackupMinuteOfDay(hour, minute)).getTime()
}

function denverUtcOffsetLabel(nowMs: number) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date(nowMs))
  const raw = formatted.find(part => part.type === 'timeZoneName')?.value || 'GMT-6'
  const match = raw.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
  if (!match) {
    return '-0600'
  }
  const sign = match[1] === '+' ? '+' : '-'
  const hours = String(match[2]).padStart(2, '0')
  const minutes = String(match[3] || '00').padStart(2, '0')
  return `${sign}${hours}${minutes}`
}
