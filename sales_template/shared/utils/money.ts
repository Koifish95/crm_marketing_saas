/** USD stored as integer cents. Never persist commercial money as a float. */
export function dollarsToCents(dollars: string): number {
  const trimmed = dollars.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error(`Invalid dollar amount: ${dollars}`)
  }
  const [whole, fraction = ''] = trimmed.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

export function centsToDollarString(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error(`Invalid cents: ${cents}`)
  }
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const whole = Math.floor(abs / 100)
  const fraction = String(abs % 100).padStart(2, '0')
  return `${sign}${whole}.${fraction}`
}

export function formatUsdFromCents(cents: number | null | undefined) {
  if (cents == null) {
    return '—'
  }
  return `$${centsToDollarString(cents)}`
}
