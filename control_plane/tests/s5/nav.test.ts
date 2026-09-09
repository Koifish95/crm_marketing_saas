import { describe, expect, it } from 'vitest'
import { CUSTOMER_TABS, ENVIRONMENT_TABS, OPERATOR_NAV, navLinkActive } from '../../shared/utils/nav'

describe('operator shell navigation', () => {
  it('lists the five operator destinations', () => {
    expect(OPERATOR_NAV.map(link => [link.to, link.label])).toEqual([
      ['/', 'Dashboard'],
      ['/customers', 'Customers'],
      ['/environments', 'Environments'],
      ['/nodes', 'Hosting Nodes'],
      ['/settings', 'Settings'],
    ])
  })

  it('marks dashboard only on the home path', () => {
    const dashboard = OPERATOR_NAV[0]!
    expect(navLinkActive('/', dashboard)).toBe(true)
    expect(navLinkActive('/customers', dashboard)).toBe(false)
  })

  it('keeps section links active on workspace routes', () => {
    const customers = OPERATOR_NAV[1]!
    expect(navLinkActive('/customers', customers)).toBe(true)
    expect(navLinkActive('/customers/new', customers)).toBe(true)
    expect(navLinkActive('/environments', customers)).toBe(false)
  })

  it('defines the existing workspace tabs', () => {
    expect(CUSTOMER_TABS.map(tab => tab.id)).toEqual(['overview', 'environments', 'configuration'])
    expect(ENVIRONMENT_TABS.map(tab => tab.id)).toEqual(['overview', 'runtime', 'configuration'])
  })
})
