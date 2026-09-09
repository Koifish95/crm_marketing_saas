export const DEFAULT_APP_NAME = 'Martial Arts Acquisition'
export const DEFAULT_BRAND_NAME = 'Martial Arts'
export const DEFAULT_BRAND_LOCATION = 'Academy'

export function publicBrand(env: NodeJS.Dict<string | undefined> = process.env) {
  return {
    appName: env.NUXT_PUBLIC_APP_NAME?.trim() || DEFAULT_APP_NAME,
    brandName: env.NUXT_PUBLIC_BRAND_NAME?.trim() || DEFAULT_BRAND_NAME,
    brandLocation: env.NUXT_PUBLIC_BRAND_LOCATION?.trim() || DEFAULT_BRAND_LOCATION,
    publicTagline: env.NUXT_PUBLIC_PUBLIC_TAGLINE?.trim() || '',
  }
}
