import { isAdminRole, registerNavItems } from './nav'

registerNavItems([
  {
    id: 'core-dashboard',
    to: '/dashboard',
    label: 'Dashboard',
    match: '/dashboard',
    order: 10,
    visible: () => true,
  },
  {
    id: 'core-users',
    to: '/users',
    label: 'Users',
    match: '/users',
    order: 80,
    visible: ctx => isAdminRole(ctx.role),
  },
  {
    id: 'core-security',
    to: '/security',
    label: 'Security activity',
    match: '/security',
    order: 90,
    visible: ctx => isAdminRole(ctx.role),
  },
  {
    id: 'core-settings',
    to: '/settings',
    label: 'Settings',
    match: '/settings',
    order: 100,
    visible: ctx => isAdminRole(ctx.role),
  },
])
