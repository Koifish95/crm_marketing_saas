import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  displayName: text('display_name').notNull(),
  industryTemplate: text('industry_template').notNull(),
  timezone: text('timezone').notNull(),
  adminEmail: text('admin_email').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [
  uniqueIndex('customers_slug_unique').on(table.slug),
])

export const hostingNodes = sqliteTable('hosting_nodes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind').notNull(),
  driver: text('driver').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [
  uniqueIndex('hosting_nodes_name_unique').on(table.name),
])

export const environments = sqliteTable('environments', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  hostingNodeId: text('hosting_node_id').notNull().references(() => hostingNodes.id),
  type: text('type').notNull(),
  displayName: text('display_name').notNull(),
  slug: text('slug').notNull(),
  containerName: text('container_name').notNull(),
  composeProject: text('compose_project').notNull(),
  composeFile: text('compose_file').notNull(),
  envFileLocal: text('env_file_local').notNull(),
  envFileExample: text('env_file_example').notNull(),
  healthUrl: text('health_url').notNull(),
  accessUrl: text('access_url').notNull(),
  sqliteVolume: text('sqlite_volume').notNull(),
  assetsVolume: text('assets_volume').notNull(),
  expectedImage: text('expected_image').notNull(),
  isolationMarker: text('isolation_marker').notNull(),
  hostPort: integer('host_port').notNull(),
  lifecycleStatus: text('lifecycle_status').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [
  uniqueIndex('environments_slug_unique').on(table.slug),
  uniqueIndex('environments_container_unique').on(table.containerName),
  index('environments_customer_id_idx').on(table.customerId),
])

export const environmentBackups = sqliteTable('environment_backups', {
  id: text('id').primaryKey(),
  environmentId: text('environment_id').notNull().references(() => environments.id),
  customerId: text('customer_id').notNull(),
  createdAt: text('created_at').notNull(),
  bytes: integer('bytes').notNull(),
  zipPath: text('zip_path').notNull(),
  sqliteFilename: text('sqlite_filename').notNull(),
  offhostPath: text('offhost_path'),
  offhostCopiedAt: text('offhost_copied_at'),
  previousExpectedImage: text('previous_expected_image'),
}, table => [
  index('environment_backups_environment_id_idx').on(table.environmentId),
])
