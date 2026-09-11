import { seedAccessFramework } from '@crm/core/server/services/access-rights'
import type { Database } from '../database'
import {
  SEEDED_USER_ROLE_RIGHTS,
  SEEDED_USER_ROLES,
} from '../../shared/utils/access-rights'

export {
  assignExtraUserRoles,
  assignUserType,
  listAccessCatalog,
  listAssignedRolesForUser,
  presentManagedUserAccess,
  replaceUserRoleRights,
  replaceUserTypeRoles,
  requireAccessRight,
  resolveEffectiveAccessRights,
  resolveEffectiveAccessRightsForUserId,
  userHasAccessRight,
  userTypeForCoarseRole,
} from '@crm/core/server/services/access-rights'

export async function seedAccessCatalog(db: Database) {
  await seedAccessFramework(db, {
    userRoles: SEEDED_USER_ROLES,
    roleRights: SEEDED_USER_ROLE_RIGHTS,
  })
}
