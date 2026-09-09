export function assetStaffPath(assetId: number) {
  return `/marketing/assets/${assetId}`
}

export function assetFilePath(assetId: number) {
  return `/api/marketing/assets/${assetId}/file`
}

export function assetMediaKind(mediaType: string): 'image' | 'video' | 'file' {
  if (mediaType.startsWith('image/')) {
    return 'image'
  }
  if (mediaType.startsWith('video/')) {
    return 'video'
  }
  return 'file'
}

export function assetTypeLabel(mediaType: string) {
  if (mediaType.startsWith('image/')) {
    return 'Image'
  }
  if (mediaType.startsWith('video/')) {
    return 'Video'
  }
  return mediaType || 'File'
}
