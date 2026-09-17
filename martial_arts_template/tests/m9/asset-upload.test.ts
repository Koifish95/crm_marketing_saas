import { describe, expect, it } from 'vitest'
import {
  assetUploadAllSucceeded,
  assetUploadHasRetryable,
  assetUploadProgressLabel,
  assetUploadSubmitLabel,
  assetUploadSummaryText,
  createAssetUploadItems,
  displayNameFromFilename,
  runAssetUploadBatch,
  type AssetUploadCreated,
  type AssetUploadFileInput,
  type AssetUploadItem,
} from '../../shared/utils/asset-upload'

function fakeFile(name: string, contents = 'bytes') {
  return new File([contents], name, { type: 'image/jpeg' })
}

describe('asset upload batch helper', () => {
  it('derives display names from the filename without the final extension', () => {
    expect(displayNameFromFilename('photo-1.jpg')).toBe('photo-1')
    expect(displayNameFromFilename('video-1.mp4')).toBe('video-1')
    expect(displayNameFromFilename('archive')).toBe('archive')
  })

  it('continues after an ordinary per-file failure and keeps successes', async () => {
    const items = createAssetUploadItems([
      fakeFile('photo-1.jpg'),
      fakeFile('photo-2.jpg'),
      fakeFile('photo-3.jpg'),
    ])
    const attempted: string[] = []
    const result = await runAssetUploadBatch({
      items,
      upload: async (input) => {
        attempted.push(input.file.name)
        if (input.file.name === 'photo-2.jpg') {
          throw { statusCode: 400, message: 'unsupported file type' }
        }
        return { id: attempted.length }
      },
    })
    expect(attempted).toEqual(['photo-1.jpg', 'photo-2.jpg', 'photo-3.jpg'])
    expect(result.createdIds).toEqual([1, 3])
    expect(result.failedCount).toBe(1)
    expect(items[0]?.status).toBe('SUCCESS')
    expect(items[1]?.status).toBe('FAILED')
    expect(items[1]?.errorMessage).toBe('unsupported file type')
    expect(items[2]?.status).toBe('SUCCESS')
    expect(assetUploadAllSucceeded(items)).toBe(false)
    expect(assetUploadHasRetryable(items)).toBe(true)
    expect(assetUploadSummaryText(items)).toBe('2 Assets created. 1 failed.')
  })

  it('stops the remaining batch on 401/403 and leaves later files unattempted', async () => {
    const items = createAssetUploadItems([
      fakeFile('photo-1.jpg'),
      fakeFile('photo-2.jpg'),
      fakeFile('photo-3.jpg'),
    ])
    const attempted: string[] = []
    const result = await runAssetUploadBatch({
      items,
      upload: async (input) => {
        attempted.push(input.file.name)
        if (input.file.name === 'photo-2.jpg') {
          throw { statusCode: 401, message: 'Unauthorized' }
        }
        return { id: 11 }
      },
    })
    expect(attempted).toEqual(['photo-1.jpg', 'photo-2.jpg'])
    expect(result.createdIds).toEqual([11])
    expect(result.stoppedForAuth).toBe(true)
    expect(items[0]?.status).toBe('SUCCESS')
    expect(items[1]?.status).toBe('FAILED')
    expect(items[2]?.status).toBe('PENDING')
    const during = createAssetUploadItems([
      fakeFile('photo-1.jpg'),
      fakeFile('photo-2.jpg'),
      fakeFile('photo-3.jpg'),
    ])
    during[0]!.status = 'SUCCESS'
    during[1]!.status = 'UPLOADING'
    expect(assetUploadProgressLabel(during, true)).toBe('Uploading 2 of 3...')
  })

  it('retries only failed and unattempted files', async () => {
    const items = createAssetUploadItems([
      fakeFile('photo-1.jpg'),
      fakeFile('photo-2.jpg'),
      fakeFile('photo-3.jpg'),
    ])
    const firstPass: string[] = []
    await runAssetUploadBatch({
      items,
      upload: async (input) => {
        firstPass.push(input.file.name)
        if (input.file.name !== 'photo-1.jpg') {
          throw { statusCode: 500, message: 'storage failure' }
        }
        return { id: 21 }
      },
    })
    expect(firstPass).toEqual(['photo-1.jpg', 'photo-2.jpg', 'photo-3.jpg'])
    expect(items[0]?.assetId).toBe(21)

    const retryPass: string[] = []
    const retried = await runAssetUploadBatch({
      items,
      upload: async (input) => {
        retryPass.push(input.file.name)
        if (input.file.name === 'photo-1.jpg') {
          throw new Error('successful files must not be resent')
        }
        return { id: input.file.name === 'photo-2.jpg' ? 22 : 23 }
      },
    })
    expect(retryPass).toEqual(['photo-2.jpg', 'photo-3.jpg'])
    expect(retried.createdIds).toEqual([21, 22, 23])
    expect(assetUploadAllSucceeded(items)).toBe(true)
    expect(assetUploadSummaryText(items)).toBe('3 Assets created.')
    expect(assetUploadSubmitLabel(items, { started: true })).toBe('Upload 3 assets')
    items[1]!.status = 'FAILED'
    expect(assetUploadSubmitLabel(items, { started: true })).toBe('Retry failed')
    expect(assetUploadSubmitLabel(items, { started: true, pending: true })).toBe('Upload 3 assets')
  })

  it('passes shared campaign and description into each upload', async () => {
    const items: AssetUploadItem[] = createAssetUploadItems([fakeFile('a.jpg'), fakeFile('b.jpg')])
    const received: AssetUploadFileInput[] = []
    await runAssetUploadBatch({
      items,
      shared: { description: 'September gym floor', campaignId: 44 },
      upload: async (input) => {
        received.push(input)
        const created: AssetUploadCreated = { id: received.length }
        return created
      },
    })
    expect(received.map(row => ({
      name: row.file.name,
      displayName: row.displayName,
      description: row.description,
      campaignId: row.campaignId,
    }))).toEqual([
      { name: 'a.jpg', displayName: 'a', description: 'September gym floor', campaignId: 44 },
      { name: 'b.jpg', displayName: 'b', description: 'September gym floor', campaignId: 44 },
    ])
  })
})
