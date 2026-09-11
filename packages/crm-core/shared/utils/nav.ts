export type NavContext = {
  role?: string
  accessRights?: string[]
}

export type NavItem = {
  id: string
  to: string
  label: string
  match: string
  order: number
  visible: (ctx: NavContext) => boolean
}

const items = new Map<string, NavItem>()

export function registerNavItems(next: readonly NavItem[]) {
  for (const item of next) {
    items.set(item.id, item)
  }
}

export function listNavItems(ctx: NavContext) {
  return [...items.values()]
    .filter(item => item.visible(ctx))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
}

export function canUseCrmRole(role?: string) {
  return role === 'ADMIN' || role === 'STAFF'
}

export function isAdminRole(role?: string) {
  return role === 'ADMIN'
}
