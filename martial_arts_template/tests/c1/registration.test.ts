import { describe, expect, it } from 'vitest'
import '@crm/core/shared/utils/core-shell'
import { listNavItems } from '@crm/core/shared/utils/nav'
import { listRegisteredAccessRightCodes } from '@crm/core/shared/utils/permission-catalog'
import { listSettingsSections } from '@crm/core/shared/utils/settings-registry'
import '../../lib/register-ma-shell'
import { ACCESS_RIGHTS } from '../../shared/utils/access-rights'

describe('C1 registration contracts', () => {
  it('composes Core admin nav with Martial Arts items', () => {
    const staff = listNavItems({ role: 'STAFF', accessRights: ['VIEW_MARKETING'] }).map(item => item.label)
    expect(staff).toEqual(['Dashboard', 'Leads', 'Follow-up', 'Marketing', 'Reports'])

    const admin = listNavItems({ role: 'ADMIN' }).map(item => item.label)
    expect(admin).toEqual([
      'Dashboard',
      'Leads',
      'Follow-up',
      'Marketing',
      'Reports',
      'Users',
      'Security activity',
      'Settings',
    ])
  })

  it('keeps Marketing Access Right names in the Martial Arts catalog', () => {
    expect(listRegisteredAccessRightCodes()).toEqual([...ACCESS_RIGHTS])
    expect(listRegisteredAccessRightCodes()).toContain('VIEW_MARKETING')
    expect(listRegisteredAccessRightCodes()).not.toContain('households.read')
  })

  it('registers Martial Arts settings sections', () => {
    expect(listSettingsSections().map(section => section.to)).toEqual([
      '/settings/intro-availability',
      '/settings/catalog',
      '/settings/campaigns',
      '/settings/meta',
      '/settings/access',
      '/settings/environment',
    ])
  })
})
