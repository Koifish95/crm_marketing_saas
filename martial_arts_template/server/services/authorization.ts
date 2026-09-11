import { registerPublicPaths } from '@crm/core/server/services/authorization'

registerPublicPaths({
  pages: ['/trial'],
  prefixes: ['/api/public'],
  matchers: {
    'ma-events': pathname => pathname === '/events' || pathname.startsWith('/events/'),
    'ma-tracking': pathname => pathname === '/t' || pathname.startsWith('/t/'),
  },
})

export * from '@crm/core/server/services/authorization'
