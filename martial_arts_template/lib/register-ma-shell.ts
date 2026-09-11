import { canUseCrmRole, registerNavItems } from '@crm/core/shared/utils/nav'
import { registerSettingsSections } from '@crm/core/shared/utils/settings-registry'

registerNavItems([
  {
    id: 'ma-leads',
    to: '/leads',
    label: 'Leads',
    match: '/leads',
    order: 20,
    visible: ctx => canUseCrmRole(ctx.role),
  },
  {
    id: 'ma-follow-up',
    to: '/tasks',
    label: 'Follow-up',
    match: '/tasks',
    order: 30,
    visible: ctx => canUseCrmRole(ctx.role),
  },
  {
    id: 'ma-marketing',
    to: '/marketing',
    label: 'Marketing',
    match: '/marketing',
    order: 40,
    visible: ctx => ctx.role === 'ADMIN' || Boolean(ctx.accessRights?.includes('VIEW_MARKETING')),
  },
  {
    id: 'ma-reports',
    to: '/reports',
    label: 'Reports',
    match: '/reports',
    order: 50,
    visible: ctx => canUseCrmRole(ctx.role),
  },
])

registerSettingsSections([
  {
    id: 'ma-intro-availability',
    to: '/settings/intro-availability',
    title: 'Intro schedule',
    description: 'Weekly classes and date exceptions for public and staff booking.',
    order: 10,
  },
  {
    id: 'ma-catalog',
    to: '/settings/catalog',
    title: 'Catalog',
    description: 'Programs, sources, offerings, lost reasons, and household pricing.',
    order: 20,
  },
  {
    id: 'ma-campaigns',
    to: '/settings/campaigns',
    title: 'Campaigns',
    description: 'Opens Marketing Campaign planning. Tracking links and Meta mapping stay available there.',
    order: 30,
  },
  {
    id: 'ma-meta',
    to: '/settings/meta',
    title: 'Meta',
    description: 'Read-only Marketing API sync and explicit campaign mapping.',
    order: 40,
  },
  {
    id: 'ma-access',
    to: '/settings/access',
    title: 'Access',
    description: 'User Types, User Roles, and Access Rights for Marketing.',
    order: 50,
  },
  {
    id: 'ma-environment',
    to: '/settings/environment',
    title: 'Environment',
    description: 'Download and restore SQLite backups to copy data between environments.',
    order: 60,
  },
])
