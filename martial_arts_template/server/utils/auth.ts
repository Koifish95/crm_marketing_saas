import { createError, type H3Event } from 'h3'
import { useDb } from '../database'
import { loadActiveUser } from '../services/auth'
import {
  ADMIN_ROLES,
  CRM_ACCESS_ROLES,
  FORBIDDEN_MESSAGE,
  PASSWORD_CHANGE_REQUIRED_MESSAGE,
  UNAUTHORIZED_MESSAGE,
  WRITE_ROLES,
  hasRole,
  isPasswordChangeAllowedPath,
  type SessionUser,
} from '../services/authorization'
import { requireAccessRight as assertAccessRight } from '../services/access-rights'
import { DomainError } from '../services/errors'
import type { AccessRight } from '../../shared/schemas/enums'

function requestPath(event: H3Event) {
  return event.path || event.node?.req?.url || ''
}

export async function requireAuthUser(event: H3Event): Promise<SessionUser> {
  if ('authUser' in event.context) {
    const injected = event.context.authUser as SessionUser | null | undefined
    if (!injected?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: UNAUTHORIZED_MESSAGE,
        message: UNAUTHORIZED_MESSAGE,
      })
    }
    const current = await loadActiveUser(useDb(), injected.id)
    if (!current) {
      throw createError({
        statusCode: 401,
        statusMessage: UNAUTHORIZED_MESSAGE,
        message: UNAUTHORIZED_MESSAGE,
      })
    }
    assertPasswordChangeNotBlocking(event, current)
    return toPublicSession(current)
  }

  const session = await requireUserSession(event)
  const sessionUser = session.user as { id?: number, sessionVersion?: number } | undefined
  if (!sessionUser?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: UNAUTHORIZED_MESSAGE,
      message: UNAUTHORIZED_MESSAGE,
    })
  }

  const current = await loadActiveUser(useDb(), sessionUser.id)
  if (!current || current.sessionVersion !== (sessionUser.sessionVersion ?? 0)) {
    await clearUserSession(event)
    throw createError({
      statusCode: 401,
      statusMessage: UNAUTHORIZED_MESSAGE,
      message: UNAUTHORIZED_MESSAGE,
    })
  }

  assertPasswordChangeNotBlocking(event, current)
  return toPublicSession(current)
}

function toPublicSession(user: Awaited<ReturnType<typeof loadActiveUser>>): SessionUser {
  return {
    id: user!.id,
    email: user!.email,
    displayName: user!.displayName,
    role: user!.role,
    mustChangePassword: user!.mustChangePassword,
  }
}

function assertPasswordChangeNotBlocking(event: H3Event, user: SessionUser) {
  if (!user.mustChangePassword) {
    return
  }
  if (isPasswordChangeAllowedPath(requestPath(event))) {
    return
  }
  throw createError({
    statusCode: 403,
    statusMessage: PASSWORD_CHANGE_REQUIRED_MESSAGE,
    message: PASSWORD_CHANGE_REQUIRED_MESSAGE,
  })
}

export async function requireCrmAccessUser(event: H3Event): Promise<SessionUser> {
  const user = await requireAuthUser(event)
  if (!hasRole(user.role, CRM_ACCESS_ROLES)) {
    throw createError({
      statusCode: 403,
      statusMessage: FORBIDDEN_MESSAGE,
      message: FORBIDDEN_MESSAGE,
    })
  }
  return user
}

export async function requireCrmWriteUser(event: H3Event): Promise<SessionUser> {
  const user = await requireAuthUser(event)
  if (!hasRole(user.role, WRITE_ROLES)) {
    throw createError({
      statusCode: 403,
      statusMessage: FORBIDDEN_MESSAGE,
      message: FORBIDDEN_MESSAGE,
    })
  }
  return user
}

export async function requireAdminUser(event: H3Event): Promise<SessionUser> {
  const user = await requireAuthUser(event)
  if (!hasRole(user.role, ADMIN_ROLES)) {
    throw createError({
      statusCode: 403,
      statusMessage: FORBIDDEN_MESSAGE,
      message: FORBIDDEN_MESSAGE,
    })
  }
  return user
}

export async function requireAccessRight(event: H3Event, right: AccessRight): Promise<SessionUser> {
  const user = await requireAuthUser(event)
  try {
    await assertAccessRight(useDb(), user, right)
  } catch (error) {
    if (error instanceof DomainError) {
      throw createError({
        statusCode: error.statusCode,
        statusMessage: error.message,
        message: error.message,
      })
    }
    throw error
  }
  return user
}
