const DIGEST_REF = /^(.+)@sha256:([0-9a-f]{64})$/
const HEX_64 = /^[0-9a-f]{64}$/

export function imageRepository(expectedImage: string) {
  const trimmed = expectedImage.trim()
  const digest = trimmed.match(DIGEST_REF)
  const base = digest?.[1] || trimmed
  const slash = base.lastIndexOf('/')
  const name = slash === -1 ? base : base.slice(slash + 1)
  const colon = name.lastIndexOf(':')
  if (colon > 0) {
    return base.slice(0, base.length - (name.length - colon))
  }
  return base
}

export function normalizeImageId(imageId: string) {
  const hex = imageId.trim().replace(/^sha256:/, '')
  if (!HEX_64.test(hex)) {
    return null
  }
  return `sha256:${hex}`
}

export function digestImageRef(repository: string, imageId: string) {
  const id = normalizeImageId(imageId)
  if (!id) {
    throw new Error('Image id is not a sha256 digest.')
  }
  return `${repository}@${id}`
}

export function isDigestImageRef(value: string) {
  return DIGEST_REF.test(value.trim())
}

export function releaseIdentity(sourceRelease: string, imageId: string) {
  const source = sourceRelease.trim()
  const id = normalizeImageId(imageId)
  if (!source || source === 'dev' || !id) {
    throw new Error('Release identity needs a source release and an image digest.')
  }
  return `${source}@${id.slice('sha256:'.length, 'sha256:'.length + 12)}`
}

export function immutableImageTag(repository: string, releaseId: string) {
  const safe = releaseId.trim().replace(/[^A-Za-z0-9_.-]/g, '-')
  if (!safe || safe === 'dev') {
    throw new Error('Release id cannot be used as an image tag.')
  }
  return `${repository}:${safe}`
}
