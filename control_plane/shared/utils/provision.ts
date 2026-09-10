export type ProvisionForm = {
  displayName: string
  slug: string
  timezone: string
  adminEmail: string
}

export const DEFAULT_PROVISION_FORM: ProvisionForm = {
  displayName: '',
  slug: '',
  timezone: 'America/Denver',
  adminEmail: '',
}

export const EXTRA_ENV_TYPES = ['DEV', 'STAGE', 'UAT', 'TRAINING'] as const

export type ExtraEnvironmentForm = {
  type: (typeof EXTRA_ENV_TYPES)[number]
  displayName: string
}

export const DEFAULT_EXTRA_ENVIRONMENT_FORM: ExtraEnvironmentForm = {
  type: 'DEV',
  displayName: '',
}

export function extraEnvironmentRequestBody(form: ExtraEnvironmentForm): ExtraEnvironmentForm {
  return {
    type: form.type,
    displayName: form.displayName,
  }
}

export function provisionRequestBody(form: ProvisionForm): ProvisionForm {
  return {
    displayName: form.displayName,
    slug: form.slug,
    timezone: form.timezone,
    adminEmail: form.adminEmail,
  }
}
