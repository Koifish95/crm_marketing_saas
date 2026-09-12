/** UTC epoch milliseconds. Persist this; do not store local wall time. */
export function utcNowMs(): number {
  return Date.now()
}
