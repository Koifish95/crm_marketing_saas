import { describe, expect, it } from 'vitest'
import {
  campaignKindLabel,
  campaignStatusLabel,
  contentStatusLabel,
  eventStatusLabel,
  dueStateLabel,
  leadStatusLabel,
  personName,
  sourceLabel,
  trialStatusLabel,
} from '../../shared/utils/labels'

describe('display labels', () => {
  it('maps persisted enums to staff-facing copy', () => {
    expect(leadStatusLabel('TRIAL_SCHEDULED')).toBe('Trial scheduled')
    expect(trialStatusLabel('NO_SHOW')).toBe('No-show')
    expect(sourceLabel('WALK_IN')).toBe('Walk-in')
    expect(dueStateLabel('DUE_TODAY')).toBe('Due today')
    expect(campaignStatusLabel('PLANNED')).toBe('Planned')
    expect(campaignKindLabel('PAID')).toBe('Paid')
    expect(contentStatusLabel('READY_TO_PUBLISH')).toBe('Ready to publish')
    expect(eventStatusLabel('PUBLISHED')).toBe('Published')
  })

  it('joins a person name without leaking empty parts', () => {
    expect(personName({ firstName: 'Ana', lastName: 'Silva' })).toBe('Ana Silva')
    expect(personName({ firstName: 'Ana', lastName: null })).toBe('Ana')
    expect(personName(null)).toBe('Lead')
  })
})
