import { canUseCrmRole, registerNavItems } from '@crm/core/shared/utils/nav'
import { registerSettingsSections } from '@crm/core/shared/utils/settings-registry'

function salesVisible(ctx: { role?: string, accessRights?: string[] }) {
  return canUseCrmRole(ctx.role) && (
    ctx.role === 'ADMIN' || Boolean(ctx.accessRights?.includes('VIEW_SALES'))
  )
}

registerNavItems([
  {
    id: 'sales-companies',
    to: '/companies',
    label: 'Companies',
    match: '/companies',
    order: 20,
    visible: salesVisible,
  },
  {
    id: 'sales-contacts',
    to: '/contacts',
    label: 'Contacts',
    match: '/contacts',
    order: 30,
    visible: salesVisible,
  },
  {
    id: 'sales-opportunities',
    to: '/opportunities',
    label: 'Opportunities',
    match: '/opportunities',
    order: 40,
    visible: salesVisible,
  },
  {
    id: 'sales-activities',
    to: '/activities',
    label: 'Activities',
    match: '/activities',
    order: 50,
    visible: salesVisible,
  },
])

registerSettingsSections([
  {
    id: 'sales-access',
    to: '/settings/access',
    title: 'Access',
    description: 'Sales Access Rights registered on CRM Core.',
    order: 10,
  },
])
