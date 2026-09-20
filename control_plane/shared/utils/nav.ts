export type OperatorNavLink = {
  to: string
  label: string
  exact?: boolean
}

export const OPERATOR_NAV: OperatorNavLink[] = [
  { to: '/', label: 'Dashboard', exact: true },
  { to: '/customers', label: 'Customers' },
  { to: '/products', label: 'Products' },
  { to: '/environments', label: 'Environments' },
  { to: '/backups', label: 'Backups' },
  { to: '/reports', label: 'Reports' },
  { to: '/nodes', label: 'Hosting Nodes' },
  { to: '/settings', label: 'Settings' },
]

export function navLinkActive(path: string, link: OperatorNavLink) {
  return link.exact ? path === '/' : path.startsWith(link.to)
}

export const CUSTOMER_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'products', label: 'Products' },
  { id: 'environments', label: 'Environments' },
  { id: 'history', label: 'History' },
  { id: 'configuration', label: 'Configuration' },
] as const

export const ENVIRONMENT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'runtime', label: 'Runtime' },
  { id: 'backup', label: 'Backup' },
  { id: 'release', label: 'Release' },
  { id: 'network', label: 'Network' },
  { id: 'history', label: 'History' },
] as const
