import type { PublicAttributionFields } from '#shared/utils/public-attribution'
import { isRepeatedSubmitTap } from '#shared/utils/acquisition-funnel'

const sent = new Set<string>()
let lastSubmitAt = 0

type FunnelMetadata = Record<string, string | number | boolean | null | undefined>

function track(
  type: string,
  metadata: FunnelMetadata | undefined,
  attribution: PublicAttributionFields | null | undefined,
) {
  if (!import.meta.client) {
    return
  }
  try {
    const body: Record<string, unknown> = {
      type,
      route: window.location.pathname,
    }
    if (metadata && Object.keys(metadata).length) {
      body.metadata = metadata
    }
    if (attribution?.campaign) {
      body.campaign = attribution.campaign
    }
    if (attribution?.trackingCode) {
      body.trackingCode = attribution.trackingCode
    }
    if (attribution?.utmSource) {
      body.utmSource = attribution.utmSource
    }
    if (attribution?.utmMedium) {
      body.utmMedium = attribution.utmMedium
    }
    if (attribution?.utmContent) {
      body.utmContent = attribution.utmContent
    }
    if (attribution?.utmTerm) {
      body.utmTerm = attribution.utmTerm
    }
    void fetch('/api/public/acquisition-funnel', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {})
  } catch {
    // A failed measurement must not block the booking page.
  }
}

export function useAcquisitionFunnel() {
  function trackOnce(
    key: string,
    type: string,
    metadata?: FunnelMetadata,
    attribution?: PublicAttributionFields | null,
  ) {
    if (!import.meta.client || sent.has(key)) {
      return
    }
    sent.add(key)
    track(type, metadata, attribution)
  }

  function trackSubmit(idempotencyKey: string, attribution?: PublicAttributionFields | null) {
    if (!import.meta.client) {
      return
    }
    const now = Date.now()
    if (isRepeatedSubmitTap(lastSubmitAt, now)) {
      return
    }
    lastSubmitAt = now
    track('booking_submit_attempted', { idempotencyKey }, attribution)
  }

  function trackFailure(category: string, idempotencyKey: string | undefined, attribution?: PublicAttributionFields | null) {
    const key = `booking_failed:${category}:${idempotencyKey ?? 'none'}`
    trackOnce(key, 'booking_failed', {
      category,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    }, attribution)
  }

  return { trackOnce, trackSubmit, trackFailure }
}
