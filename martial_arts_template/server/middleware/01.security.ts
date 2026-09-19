import { createError, defineEventHandler, getRequestHeader, getRequestIP } from 'h3'
import { readAppEnv, sessionCookieSecure } from '@crm/core/shared/utils/app-env'
import {
  applySecurityHeaders,
  assertMutatingOrigin,
  parseIpList,
  parseOriginList,
  requestIsHttps,
  trustedClientIp,
} from '@crm/core/shared/utils/request-security'

function headerValue(event: Parameters<typeof getRequestHeader>[0], name: string) {
  const value = getRequestHeader(event, name)
  return Array.isArray(value) ? value[0] : value
}

export default defineEventHandler((event) => {
  const trustedProxies = parseIpList(process.env.TRUSTED_PROXY_IPS)
  const remoteAddress = getRequestIP(event, { xForwardedFor: false })
    || event.node.req.socket?.remoteAddress
    || null
  const forwardedFor = headerValue(event, 'x-forwarded-for')
  const forwardedProto = headerValue(event, 'x-forwarded-proto')
  const host = headerValue(event, 'host')
  const origin = headerValue(event, 'origin')
  const referer = headerValue(event, 'referer')
  const https = requestIsHttps({
    forwardedProto,
    encrypted: Boolean((event.node.req.socket as { encrypted?: boolean } | undefined)?.encrypted),
    publicOrigin: process.env.NUXT_PUBLIC_ORIGIN,
    remoteAddress,
    trustedProxies,
  })
  const protocol = https ? 'https' : 'http'

  event.context.clientIp = trustedClientIp({
    remoteAddress,
    forwardedFor,
    trustedProxies,
  })
  event.context.requestHttps = https

  const csrf = assertMutatingOrigin({
    method: event.method,
    origin,
    referer,
    host,
    protocol,
    publicOrigin: process.env.NUXT_PUBLIC_ORIGIN,
    extraOrigins: parseOriginList(process.env.CSRF_ALLOWED_ORIGINS),
    remoteAddress,
  })
  if (!csrf.ok) {
    throw createError({
      statusCode: csrf.statusCode,
      statusMessage: csrf.message,
      message: csrf.message,
    })
  }

  const headers = applySecurityHeaders({}, { https })
  for (const [name, value] of Object.entries(headers)) {
    setHeader(event, name, value)
  }

  const secureCookies = sessionCookieSecure(readAppEnv(), process.env.SESSION_COOKIE_SECURE) || https
  event.context.sessionCookieSecure = secureCookies
})
