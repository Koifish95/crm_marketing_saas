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
    /** Present only when tests inject an actor. Production uses the session cookie. */
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
