import { createError, defineEventHandler, readBody } from 'h3'
import { loginSchema } from '../../../shared/schemas/auth'
import { useDb } from '../../database'
import { AuthFailure, authenticateUser } from '../../services/auth'
import { GENERIC_AUTH_FAILURE, postLoginRedirect } from '../../services/authorization'
import {
  isLoginThrottled,
  loginThrottleKey,
  recordLoginFailure,
  resetLoginThrottle,
} from '../../services/login-throttle'
import { recordSecurityEvent, requestAuditContext } from '../../services/security-audit'
import { normalizeEmail } from '../../../shared/utils/password-policy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = loginSchema.safeParse(body)
  const ctx = requestAuditContext(event)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: GENERIC_AUTH_FAILURE,
      message: GENERIC_AUTH_FAILURE,
    })
  }

  const email = normalizeEmail(parsed.data.identifier)
  const key = loginThrottleKey(ctx.ip, email)
  if (isLoginThrottled(key)) {
    await recordSecurityEvent(useDb(), {
      action: 'LOGIN_FAILURE',
      result: 'FAILURE',
      ...ctx,
      metadata: { reason: 'throttled' },
    })
    throw createError({
      statusCode: 401,
      statusMessage: GENERIC_AUTH_FAILURE,
      message: GENERIC_AUTH_FAILURE,
    })
  }

  try {
    const user = await authenticateUser(useDb(), parsed.data.identifier, parsed.data.password)
    resetLoginThrottle(key)
    await recordSecurityEvent(useDb(), {
      action: 'LOGIN_SUCCESS',
      result: 'SUCCESS',
      actorUserId: user.id,
      targetUserId: user.id,
      ...ctx,
    })
    await setUserSession(event, { user })
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      redirectTo: postLoginRedirect(user, parsed.data.redirect),
    }
  } catch (error) {
    if (error instanceof AuthFailure) {
      recordLoginFailure(key)
      await recordSecurityEvent(useDb(), {
        action: 'LOGIN_FAILURE',
        result: 'FAILURE',
        ...ctx,
        metadata: { reason: 'invalid' },
      })
      throw createError({
        statusCode: 401,
        statusMessage: GENERIC_AUTH_FAILURE,
        message: GENERIC_AUTH_FAILURE,
      })
    }
    throw error
  }
})
