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

export function provisionRequestBody(form: ProvisionForm): ProvisionForm {
  return {
    displayName: form.displayName,
    slug: form.slug,
    timezone: form.timezone,
    adminEmail: form.adminEmail,
  }
}
