function rewriteCookie(value: string, secure: boolean) {
  const parts = value.split(';').map(part => part.trim()).filter(Boolean)
  const filtered = parts.filter(part => !/^secure$/i.test(part) && !/^samesite=/i.test(part) && !/^httponly$/i.test(part))
  filtered.push('HttpOnly', 'SameSite=Lax')
  if (secure) {
    filtered.push('Secure')
  }
  return filtered.join('; ')
}

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('beforeResponse', (event) => {
    const header = getResponseHeader(event, 'set-cookie')
    if (!header) {
      return
    }
    const secure = Boolean(event.context.sessionCookieSecure)
    const values = Array.isArray(header) ? header : [header]
    const next = values.map(value => rewriteCookie(String(value), secure))
    setResponseHeader(event, 'set-cookie', next)
  })
})
