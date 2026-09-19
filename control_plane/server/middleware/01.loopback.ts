function isLoopback(address: string | undefined) {
  const value = (address || '').replace(/^::ffff:/, '').toLowerCase()
  return value === '127.0.0.1' || value === '::1' || value === 'localhost'
}

export default defineEventHandler((event) => {
  const remote = event.node.req.socket?.remoteAddress
  if (isLoopback(remote)) {
    return
  }
  if (process.env.CONTROL_PLANE_ALLOW_REMOTE === 'true' && process.env.CONTROL_PLANE_TOKEN) {
    const header = getHeader(event, 'x-control-plane-token')
    if (header && header === process.env.CONTROL_PLANE_TOKEN) {
      return
    }
  }
  throw createError({
    statusCode: 403,
    statusMessage: 'Control Plane is operator-only on 127.0.0.1.',
    message: 'Control Plane is operator-only on 127.0.0.1.',
  })
})
