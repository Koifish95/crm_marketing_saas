export function trackingPath(link: {
  code: string
  destinationPath?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmContent?: string | null
  utmTerm?: string | null
}) {
  const params = new URLSearchParams()
  params.set('c', link.code)
  if (link.utmSource) {
    params.set('utm_source', link.utmSource)
  }
  if (link.utmMedium) {
    params.set('utm_medium', link.utmMedium)
  }
  if (link.utmCampaign) {
    params.set('utm_campaign', link.utmCampaign)
  }
  if (link.utmContent) {
    params.set('utm_content', link.utmContent)
  }
  if (link.utmTerm) {
    params.set('utm_term', link.utmTerm)
  }
  const path = link.destinationPath?.trim() || '/trial'
  return `${path}?${params.toString()}`
}

export function friendlyTrackingPath(link: { publicSlug: string }) {
  return `/t/${link.publicSlug}`
}

export function campaignAnchorId(campaignId: number) {
  return `campaign-${campaignId}`
}

export function parseCampaignHashId(hash: string): number | null {
  const match = /^#campaign-(\d+)$/.exec(hash.trim())
  if (!match) {
    return null
  }
  const id = Number(match[1])
  if (!Number.isInteger(id) || id < 1) {
    return null
  }
  return id
}

export function campaignStaffPath(campaignId: number) {
  return `/marketing/campaigns/${campaignId}`
}

export function campaignLeadsPath(campaignId: number) {
  return `/leads?campaignId=${campaignId}`
}
