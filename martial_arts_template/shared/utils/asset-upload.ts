export type AssetUploadStatus = 'PENDING' | 'UPLOADING' | 'SUCCESS' | 'FAILED'

export interface AssetUploadItem {
  key: string
  file: File
  displayName: string
  status: AssetUploadStatus
  errorMessage: string | null
  assetId: number | null
}

export interface AssetUploadFileInput {
  file: File
  displayName: string
  description?: string | null
  campaignId?: string | number | null
}

export interface AssetUploadCreated {
  id: number
}

export interface AssetUploadBatchResult {
  createdIds: number[]
  failedCount: number
  pendingCount: number
  stoppedForAuth: boolean
}

export function displayNameFromFilename(filename: string) {
  const trimmed = filename.trim()
  const withoutExtension = trimmed.replace(/\.[^.]+$/, '')
  return withoutExtension || trimmed
}

export function createAssetUploadItems(files: File[]): AssetUploadItem[] {
  return files.map((file, index) => ({
    key: `${file.name}:${file.size}:${file.lastModified}:${index}`,
    file,
    displayName: displayNameFromFilename(file.name),
    status: 'PENDING',
    errorMessage: null,
    assetId: null,
  }))
}

export function fetchErrorStatus(caught: unknown): number | null {
  if (!caught || typeof caught !== 'object') {
    return null
  }
  const err = caught as { statusCode?: number, status?: number, data?: { statusCode?: number } }
  const status = err.statusCode ?? err.status ?? err.data?.statusCode
  return typeof status === 'number' ? status : null
}

export function isAssetUploadAuthFailure(caught: unknown) {
  const status = fetchErrorStatus(caught)
  return status === 401 || status === 403
}

export function assetUploadErrorMessage(caught: unknown, fallback = 'Could not upload that asset.') {
  if (!caught || typeof caught !== 'object') {
    return fallback
  }
  const err = caught as { data?: { message?: string }, message?: string }
  return err.data?.message || err.message || fallback
}

export function buildAssetUploadFormData(input: AssetUploadFileInput) {
  const body = new FormData()
  body.append('file', input.file)
  body.append('displayName', input.displayName.trim() || input.file.name)
  const description = input.description?.trim()
  if (description) {
    body.append('description', description)
  }
  if (input.campaignId !== undefined && input.campaignId !== null && input.campaignId !== '') {
    body.append('campaignId', String(input.campaignId))
  }
  return body
}

export function assetUploadProgressLabel(items: AssetUploadItem[], pending: boolean) {
  if (!pending || !items.length) {
    return ''
  }
  const uploadingIndex = items.findIndex(item => item.status === 'UPLOADING')
  const current = uploadingIndex >= 0
    ? uploadingIndex + 1
    : Math.min(items.filter(item => item.status === 'SUCCESS' || item.status === 'FAILED').length + 1, items.length)
  return `Uploading ${current} of ${items.length}...`
}

export function assetUploadSummaryText(items: AssetUploadItem[]) {
  const created = items.filter(item => item.status === 'SUCCESS').length
  const failed = items.filter(item => item.status === 'FAILED').length
  if (!created && !failed) {
    return ''
  }
  const createdPart = created === 1 ? '1 Asset created.' : `${created} Assets created.`
  if (!failed) {
    return createdPart
  }
  const failedPart = failed === 1 ? '1 failed.' : `${failed} failed.`
  return `${createdPart} ${failedPart}`
}

export function assetUploadHasRetryable(items: AssetUploadItem[]) {
  return items.some(item => item.status === 'FAILED' || item.status === 'PENDING')
}

export function assetUploadAllSucceeded(items: AssetUploadItem[]) {
  return items.length > 0 && items.every(item => item.status === 'SUCCESS')
}

export function assetUploadSubmitLabel(
  items: AssetUploadItem[],
  options?: { started?: boolean, campaign?: boolean, pending?: boolean },
) {
  if (!options?.pending && options?.started && assetUploadHasRetryable(items) && !assetUploadAllSucceeded(items)) {
    return 'Retry failed'
  }
  if (items.length > 1) {
    return `Upload ${items.length} assets`
  }
  return options?.campaign ? 'Upload to campaign' : 'Upload'
}

export async function runAssetUploadBatch(options: {
  items: AssetUploadItem[]
  shared?: { description?: string | null, campaignId?: string | number | null }
  upload: (input: AssetUploadFileInput) => Promise<AssetUploadCreated>
}): Promise<AssetUploadBatchResult> {
  let stoppedForAuth = false
  for (const item of options.items) {
    if (item.status === 'SUCCESS') {
      continue
    }
    if (stoppedForAuth) {
      break
    }
    item.status = 'UPLOADING'
    item.errorMessage = null
    try {
      const created = await options.upload({
        file: item.file,
        displayName: item.displayName,
        description: options.shared?.description,
        campaignId: options.shared?.campaignId,
      })
      item.status = 'SUCCESS'
      item.assetId = created.id
    } catch (caught) {
      item.status = 'FAILED'
      item.errorMessage = assetUploadErrorMessage(caught)
      if (isAssetUploadAuthFailure(caught)) {
        stoppedForAuth = true
      }
    }
  }
  return {
    createdIds: options.items
      .filter((item): item is AssetUploadItem & { assetId: number } => item.status === 'SUCCESS' && item.assetId != null)
      .map(item => item.assetId),
    failedCount: options.items.filter(item => item.status === 'FAILED').length,
    pendingCount: options.items.filter(item => item.status === 'PENDING').length,
    stoppedForAuth,
  }
}
