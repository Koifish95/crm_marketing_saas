import { createWriteStream, mkdirSync } from 'node:fs'
import { dirname, join, normalize, relative, resolve, sep } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { openPromise } from 'yauzl'

export async function extractFleetBackupZip(zipPath: string, destDir: string) {
  const zipfile = await openPromise(zipPath, { lazyEntries: true })
  await new Promise<void>((resolveExtract, reject) => {
    const fail = (error: Error) => {
      try {
        zipfile.close()
      } catch {
        // already closed
      }
      reject(error)
    }
    zipfile.on('error', fail)
    zipfile.on('end', () => resolveExtract())
    zipfile.on('entry', (entry) => {
      void (async () => {
        const name = entry.fileName.replaceAll('\\', '/')
        if (name.endsWith('/')) {
          zipfile.readEntry()
          return
        }
        if (name.includes('..') || name.startsWith('/') || name.includes(':')) {
          throw new Error('Backup zip contains an unsafe path.')
        }
        const destRoot = resolve(destDir)
        const target = resolve(destRoot, normalize(name))
        const rel = relative(destRoot, target)
        if (!rel || rel.startsWith('..') || rel.split(sep).includes('..')) {
          throw new Error('Backup zip contains an unsafe path.')
        }
        mkdirSync(dirname(target), { recursive: true })
        const stream = await zipfile.openReadStreamPromise(entry)
        await pipeline(stream, createWriteStream(target))
        zipfile.readEntry()
      })().catch(error => fail(error instanceof Error ? error : new Error('Could not read the backup zip.')))
    })
    zipfile.readEntry()
  })
  return destDir
}

export function extractedSqliteDir(extractDir: string) {
  return join(extractDir, 'sqlite')
}

export function extractedUploadsDir(extractDir: string) {
  return join(extractDir, 'uploads')
}
