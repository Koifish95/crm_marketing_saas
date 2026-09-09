/**
 * USD stored as integer cents so SQLite and PostgreSQL stay exact.
 * Never persist membership money as a float.
 */
export function dollarsToCents(dollars: string): number {
  const trimmed = dollars.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error(`Invalid dollar amount: ${dollars}`)
  }

  const [whole, fraction = ''] = trimmed.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

export function centsToDollarString(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error(`Invalid cents: ${cents}`)
  }

  const whole = Math.floor(cents / 100)
  const fraction = String(cents % 100).padStart(2, '0')
  return `${whole}.${fraction}`
}

export const ADULT_BJJ_DEFAULT_CENTS = dollarsToCents('175')
