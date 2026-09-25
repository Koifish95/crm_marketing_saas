import { isLoopbackConnection, isNitroInProcessSocket } from '../../shared/utils/loopback'

export default defineEventHandler((event) => {
  const socket = event.node.req.socket
  if (isNitroInProcessSocket(socket)) {
    return
  }
  const remote = socket?.remoteAddress
  const forwardedFor = getHeader(event, 'x-forwarded-for')
  const realIp = getHeader(event, 'x-real-ip')
  if (isLoopbackConnection({ remoteAddress: remote, forwardedFor, realIp })) {
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
