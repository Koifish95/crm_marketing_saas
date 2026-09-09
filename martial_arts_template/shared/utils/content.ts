export function contentStaffPath(contentItemId: number, query?: { campaignId?: number | string | null }) {
  const campaignId = query?.campaignId
  if (campaignId != null && campaignId !== '') {
    return `/marketing/content/${contentItemId}?campaignId=${campaignId}`
  }
  return `/marketing/content/${contentItemId}`
}
