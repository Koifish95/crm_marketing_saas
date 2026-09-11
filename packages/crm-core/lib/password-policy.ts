/** Default temporary password for ADMIN create. Never log this value. */
export const TEMPORARY_PASSWORD_DEFAULT = 'Change1!'

export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_POLICY_COPY = 'At least 8 characters, including one uppercase letter and one special character.'

export function hasUppercase(password: string) {
  return /[A-Z]/.test(password)
}

export function hasSpecialCharacter(password: string) {
  return /[^A-Za-z0-9]/.test(password)
}

export function isPermanentPasswordCompliant(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH && hasUppercase(password) && hasSpecialCharacter(password)
}

export function permanentPasswordIssues(password: string) {
  const issues: string[] = []
  if (password.length < PASSWORD_MIN_LENGTH) {
    issues.push(`Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  }
  if (!hasUppercase(password)) {
    issues.push('Include at least one uppercase letter.')
  }
  if (!hasSpecialCharacter(password)) {
    issues.push('Include at least one special character.')
  }
  return issues
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}
