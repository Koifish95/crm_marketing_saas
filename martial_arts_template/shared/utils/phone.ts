const MIN_DIGITS = 10

/** Digits-only canonical phone for matching. US 11-digit numbers starting with 1 drop the country code. */
export function normalizePhone(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }
  const digits = value.replace(/\D/g, '')
  if (!digits) {
    return null
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1)
  }
  return digits
}

export function isUsablePhone(value: string | null | undefined): boolean {
  const canonical = normalizePhone(value)
  return Boolean(canonical && canonical.length >= MIN_DIGITS)
}

export function phonesMatch(left: string | null | undefined, right: string | null | undefined): boolean {
  const a = normalizePhone(left)
  const b = normalizePhone(right)
  return Boolean(a && b && a === b)
}
