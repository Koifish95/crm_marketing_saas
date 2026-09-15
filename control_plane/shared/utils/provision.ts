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
  productInstanceId: string
  type: (typeof EXTRA_ENV_TYPES)[number]
  displayName: string
}

export const DEFAULT_EXTRA_ENVIRONMENT_FORM: ExtraEnvironmentForm = {
  productInstanceId: '',
  type: 'DEV',
  displayName: '',
}

export type ProductInstanceForm = {
  productId: string
}

export const DEFAULT_PRODUCT_INSTANCE_FORM: ProductInstanceForm = {
  productId: '',
}

export function extraEnvironmentRequestBody(form: ExtraEnvironmentForm): ExtraEnvironmentForm {
  return {
    productInstanceId: form.productInstanceId,
    type: form.type,
    displayName: form.displayName,
  }
}

export function productInstanceRequestBody(form: ProductInstanceForm): ProductInstanceForm {
  return {
    productId: form.productId,
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

export function isRetryableLifecycle(lifecycleStatus?: string) {
  return lifecycleStatus === 'failed' || lifecycleStatus === 'provisioning'
}

export function customerNeedsRetry(environments: readonly { lifecycleStatus?: string }[]) {
  return environments.some(env => isRetryableLifecycle(env.lifecycleStatus))
}
