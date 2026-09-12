declare module '#auth-utils' {
  interface User {
    id: number
    email: string
    displayName: string
    role: 'ADMIN' | 'STAFF' | 'VIEWER'
    mustChangePassword: boolean
    sessionVersion: number
  }
}

declare module 'h3' {
  interface H3EventContext {
    authUser?: {
      id: number
      email: string
      displayName: string
      role: 'ADMIN' | 'STAFF' | 'VIEWER'
      mustChangePassword?: boolean
    } | null
  }
}

export {}
