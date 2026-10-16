import { describe, expect, it } from 'vitest'
import {
  digestImageRef,
  imageRepository,
  immutableImageTag,
  isDigestImageRef,
  releaseIdentity,
} from '../../shared/utils/image-identity'
import { readEnvValue } from '../../server/services/provision-env'

const IMAGE = `sha256:${'a'.repeat(52)}64897047fdf3`

describe('immutable image identity', () => {
  it('keeps a digest reference distinct from a mutable tag', () => {
    expect(imageRepository('martial-arts-acquisition:s4')).toBe('martial-arts-acquisition')
    expect(imageRepository(`martial-arts-acquisition@${IMAGE}`)).toBe('martial-arts-acquisition')
    expect(isDigestImageRef('martial-arts-acquisition:s4')).toBe(false)
    expect(isDigestImageRef(`martial-arts-acquisition@${IMAGE}`)).toBe(true)
    expect(digestImageRef('martial-arts-acquisition', IMAGE)).toBe(`martial-arts-acquisition@${IMAGE}`)
    expect(releaseIdentity('47159a0da94b', IMAGE)).toBe('47159a0da94b@aaaaaaaaaaaa')
    expect(immutableImageTag('martial-arts-acquisition', '47159a0da94b@aaaaaaaaaaaa'))
      .toBe('martial-arts-acquisition:47159a0da94b-aaaaaaaaaaaa')
  })

  it('reads the release id stamped in a compose env file', () => {
    expect(readEnvValue('RELEASE_ID="47159a0da94b@aaaaaaaaaaaa"\n', 'RELEASE_ID'))
      .toBe('47159a0da94b@aaaaaaaaaaaa')
  })
})
