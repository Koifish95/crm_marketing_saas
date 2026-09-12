import { registerPublicPaths } from '@crm/core/server/services/authorization'

registerPublicPaths({
  pages: ['/inquire'],
  prefixes: ['/api/public'],
  matchers: {
    'sales-tracking': pathname => pathname === '/t' || pathname.startsWith('/t/'),
  },
})

export * from '@crm/core/server/services/authorization'
