import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveEffectiveAccessRightsForUserId } from '@crm/core/server/services/access-rights'
import { listRegisteredAccessRightCodes } from '@crm/core/shared/utils/permission-catalog'
import { createManagedUser } from '@crm/core/server/services/users'
import { userRoleAccessRights, userRoles, userTypeRoles, userTypes } from '../../server/database/schema'
import { eq } from 'drizzle-orm'
import { registerSalesAccessRights } from '../../shared/utils/access-rights'
import { openTestDatabase } from '../helpers/db'

let dbHandle: Awaited<ReturnType<typeof openTestDatabase>> | undefined

afterEach(async () => {
  await dbHandle?.close()
  dbHandle = undefined
})

describe('Viewer sales access', () => {
  it('registers View Sales from the server startup path', () => {
    registerSalesAccessRights()
    const codes = listRegisteredAccessRightCodes()
    expect(codes).toContain('VIEW_SALES')
    expect(codes).toContain('MANAGE_SALES')
    const plugin = readFileSync(new URL('../../server/plugins/app-env.ts', import.meta.url), 'utf8')
    const me = readFileSync(new URL('../../server/api/auth/me.get.ts', import.meta.url), 'utf8')
    expect(plugin).toContain('registerSalesAccessRights()')
    expect(me).toContain('registerSalesAccessRights()')
    expect(me).toContain('../../../shared/utils/access-rights')
    expect(plugin).not.toMatch(/import ['"][^'"]*access-rights['"]/)
  })

  it('gives a Viewer only View Sales, and keeps Manage Sales on Staff', async () => {
    dbHandle = await openTestDatabase({ appEnv: 'production' })
    const viewer = await createManagedUser(dbHandle.db, {
      displayName: 'Board reader',
      email: 'board-reader@example.com',
      username: 'board-reader',
      role: 'VIEWER',
      password: 'Reader1!',
    })
    const staff = await createManagedUser(dbHandle.db, {
      displayName: 'Sales staff',
      email: 'sales-staff@example.com',
      username: 'sales-staff',
      role: 'STAFF',
    })
    const weak = await createManagedUser(dbHandle.db, {
      displayName: 'Weak reader',
      email: 'weak-reader@example.com',
      username: 'weak-reader',
      role: 'VIEWER',
      password: 'short',
    })
    expect(viewer.mustChangePassword).toBe(false)
    expect(weak.mustChangePassword).toBe(true)
    expect(staff.mustChangePassword).toBe(true)
    expect(await resolveEffectiveAccessRightsForUserId(dbHandle.db, viewer.id)).toEqual(['VIEW_SALES'])
    const staffRights = await resolveEffectiveAccessRightsForUserId(dbHandle.db, staff.id)
    expect(staffRights).toContain('VIEW_SALES')
    expect(staffRights).toContain('MANAGE_SALES')

    const [reader] = await dbHandle.db.select().from(userRoles).where(eq(userRoles.code, 'SALES_READER'))
    const grants = await dbHandle.db.select().from(userRoleAccessRights).where(eq(userRoleAccessRights.userRoleId, reader!.id))
    expect(grants.map(row => row.accessRight)).toEqual(['VIEW_SALES'])
    const [viewerType] = await dbHandle.db.select().from(userTypes).where(eq(userTypes.code, 'VIEWER'))
    const links = await dbHandle.db.select().from(userTypeRoles).where(eq(userTypeRoles.userTypeId, viewerType!.id))
    expect(links.map(row => row.userRoleId)).toEqual([reader!.id])
  })
})
