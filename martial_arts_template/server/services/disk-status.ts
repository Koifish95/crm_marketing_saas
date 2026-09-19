import { statfs } from 'node:fs/promises'
import { resolve } from 'node:path'

export const DISK_FREE_RATIO_WARN = 0.15
export const DISK_FREE_BYTES_WARN = 2 * 1024 * 1024 * 1024

export type DiskStatus = {
  path: string
  totalBytes: number
  freeBytes: number
  freeRatio: number
  warning: string | null
}

export async function readDiskStatus(path = process.cwd()): Promise<DiskStatus> {
  const target = resolve(path)
  const stats = await statfs(target)
  const totalBytes = Number(stats.blocks) * Number(stats.bsize)
  const freeBytes = Number(stats.bavail) * Number(stats.bsize)
  const freeRatio = totalBytes > 0 ? freeBytes / totalBytes : 1
  let warning: string | null = null
  if (freeRatio < DISK_FREE_RATIO_WARN) {
    warning = `Free disk is ${Math.round(freeRatio * 100)}% on ${target}.`
  } else if (freeBytes < DISK_FREE_BYTES_WARN) {
    warning = `Free disk is below 2 GB on ${target}.`
  }
  return { path: target, totalBytes, freeBytes, freeRatio, warning }
}
