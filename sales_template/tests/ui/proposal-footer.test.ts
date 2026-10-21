import { describe, expect, it } from 'vitest'
import { proposalFooterToPrint } from '../../shared/utils/proposals'

describe('proposalFooterToPrint', () => {
  it('skips the footer when it repeats the Terms', () => {
    expect(proposalFooterToPrint({ terms: 'Net 30.', letterheadFooter: ' Net 30. ' })).toBe('')
  })
  it('keeps the footer when Terms differ', () => {
    expect(proposalFooterToPrint({ terms: 'Net 15.', letterheadFooter: 'Net 30.' })).toBe('Net 30.')
  })
  it('keeps the footer when Terms are empty', () => {
    expect(proposalFooterToPrint({ terms: '', letterheadFooter: 'Net 30.' })).toBe('Net 30.')
    expect(proposalFooterToPrint({ terms: null, letterheadFooter: 'Net 30.' })).toBe('Net 30.')
  })
  it('returns empty when there is no footer', () => {
    expect(proposalFooterToPrint({ terms: 'x', letterheadFooter: null })).toBe('')
  })
})
