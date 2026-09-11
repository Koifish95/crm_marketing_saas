export type RegisteredAccessRight = {
  code: string
  label: string
  description?: string
}

const rights = new Map<string, RegisteredAccessRight>()

export function registerAccessRights(items: readonly RegisteredAccessRight[]) {
  for (const item of items) {
    rights.set(item.code, item)
  }
}

export function listRegisteredAccessRights(): RegisteredAccessRight[] {
  return [...rights.values()]
}

export function listRegisteredAccessRightCodes(): string[] {
  return listRegisteredAccessRights().map(item => item.code)
}

export function isRegisteredAccessRight(code: string) {
  return rights.has(code)
}
