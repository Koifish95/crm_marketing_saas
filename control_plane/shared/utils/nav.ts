export type OperatorNavLink = {
  to: string
  label: string
  exact?: boolean
}

export const OPERATOR_NAV: OperatorNavLink[] = [
  { to: '/', label: 'Dashboard', exact: true },
  { to: '/customers', label: 'Customers' },
  { to: '/environments', label: 'Environments' },
  { to: '/nodes', label: 'Hosting Nodes' },
  { to: '/settings', label: 'Settings' },
]

export function navLinkActive(path: string, link: OperatorNavLink) {
  return link.exact ? path === '/' : path.startsWith(link.to)
}

export const CUSTOMER_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'environments', label: 'Environments' },
  { id: 'configuration', label: 'Configuration' },
] as const

export const ENVIRONMENT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'runtime', label: 'Runtime / Health' },
  { id: 'lifecycle', label: 'Lifecycle' },
  { id: 'configuration', label: 'Configuration' },
] as const
