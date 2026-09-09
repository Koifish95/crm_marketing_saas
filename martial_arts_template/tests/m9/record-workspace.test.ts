import { describe, expect, it } from 'vitest'
import { leadListQuery, leadStaffPath } from '../../shared/utils/lead'
import {
  adjacentRecordIds,
  filterRecordsByLabel,
  firstQueryValue,
  mergeRouteQuery,
} from '../../shared/utils/record-workspace'

describe('Primary Record Workspace query helpers', () => {
  it('merges tab changes without dropping unrelated query keys', () => {
    expect(mergeRouteQuery(
      { campaignId: '4', line: '12', tab: 'overview' },
      { tab: 'tracking' },
    )).toEqual({
      campaignId: '4',
      line: '12',
      tab: 'tracking',
    })
  })

  it('removes empty patched keys and ignores blank source values', () => {
    expect(mergeRouteQuery(
      { tab: 'overview', q: '', line: ['9'] },
      { tab: '', q: 'alex' },
    )).toEqual({
      line: '9',
      q: 'alex',
    })
  })

  it('walks previous and next ids without wrapping', () => {
    expect(adjacentRecordIds([3, 8, 21], 8)).toEqual({ previousId: 3, nextId: 21, index: 1 })
    expect(adjacentRecordIds([3, 8, 21], 3)).toEqual({ previousId: null, nextId: 8, index: 0 })
    expect(adjacentRecordIds([3, 8, 21], 21)).toEqual({ previousId: 8, nextId: null, index: 2 })
    expect(adjacentRecordIds([3, 8, 21], 99)).toEqual({ previousId: null, nextId: null, index: -1 })
  })

  it('filters selector records by label and reads the first query value', () => {
    const records = [
      { id: 1, label: 'Fall Kids Push' },
      { id: 2, label: 'Open House' },
    ]
    expect(filterRecordsByLabel(records, 'kids').map(item => item.id)).toEqual([1])
    expect(filterRecordsByLabel(records, '  ').map(item => item.id)).toEqual([1, 2])
    expect(firstQueryValue(['tracking', 'overview'])).toBe('tracking')
    expect(firstQueryValue('')).toBeUndefined()
  })

  it('copies Lead list filters onto a household record path and drops tab/line keys', () => {
    expect(leadListQuery({
      search: 'ana',
      status: 'NEW',
      programId: '3',
      source: 'WALK_IN',
      campaignId: '9',
      tab: 'follow-up',
      line: '12',
    })).toEqual({
      search: 'ana',
      status: 'NEW',
      programId: '3',
      source: 'WALK_IN',
      campaignId: '9',
    })
    expect(leadStaffPath(44, { search: 'ana', campaignId: '9', tab: 'members' })).toBe('/leads/44?search=ana&campaignId=9')
    expect(leadStaffPath(44)).toBe('/leads/44')
  })
})
