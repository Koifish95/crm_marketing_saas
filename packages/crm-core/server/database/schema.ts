import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  username: text('username').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  passwordHash: text('password_hash'),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
  sessionVersion: integer('session_version').notNull().default(0),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp_ms' }),
  userTypeId: integer('user_type_id').references(() => userTypes.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('users_email_unique').on(table.email),
  uniqueIndex('users_username_unique').on(table.username),
  index('users_user_type_id_idx').on(table.userTypeId),
])

export const userTypes = sqliteTable('user_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  coarseRole: text('coarse_role').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('user_types_code_unique').on(table.code),
])

export const userRoles = sqliteTable('user_roles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('user_roles_code_unique').on(table.code),
])

export const userTypeRoles = sqliteTable('user_type_roles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userTypeId: integer('user_type_id').notNull().references(() => userTypes.id),
  userRoleId: integer('user_role_id').notNull().references(() => userRoles.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('user_type_roles_pair_unique').on(table.userTypeId, table.userRoleId),
  index('user_type_roles_user_type_id_idx').on(table.userTypeId),
  index('user_type_roles_user_role_id_idx').on(table.userRoleId),
])

export const userRoleAccessRights = sqliteTable('user_role_access_rights', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userRoleId: integer('user_role_id').notNull().references(() => userRoles.id),
  accessRight: text('access_right').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('user_role_access_rights_pair_unique').on(table.userRoleId, table.accessRight),
  index('user_role_access_rights_user_role_id_idx').on(table.userRoleId),
])

export const userRoleAssignments = sqliteTable('user_role_assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  userRoleId: integer('user_role_id').notNull().references(() => userRoles.id),
  createdByUserId: integer('created_by_user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('user_role_assignments_pair_unique').on(table.userId, table.userRoleId),
  index('user_role_assignments_user_id_idx').on(table.userId),
  index('user_role_assignments_user_role_id_idx').on(table.userRoleId),
])

export const securityEvents = sqliteTable('security_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  action: text('action').notNull(),
  result: text('result').notNull(),
  actorUserId: integer('actor_user_id').references(() => users.id),
  targetUserId: integer('target_user_id').references(() => users.id),
  ip: text('ip'),
  userAgent: text('user_agent'),
  metadata: text('metadata'),
}, table => [
  index('security_events_created_at_idx').on(table.createdAt),
  index('security_events_action_idx').on(table.action),
  index('security_events_actor_user_id_idx').on(table.actorUserId),
  index('security_events_target_user_id_idx').on(table.targetUserId),
])

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  updatedByUserId: integer('updated_by_user_id').references(() => users.id),
})
