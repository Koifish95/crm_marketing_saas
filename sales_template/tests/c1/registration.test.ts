import { describe, expect, it } from 'vitest'
import '@crm/core/shared/utils/core-shell'
import { listNavItems } from '@crm/core/shared/utils/nav'
import { listRegisteredAccessRightCodes } from '@crm/core/shared/utils/permission-catalog'
import { listSettingsSections } from '@crm/core/shared/utils/settings-registry'
import '../../shared/utils/access-rights'
import '../../lib/register-sales-shell'

describe('C2A registration contracts', () => {
  it('composes Core admin nav with Sales items', () => {
    const staff = listNavItems({ role: 'STAFF', accessRights: ['VIEW_SALES'] }).map(item => item.label)
    expect(staff).toEqual(['Dashboard', 'Leads', 'Companies', 'Contacts', 'Opportunities', 'Activities', 'Campaigns', 'Offers'])

    const admin = listNavItems({ role: 'ADMIN' }).map(item => item.label)
    expect(admin).toEqual([
      'Dashboard',
      'Leads',
      'Companies',
      'Contacts',
      'Opportunities',
      'Activities',
      'Campaigns',
      'Offers',
      'Users',
      'Security activity',
      'Settings',
    ])
  })

  it('registers Sales access rights and not Martial Arts marketing rights', () => {
    expect(listRegisteredAccessRightCodes()).toContain('VIEW_SALES')
    expect(listRegisteredAccessRightCodes()).toContain('MANAGE_SALES')
    expect(listRegisteredAccessRightCodes()).not.toContain('VIEW_MARKETING')
  })

  it('registers Sales settings sections only', () => {
    expect(listSettingsSections().map(section => section.to)).toEqual(['/settings/access', '/settings/intake'])
  })
})
