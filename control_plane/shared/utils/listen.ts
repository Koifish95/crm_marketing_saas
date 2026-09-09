export const LISTEN_HOST = '127.0.0.1'
export const LISTEN_PORT = 52100

export function listenAddress(host = LISTEN_HOST, port = LISTEN_PORT) {
  return `http://${host}:${port}`
}
