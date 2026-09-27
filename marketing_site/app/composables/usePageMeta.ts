export function usePageMeta(title: string, description: string) {
  const config = useRuntimeConfig()
  const route = useRoute()
  const siteUrl = String(config.public.siteUrl).replace(/\/$/, '')
  const canonical = `${siteUrl}${route.path}`
  const fullTitle = route.path === '/' ? title : `${title} · Nuxxion`

  useSeoMeta({
    title: fullTitle,
    description,
    ogTitle: fullTitle,
    ogDescription: description,
    ogType: 'website',
    ogUrl: canonical,
    twitterCard: 'summary_large_image',
  })
  useHead({
    link: [{ rel: 'canonical', href: canonical }],
  })
}
