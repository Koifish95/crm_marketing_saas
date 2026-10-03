import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  displayName: text('display_name').notNull(),
  industryTemplate: text('industry_template').notNull(),
  timezone: text('timezone').notNull(),
  adminEmail: text('admin_email').notNull(),
  status: text('status').notNull().default('active'),
  deactivatedAt: text('deactivated_at'),
  deactivatedNote: text('deactivated_note'),
  reactivatedAt: text('reactivated_at'),
  createdAt: text('created_at').notNull(),
}, table => [
  uniqueIndex('customers_slug_unique').on(table.slug),
])

export const productInstances = sqliteTable('product_instances', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  productId: text('product_id').notNull(),
  displayName: text('display_name').notNull(),
  slug: text('slug').notNull(),
  status: text('status').notNull().default('active'),
  deactivatedAt: text('deactivated_at'),
  deactivatedNote: text('deactivated_note'),
  reactivatedAt: text('reactivated_at'),
  createdAt: text('created_at').notNull(),
}, table => [
  uniqueIndex('product_instances_customer_product_unique').on(table.customerId, table.productId),
  uniqueIndex('product_instances_customer_slug_unique').on(table.customerId, table.slug),
  index('product_instances_customer_id_idx').on(table.customerId),
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
  productInstanceId: text('product_instance_id').notNull().references(() => productInstances.id),
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
  provisionError: text('provision_error'),
  publicHostname: text('public_hostname'),
  archivedAt: text('archived_at'),
  archiveNote: text('archive_note'),
  finalBackupId: text('final_backup_id'),
  finalReleaseId: text('final_release_id'),
  finalSchemaVersion: text('final_schema_version'),
  finalExpectedImage: text('final_expected_image'),
  formerPublicHostname: text('former_public_hostname'),
  dataRemovedAt: text('data_removed_at'),
  createdAt: text('created_at').notNull(),
}, table => [
  uniqueIndex('environments_slug_unique').on(table.slug),
  uniqueIndex('environments_container_unique').on(table.containerName),
  uniqueIndex('environments_public_hostname_unique').on(table.publicHostname),
  index('environments_customer_id_idx').on(table.customerId),
  index('environments_product_instance_id_idx').on(table.productInstanceId),
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

export const operatorEvents = sqliteTable('operator_events', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  action: text('action').notNull(),
  customerId: text('customer_id'),
  productInstanceId: text('product_instance_id'),
  environmentId: text('environment_id'),
  summary: text('summary').notNull(),
  detail: text('detail'),
}, table => [
  index('operator_events_created_at_idx').on(table.createdAt),
  index('operator_events_customer_id_idx').on(table.customerId),
  index('operator_events_environment_id_idx').on(table.environmentId),
])

export const qaRuns = sqliteTable('qa_runs', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  productInstanceId: text('product_instance_id').references(() => productInstances.id),
  environmentId: text('environment_id').references(() => environments.id),
  environmentType: text('environment_type').notNull(),
  baseUrl: text('base_url').notNull(),
  buildVersion: text('build_version'),
  status: text('status').notNull(),
  trigger: text('trigger').notNull().default('manual'),
  browser: text('browser'),
  viewport: text('viewport'),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  errorSummary: text('error_summary'),
  createdAt: text('created_at').notNull(),
}, table => [
  index('qa_runs_product_id_idx').on(table.productId),
  index('qa_runs_environment_id_idx').on(table.environmentId),
  index('qa_runs_started_at_idx').on(table.startedAt),
])

export const qaRunWorkflows = sqliteTable('qa_run_workflows', {
  id: text('id').primaryKey(),
  qaRunId: text('qa_run_id').notNull().references(() => qaRuns.id),
  name: text('name').notNull(),
  status: text('status').notNull(),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  errorSummary: text('error_summary'),
  routes: text('routes'),
}, table => [
  index('qa_run_workflows_run_id_idx').on(table.qaRunId),
])

export const qaFindings = sqliteTable('qa_findings', {
  id: text('id').primaryKey(),
  qaRunId: text('qa_run_id').notNull().references(() => qaRuns.id),
  productId: text('product_id').notNull(),
  environmentId: text('environment_id').references(() => environments.id),
  route: text('route'),
  workflow: text('workflow'),
  category: text('category').notNull(),
  severity: text('severity').notNull(),
  status: text('status').notNull().default('NEW'),
  title: text('title').notNull(),
  observation: text('observation').notNull(),
  expectedBehavior: text('expected_behavior'),
  reproductionSteps: text('reproduction_steps'),
  suggestedRemediation: text('suggested_remediation'),
  detectionMethod: text('detection_method').notNull(),
  confidence: text('confidence'),
  rationale: text('rationale'),
  consoleContext: text('console_context'),
  networkContext: text('network_context'),
  duplicateOfFindingId: text('duplicate_of_finding_id'),
  reviewedAt: text('reviewed_at'),
  reviewNote: text('review_note'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, table => [
  index('qa_findings_run_id_idx').on(table.qaRunId),
  index('qa_findings_status_idx').on(table.status),
  index('qa_findings_category_idx').on(table.category),
  index('qa_findings_severity_idx').on(table.severity),
])

export const qaEvidence = sqliteTable('qa_evidence', {
  id: text('id').primaryKey(),
  qaRunId: text('qa_run_id').notNull().references(() => qaRuns.id),
  findingId: text('finding_id').references(() => qaFindings.id),
  kind: text('kind').notNull(),
  storageKey: text('storage_key').notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  bytes: integer('bytes').notNull(),
  sha256: text('sha256').notNull(),
  route: text('route'),
  metadata: text('metadata'),
  createdAt: text('created_at').notNull(),
}, table => [
  uniqueIndex('qa_evidence_storage_key_unique').on(table.storageKey),
  index('qa_evidence_run_id_idx').on(table.qaRunId),
  index('qa_evidence_finding_id_idx').on(table.findingId),
])

export const tickets = sqliteTable('tickets', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  source: text('source').notNull(),
  category: text('category').notNull(),
  status: text('status').notNull().default('NEW'),
  priority: text('priority').notNull().default('MEDIUM'),
  severity: text('severity'),
  assignee: text('assignee'),
  customerId: text('customer_id').references(() => customers.id),
  productId: text('product_id'),
  productInstanceId: text('product_instance_id').references(() => productInstances.id),
  environmentId: text('environment_id').references(() => environments.id),
  resolution: text('resolution'),
  resolvedAt: text('resolved_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, table => [
  uniqueIndex('tickets_key_unique').on(table.key),
  index('tickets_status_idx').on(table.status),
  index('tickets_source_idx').on(table.source),
  index('tickets_category_idx').on(table.category),
  index('tickets_priority_idx').on(table.priority),
  index('tickets_customer_id_idx').on(table.customerId),
  index('tickets_environment_id_idx').on(table.environmentId),
  index('tickets_updated_at_idx').on(table.updatedAt),
])

export const ticketComments = sqliteTable('ticket_comments', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id').notNull().references(() => tickets.id),
  author: text('author').notNull(),
  body: text('body').notNull(),
  visibility: text('visibility').notNull().default('INTERNAL'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, table => [
  index('ticket_comments_ticket_id_idx').on(table.ticketId),
])

export const ticketActivity = sqliteTable('ticket_activity', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id').notNull().references(() => tickets.id),
  action: text('action').notNull(),
  actor: text('actor').notNull(),
  detail: text('detail'),
  createdAt: text('created_at').notNull(),
}, table => [
  index('ticket_activity_ticket_id_idx').on(table.ticketId),
  index('ticket_activity_created_at_idx').on(table.createdAt),
])

export const ticketAttachments = sqliteTable('ticket_attachments', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id').notNull().references(() => tickets.id),
  evidenceId: text('evidence_id').references(() => qaEvidence.id),
  label: text('label').notNull(),
  externalUrl: text('external_url'),
  createdAt: text('created_at').notNull(),
}, table => [
  index('ticket_attachments_ticket_id_idx').on(table.ticketId),
])

export const ticketRelations = sqliteTable('ticket_relations', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id').notNull().references(() => tickets.id),
  relatedTicketId: text('related_ticket_id').notNull().references(() => tickets.id),
  relationType: text('relation_type').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [
  uniqueIndex('ticket_relations_unique').on(table.ticketId, table.relatedTicketId, table.relationType),
])

export const findingTicketLinks = sqliteTable('finding_ticket_links', {
  id: text('id').primaryKey(),
  findingId: text('finding_id').notNull().references(() => qaFindings.id),
  ticketId: text('ticket_id').notNull().references(() => tickets.id),
  linkType: text('link_type').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [
  uniqueIndex('finding_ticket_links_unique').on(table.findingId, table.ticketId),
  index('finding_ticket_links_ticket_id_idx').on(table.ticketId),
])
