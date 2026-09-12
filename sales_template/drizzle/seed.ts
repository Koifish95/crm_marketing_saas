import { eq } from 'drizzle-orm'
import { seedAccessFramework } from '@crm/core/server/services/access-rights'
import { hashStaffPassword } from '@crm/core/server/services/password'
import { readAppEnv } from '@crm/core/shared/utils/app-env'
import { createDb, getDatabaseUrl } from '../server/database'
import { salesAccounts, salesActivities, salesContacts, salesLeads, salesOpportunities, users, userRoles, userTypes, userTypeRoles } from '../server/database/schema'
import { SEEDED_USER_ROLES, SEEDED_USER_ROLE_RIGHTS } from '../shared/utils/access-rights'
import { loadLocalEnv } from '../server/utils/load-env'
import { utcNowMs } from '../shared/utils/time'

export const BOOTSTRAP_PASSWORD_REQUIRED
  = 'NUXT_AUTH_PASSWORD is required to seed an admin user. Seed will not invent a default password.'

loadLocalEnv()

export function getBootstrapAdmin(env: NodeJS.Dict<string | undefined> = process.env) {
  const appEnv = readAppEnv(env)
  const username = (env.NUXT_AUTH_USERNAME ?? 'admin').trim().toLowerCase()
  const email = (env.NUXT_AUTH_EMAIL ?? `${username}@local`).trim().toLowerCase()
  const password = env.NUXT_AUTH_PASSWORD?.trim() || undefined
  if (!password) {
    throw new Error(BOOTSTRAP_PASSWORD_REQUIRED)
  }
  const reset = env.NUXT_AUTH_RESET_PASSWORD === 'true'
  const mustChangePassword = env.NUXT_AUTH_MUST_CHANGE_PASSWORD === 'true'
  return { username, email, password, reset, mustChangePassword, appEnv }
}

export async function seedDatabase(databaseUrl = getDatabaseUrl()) {
  const admin = getBootstrapAdmin()
  const { client, db } = createDb(databaseUrl)
  const createdAt = new Date(utcNowMs())

  try {
    await client.execute('PRAGMA foreign_keys = ON')

    const [existingAdmin] = await db.select().from(users).where(eq(users.email, admin.email)).limit(1)
    const current = existingAdmin
      ?? (await db.select().from(users).where(eq(users.username, admin.username)).limit(1))[0]
    const shouldSetPassword = !current || !current.passwordHash || admin.reset
    const passwordHash = shouldSetPassword
      ? await hashStaffPassword(admin.password)
      : current.passwordHash

    if (!current) {
      await db.insert(users).values({
        email: admin.email,
        username: admin.username,
        displayName: 'Administrator',
        role: 'ADMIN',
        active: true,
        passwordHash,
        mustChangePassword: admin.mustChangePassword,
        sessionVersion: 0,
        createdAt,
        updatedAt: createdAt,
      })
    } else if (admin.reset) {
      await db.update(users).set({
        passwordHash,
        mustChangePassword: admin.mustChangePassword,
        updatedAt: createdAt,
      }).where(eq(users.id, current.id))
    } else {
      await db.update(users).set({
        username: current.username || admin.username,
        passwordHash: shouldSetPassword ? passwordHash : current.passwordHash,
        ...(shouldSetPassword ? { mustChangePassword: admin.mustChangePassword } : {}),
        updatedAt: createdAt,
      }).where(eq(users.id, current.id))
    }

    await seedAccessFramework(db, {
      userRoles: SEEDED_USER_ROLES,
      roleRights: SEEDED_USER_ROLE_RIGHTS,
    })

    const [staffType] = await db.select().from(userTypes).where(eq(userTypes.code, 'STAFF')).limit(1)
    const [salesRole] = await db.select().from(userRoles).where(eq(userRoles.code, 'SALES_USER')).limit(1)
    if (staffType && salesRole) {
      const [existing] = await db.select().from(userTypeRoles).where(eq(userTypeRoles.userTypeId, staffType.id)).limit(1)
      if (!existing) {
        await db.insert(userTypeRoles).values({
          userTypeId: staffType.id,
          userRoleId: salesRole.id,
          createdAt,
        })
      }
    }

    const companies = await db.select().from(salesAccounts).limit(1)
    if (companies.length === 0) {
      await db.insert(salesAccounts).values({
        name: 'Northwind Advisors',
        notes: 'Demo company for local Sales development. Not Strategic Insights data.',
        active: true,
        createdAt,
        updatedAt: createdAt,
      })
      const [account] = await db.select().from(salesAccounts).limit(1)
      const [owner] = await db.select().from(users).limit(1)
      if (account && owner) {
        await db.insert(salesContacts).values([
          {
            accountId: account.id,
            firstName: 'Alex',
            lastName: 'Rivera',
            email: 'alex@northwind.example',
            phone: '555-0100',
            title: 'Managing Partner',
            createdAt,
            updatedAt: createdAt,
          },
          {
            accountId: account.id,
            firstName: 'Jordan',
            lastName: 'Chen',
            email: 'jordan@northwind.example',
            phone: '555-0101',
            title: 'Operations Lead',
            createdAt,
            updatedAt: createdAt,
          },
        ])
        const [contact] = await db.select().from(salesContacts).limit(1)
        await db.insert(salesOpportunities).values({
          accountId: account.id,
          primaryContactId: contact?.id ?? null,
          name: 'Advisory retainer',
          amountCents: 1200000,
          stage: 'proposal_quote',
          ownerUserId: owner.id,
          notes: 'Demo one-time estimated value. MRR waits for Slice B.',
          createdAt,
          updatedAt: createdAt,
        })
        const [opportunity] = await db.select().from(salesOpportunities).limit(1)
        await db.insert(salesActivities).values({
          accountId: account.id,
          contactId: contact?.id ?? null,
          opportunityId: opportunity?.id ?? null,
          ownerUserId: owner.id,
          type: 'call',
          status: 'open',
          description: 'Schedule discovery call',
          dueAt: new Date(utcNowMs() + 86_400_000),
          completedAt: null,
          createdAt,
          updatedAt: createdAt,
        })
        await db.insert(salesLeads).values({
          displayName: 'Casey Morgan',
          email: 'casey@example.com',
          phone: '555-0199',
          stage: 'new',
          ownerUserId: owner.id,
          createdAt,
          updatedAt: createdAt,
        })
      }
    }
  } finally {
    client.close()
  }
}

const invoked = process.argv[1]?.replaceAll('\\', '/').endsWith('/drizzle/seed.ts')
if (invoked) {
  seedDatabase().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
