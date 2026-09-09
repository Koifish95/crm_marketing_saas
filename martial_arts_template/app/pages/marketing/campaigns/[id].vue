<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { centsToDollarString, dollarsToCents } from '#shared/utils/money'
import { campaignLeadsPath, campaignStaffPath, friendlyTrackingPath, trackingPath } from '#shared/utils/campaign'
import { contentStaffPath } from '#shared/utils/content'
import { assetStaffPath } from '#shared/utils/asset'
import { leadStaffPath } from '#shared/utils/lead'
import { marketingTaskStaffPath } from '#shared/utils/task'
import {
  CAMPAIGN_STATUSES,
  MARKETING_TASK_TYPES,
  campaignKindLabel,
  campaignStatusLabel,
  campaignStatusTone,
  contentStatusLabel,
  dueStateLabel,
  dueStateTone,
  householdDisplayStatus,
  marketingTaskTypeLabel,
  personName,
  taskStatusLabel,
} from '#shared/utils/labels'
import { firstQueryValue, mergeRouteQuery } from '#shared/utils/record-workspace'
import { datetimeLocalFromUnknown, datetimeLocalValueToIso, toBusinessDate, toBusinessDateTime } from '#shared/utils/time'
import type { CampaignStatus, MarketingTaskType } from '#shared/schemas/enums'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'marketing'],
})

interface Person {
  id: number
  displayName: string
}

interface TrackingLink {
  id: number
  code: string
  publicSlug: string
  label: string
  isDefault: boolean
  destinationPath?: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
}

interface CampaignRow {
  id: number
  name: string
  slug: string
  kind: 'ORGANIC' | 'PAID'
  status: CampaignStatus
  budgetCents: number | null
  description: string | null
  channel: string | null
  objective: string | null
  offer: string | null
  targetAudience: string | null
  notes: string | null
  ownerUserId: number | null
  startsAt: string | Date | null
  endsAt: string | Date | null
  actualStartsAt: string | Date | null
  actualEndsAt: string | Date | null
  owner?: Person | null
  collaborators: Array<{ userId: number, user?: Person | null }>
  programs: Array<{ programId: number, program?: { name: string } | null }>
  trackingLinks: TrackingLink[]
  leads: Array<{
    id: number
    firstName: string
    lastName: string | null
    status: string
    createdAt?: string | Date
    lines?: Array<{ id: number, status: string }>
  }>
}

interface CampaignSummary {
  id: number
  name: string
  status: CampaignStatus
}

interface ContentListRow {
  id: number
  title: string
  status: string
}

interface TaskListRow {
  id: number
  title: string
  status: string
  dueAt: string | Date
  dueState?: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' | null
  assignee?: { displayName: string } | null
}

interface AssetListRow {
  id: number
  displayName: string
  campaignId: number | null
  archived: boolean
}

interface EventListRow {
  id: number
  title: string
  slug: string
  status: string
}

interface CampaignPerformance {
  plannedBudgetCents: number | null
  plannedBudgetSource: string
  metaSpendCents: number
  metaSpendSource: string
  mapped: boolean
  mappedMetaCampaigns: Array<{ id: number, name: string, externalId: string }>
  attributed: {
    source: string
    households: number
    prospectiveMembers: number
    trialsScheduled: number
    trialsAttended: number
    joined: number
    acquiredMrrCents: number
  }
  eventRegistrationCount: number
  eventRegistrationSource: string
  notes: { meta: string, crm: string, attributed: string }
}

const route = useRoute()
const campaignId = computed(() => Number(route.params.id))

const { data: me } = await useFetch<{ user?: { role: string }, accessRights?: string[] }>('/api/auth/me')
const canManage = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('MANAGE_CAMPAIGNS')))
const canManageContent = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('MANAGE_CONTENT')))
const canManageTasks = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('MANAGE_MARKETING_TASKS')))
const canManageAssets = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('MANAGE_ASSETS')))
const canManageEvents = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('MANAGE_ACQUISITION_EVENTS')))
const canViewMarketing = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('VIEW_MARKETING')))
const canViewReports = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('VIEW_MARKETING_REPORTS')))

const router = useRouter()
const errorMessage = ref('')
const saveNotice = ref('')
const saveError = ref('')
const copied = ref('')
const copyConfirmOpen = ref(false)
const pendingCopyLink = ref<TrackingLink | null>(null)
const overviewEditing = ref(false)
const moreOpen = ref(false)
const cancelConfirmOpen = ref(false)
const addCollaboratorId = ref('')
const extraLabel = ref('')
const extraSlug = ref('')
const extraPath = ref('/trial')
const editingLink = ref<TrackingLink | null>(null)
const editLinkForm = reactive({
  label: '',
  publicSlug: '',
})
const editLinkPending = ref(false)
const newContentTitle = ref('')
const newEventTitle = ref('')
const attachAssetId = ref('')
const assetFileInput = ref<HTMLInputElement | null>(null)
const assetDisplayName = ref('')
const taskForm = reactive({
  title: '',
  type: 'OTHER' as MarketingTaskType,
  dueAt: '',
  assigneeUserId: '' as string | number,
})
const { data: campaign, refresh, pending, error } = await useFetch<CampaignRow>(
  () => `/api/marketing/campaigns/${campaignId.value}`,
)
const { data: summaries, pending: summariesPending } = await useFetch<CampaignSummary[]>('/api/marketing/campaigns')
const { data: people } = await useFetch<Person[]>('/api/users')
const { data: programs } = await useFetch<Array<{ id: number, name: string }>>('/api/programs')
const { data: contentItems } = await useFetch<ContentListRow[]>('/api/marketing/content', {
  query: computed(() => (Number.isInteger(campaignId.value) ? { campaignId: campaignId.value } : {})),
})
const { data: campaignTasks } = await useFetch<TaskListRow[]>('/api/marketing/tasks', {
  query: computed(() => (Number.isInteger(campaignId.value) ? { view: 'all', campaignId: campaignId.value } : { view: 'all' })),
})
const { data: campaignAssets, refresh: refreshAssets } = await useFetch<AssetListRow[]>('/api/marketing/assets', {
  query: computed(() => (Number.isInteger(campaignId.value) ? { campaignId: campaignId.value } : {})),
})
const { data: libraryAssets } = await useFetch<AssetListRow[]>('/api/marketing/assets')
const { data: campaignEvents } = await useFetch<EventListRow[]>('/api/marketing/events', {
  query: computed(() => (Number.isInteger(campaignId.value) ? { campaignId: campaignId.value } : {})),
})
const { data: performance, error: performanceError, refresh: refreshPerformance } = await useFetch<CampaignPerformance>(
  () => `/api/marketing/campaigns/${campaignId.value}/performance`,
  { immediate: false },
)

watch(
  [canViewReports, campaignId],
  ([allowed, id]) => {
    if (allowed && Number.isInteger(id) && id > 0) {
      void refreshPerformance()
    }
  },
  { immediate: true },
)

useHead({
  title: computed(() => campaign.value?.name || 'Campaign'),
})

const campaignTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'content', label: 'Content' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'assets', label: 'Assets' },
  { id: 'tracking', label: 'Tracking' },
  { id: 'events', label: 'Events' },
  { id: 'performance', label: 'Performance' },
]

const selectorItems = computed(() => (summaries.value ?? []).map(row => ({
  id: row.id,
  label: row.name,
  badge: campaignStatusLabel(row.status),
  badgeTone: campaignStatusTone(row.status),
})))

function campaignRecordTo(id: number): RouteLocationRaw {
  return {
    path: campaignStaffPath(id),
    query: route.query,
  }
}

const edit = reactive({
  name: '',
  kind: 'ORGANIC' as 'ORGANIC' | 'PAID',
  status: 'DRAFT' as CampaignStatus,
  budget: '',
  channel: '',
  description: '',
  objective: '',
  offer: '',
  targetAudience: '',
  notes: '',
  ownerUserId: '' as string | number,
  startsAt: '',
  endsAt: '',
  actualStartsAt: '',
  actualEndsAt: '',
  collaboratorUserIds: [] as number[],
  programIds: [] as number[],
})

function applyCampaignToEdit(row: CampaignRow) {
  edit.name = row.name
  edit.kind = row.kind
  edit.status = row.status
  edit.budget = row.budgetCents != null ? centsToDollarString(row.budgetCents) : ''
  edit.channel = row.channel ?? ''
  edit.description = row.description ?? ''
  edit.objective = row.objective ?? ''
  edit.offer = row.offer ?? ''
  edit.targetAudience = row.targetAudience ?? ''
  edit.notes = row.notes ?? ''
  edit.ownerUserId = row.ownerUserId ?? ''
  edit.startsAt = datetimeLocalFromUnknown(row.startsAt)
  edit.endsAt = datetimeLocalFromUnknown(row.endsAt)
  edit.actualStartsAt = datetimeLocalFromUnknown(row.actualStartsAt)
  edit.actualEndsAt = datetimeLocalFromUnknown(row.actualEndsAt)
  edit.collaboratorUserIds = row.collaborators.map(item => item.userId)
  edit.programIds = row.programs.map(item => item.programId)
}

watch(campaign, (row) => {
  if (!row || overviewEditing.value) {
    return
  }
  applyCampaignToEdit(row)
}, { immediate: true })

watch(campaignId, () => {
  overviewEditing.value = false
  moreOpen.value = false
  saveNotice.value = ''
  saveError.value = ''
})

function apiError(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string }, message?: string }
  return err.data?.message || err.message || fallback
}

function publicUrl(link: TrackingLink) {
  const path = link.publicSlug ? friendlyTrackingPath(link) : trackingPath(link)
  if (!import.meta.client) {
    return path
  }
  return `${window.location.origin}${path}`
}

function rawTrackingUrl(link: TrackingLink) {
  if (!import.meta.client) {
    return trackingPath(link)
  }
  return `${window.location.origin}${trackingPath(link)}`
}

function defaultLink(row: CampaignRow) {
  return row.trackingLinks.find(link => link.isDefault) ?? row.trackingLinks[0] ?? null
}

function attributedHouseholds(row: CampaignRow) {
  return [...(row.leads ?? [])].sort((left, right) => {
    const leftAt = left.createdAt ? new Date(left.createdAt).getTime() : 0
    const rightAt = right.createdAt ? new Date(right.createdAt).getTime() : 0
    return rightAt - leftAt
  })
}

function toggleMulti(list: number[], id: number) {
  return list.includes(id) ? list.filter(item => item !== id) : [...list, id]
}

function eventStatusLabel(status: string) {
  if (status === 'DRAFT') {
    return 'Draft'
  }
  if (status === 'PUBLISHED') {
    return 'Published'
  }
  if (status === 'COMPLETED') {
    return 'Completed'
  }
  return 'Cancelled'
}

function whenLabel(value: string | Date | null | undefined) {
  if (!value) {
    return '—'
  }
  return toBusinessDateTime(new Date(value).getTime())
}

function dateOnlyLabel(value: string | Date | null | undefined) {
  if (!value) {
    return ''
  }
  return toBusinessDate(new Date(value).getTime())
}

function dateRangeLabel(start: string | Date | null | undefined, end: string | Date | null | undefined, openEnd = 'Present') {
  const from = dateOnlyLabel(start)
  const to = dateOnlyLabel(end)
  if (!from && !to) {
    return ''
  }
  if (from && to) {
    return `${from} – ${to}`
  }
  if (from) {
    return `${from} – ${openEnd}`
  }
  return to
}

function displayValue(value: string | null | undefined) {
  const text = value?.trim()
  return text || 'Not set'
}

function budgetSummary(cents: number | null | undefined) {
  if (cents == null) {
    return 'No planned budget'
  }
  return `$${centsToDollarString(cents)} planned`
}

function campaignSectionTo(tab: string): RouteLocationRaw {
  return {
    path: campaignStaffPath(campaignId.value),
    query: mergeRouteQuery(route.query, { tab }),
  }
}

const headerDateRange = computed(() => {
  const row = campaign.value
  if (!row) {
    return ''
  }
  return dateRangeLabel(row.startsAt, row.endsAt, 'open')
})

const programSummary = computed(() => {
  const names = (campaign.value?.programs ?? [])
    .map(item => item.program?.name)
    .filter((name): name is string => Boolean(name))
  return names.length ? names.join(' · ') : 'Not set'
})

const collaboratorNames = computed(() => {
  return (campaign.value?.collaborators ?? [])
    .map(item => item.user?.displayName)
    .filter((name): name is string => Boolean(name))
})

const openTaskCount = computed(() => (campaignTasks.value ?? []).filter(task => task.status === 'PENDING').length)

const joinedLineCount = computed(() => {
  return (campaign.value?.leads ?? []).reduce((total, household) => {
    return total + (household.lines ?? []).filter(line => line.status === 'JOINED').length
  }, 0)
})

const trackingSummary = computed(() => {
  const link = campaign.value ? defaultLink(campaign.value) : null
  if (!link) {
    return 'No tracking link'
  }
  return 'Default link ready'
})

const defaultPublicUrl = computed(() => {
  const row = campaign.value
  if (!row) {
    return ''
  }
  const link = defaultLink(row)
  return link ? publicUrl(link) : ''
})

const availableCollaborators = computed(() => {
  const selected = new Set(edit.collaboratorUserIds)
  return (people.value ?? []).filter(person => !selected.has(person.id))
})

function personNameById(id: number) {
  return (people.value ?? []).find(person => person.id === id)?.displayName || `User ${id}`
}

function addCollaborator() {
  const id = Number(addCollaboratorId.value)
  addCollaboratorId.value = ''
  if (!Number.isInteger(id) || id < 1 || edit.collaboratorUserIds.includes(id)) {
    return
  }
  edit.collaboratorUserIds = [...edit.collaboratorUserIds, id]
}

function removeCollaborator(id: number) {
  edit.collaboratorUserIds = edit.collaboratorUserIds.filter(item => item !== id)
}

async function startEdit() {
  if (!campaign.value || !canManage.value) {
    return
  }
  applyCampaignToEdit(campaign.value)
  overviewEditing.value = true
  saveNotice.value = ''
  saveError.value = ''
  moreOpen.value = false
  const currentTab = firstQueryValue(route.query.tab)
  if (currentTab && currentTab !== 'overview') {
    await router.replace({
      query: mergeRouteQuery(route.query, { tab: 'overview' }),
    })
  }
}

function discardEdit() {
  if (campaign.value) {
    applyCampaignToEdit(campaign.value)
  }
  overviewEditing.value = false
  saveError.value = ''
}

async function patchStatus(status: CampaignStatus) {
  if (!campaign.value || !canManage.value) {
    return
  }
  errorMessage.value = ''
  saveError.value = ''
  try {
    await $fetch(`/api/admin/campaigns/${campaign.value.id}`, {
      method: 'PATCH',
      body: { status },
    })
    await refresh()
    saveNotice.value = `Status set to ${campaignStatusLabel(status)}.`
  } catch (caught) {
    saveError.value = apiError(caught, 'Could not update campaign status.')
  }
}

async function confirmCancelCampaign() {
  cancelConfirmOpen.value = false
  await patchStatus('CANCELLED')
}

async function copyLink(link: TrackingLink) {
  await navigator.clipboard.writeText(publicUrl(link))
  copied.value = link.isDefault ? 'Copied the default tracking link.' : 'Copied the tracking link.'
}

function requestCopy(link: TrackingLink) {
  if (campaign.value?.status === 'ACTIVE') {
    void copyLink(link)
    return
  }
  pendingCopyLink.value = link
  copyConfirmOpen.value = true
}

async function confirmPendingCopy() {
  if (pendingCopyLink.value) {
    await copyLink(pendingCopyLink.value)
  }
  pendingCopyLink.value = null
}

function copyDefault() {
  const link = campaign.value ? defaultLink(campaign.value) : null
  if (!link) {
    errorMessage.value = 'This campaign does not have a tracking link yet.'
    return
  }
  requestCopy(link)
}

async function save() {
  if (!campaign.value || !canManage.value) {
    return
  }
  errorMessage.value = ''
  saveNotice.value = ''
  saveError.value = ''
  try {
    await $fetch(`/api/admin/campaigns/${campaign.value.id}`, {
      method: 'PATCH',
      body: {
        name: edit.name,
        kind: edit.kind,
        status: edit.status,
        budgetCents: edit.budget.trim() ? dollarsToCents(edit.budget.trim()) : null,
        channel: edit.channel || null,
        description: edit.description || null,
        objective: edit.objective || null,
        offer: edit.offer || null,
        targetAudience: edit.targetAudience || null,
        notes: edit.notes || null,
        ownerUserId: edit.ownerUserId === '' ? null : Number(edit.ownerUserId),
        startsAt: datetimeLocalValueToIso(edit.startsAt),
        endsAt: datetimeLocalValueToIso(edit.endsAt),
        actualStartsAt: datetimeLocalValueToIso(edit.actualStartsAt),
        actualEndsAt: datetimeLocalValueToIso(edit.actualEndsAt),
        collaboratorUserIds: edit.collaboratorUserIds,
        programIds: edit.programIds,
      },
    })
    await refresh()
    overviewEditing.value = false
    if (campaign.value) {
      applyCampaignToEdit(campaign.value)
    }
    saveNotice.value = 'Saved.'
  } catch (caught) {
    saveError.value = apiError(caught, 'Could not save that campaign.')
  }
}

async function addLink() {
  if (!campaign.value || !canManage.value) {
    return
  }
  errorMessage.value = ''
  try {
    await $fetch(`/api/admin/campaigns/${campaign.value.id}/tracking-links`, {
      method: 'POST',
      body: {
        label: extraLabel.value || 'Extra link',
        publicSlug: extraSlug.value || undefined,
        destinationPath: extraPath.value || '/trial',
      },
    })
    extraLabel.value = ''
    extraSlug.value = ''
    extraPath.value = '/trial'
    await refresh()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not add that tracking link.')
  }
}

function startEditLink(link: TrackingLink) {
  editingLink.value = link
  editLinkForm.label = link.label
  editLinkForm.publicSlug = link.publicSlug
}

function cancelEditLink() {
  editingLink.value = null
}

async function saveEditLink() {
  if (!campaign.value || !editingLink.value || !canManage.value) {
    return
  }
  errorMessage.value = ''
  editLinkPending.value = true
  try {
    await $fetch(`/api/admin/campaigns/${campaign.value.id}/tracking-links/${editingLink.value.id}`, {
      method: 'PATCH',
      body: {
        label: editLinkForm.label,
        publicSlug: editLinkForm.publicSlug,
      },
    })
    editingLink.value = null
    await refresh()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not save that tracking link.')
  } finally {
    editLinkPending.value = false
  }
}

async function addContent() {
  if (!campaign.value || !canManageContent.value) {
    return
  }
  errorMessage.value = ''
  try {
    const created = await $fetch<{ id: number }>('/api/marketing/content', {
      method: 'POST',
      body: {
        title: newContentTitle.value,
        campaignId: campaign.value.id,
        channels: ['FACEBOOK', 'INSTAGRAM'],
        status: 'IDEA',
      },
    })
    newContentTitle.value = ''
    await navigateTo(contentStaffPath(created.id, { campaignId: campaign.value.id }))
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not create that content.')
  }
}

async function addTask() {
  if (!campaign.value || !canManageTasks.value) {
    return
  }
  const dueAt = datetimeLocalValueToIso(taskForm.dueAt)
  if (!dueAt) {
    errorMessage.value = 'Choose a due date and time.'
    return
  }
  errorMessage.value = ''
  try {
    const created = await $fetch<{ id: number }>('/api/marketing/tasks', {
      method: 'POST',
      body: {
        title: taskForm.title,
        type: taskForm.type,
        dueAt,
        assigneeUserId: taskForm.assigneeUserId === '' ? undefined : Number(taskForm.assigneeUserId),
        campaignId: campaign.value.id,
      },
    })
    taskForm.title = ''
    taskForm.type = 'OTHER'
    taskForm.dueAt = ''
    taskForm.assigneeUserId = ''
    await navigateTo({
      path: marketingTaskStaffPath(created.id),
      query: route.query,
    })
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not create that marketing task.')
  }
}

async function uploadCampaignAsset() {
  if (!campaign.value || !canManageAssets.value) {
    return
  }
  const file = assetFileInput.value?.files?.[0]
  if (!file) {
    errorMessage.value = 'Choose a file.'
    return
  }
  errorMessage.value = ''
  const body = new FormData()
  body.append('file', file)
  body.append('displayName', assetDisplayName.value || file.name)
  body.append('campaignId', String(campaign.value.id))
  try {
    await $fetch('/api/marketing/assets', { method: 'POST', body })
    assetDisplayName.value = ''
    if (assetFileInput.value) {
      assetFileInput.value.value = ''
    }
    await refreshAssets()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not upload that asset.')
  }
}

async function linkLibraryAsset() {
  if (!campaign.value || !canManageAssets.value) {
    return
  }
  if (!attachAssetId.value) {
    errorMessage.value = 'Choose a library asset to link.'
    return
  }
  errorMessage.value = ''
  try {
    await $fetch(`/api/marketing/assets/${attachAssetId.value}/attach`, {
      method: 'POST',
      body: { campaignId: campaign.value.id },
    })
    attachAssetId.value = ''
    await refreshAssets()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not link that asset.')
  }
}

async function addEvent() {
  if (!campaign.value || !canManageEvents.value) {
    return
  }
  errorMessage.value = ''
  try {
    const created = await $fetch<{ id: number }>('/api/marketing/events', {
      method: 'POST',
      body: {
        title: newEventTitle.value,
        campaignId: campaign.value.id,
        status: 'DRAFT',
      },
    })
    newEventTitle.value = ''
    await navigateTo({
      path: `/marketing/events/${created.id}`,
      query: route.query,
    })
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not create that event.')
  }
}

const linkableAssets = computed(() => {
  const currentIds = new Set((campaignAssets.value ?? []).map(asset => asset.id))
  return (libraryAssets.value ?? []).filter(asset => !asset.archived && !currentIds.has(asset.id))
})
</script>

<template>
  <AppRecordWorkspace :loading="pending && !campaign">
    <template #toolbar>
      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink
          to="/marketing/campaigns"
          class="btn btn-secondary"
        >
          All campaigns
        </NuxtLink>
        <NuxtLink
          v-if="canManage"
          to="/marketing/campaigns/new"
          class="btn btn-primary"
        >
          New campaign
        </NuxtLink>
      </div>
    </template>

    <AppAlert v-if="errorMessage">
      {{ errorMessage }}
    </AppAlert>
    <AppAlert v-if="error && !campaign">
      Could not load that campaign.
    </AppAlert>
    <AppAlert
      v-if="copied"
      tone="success"
    >
      {{ copied }}
    </AppAlert>
    <AppAlert
      v-if="saveNotice"
      tone="success"
    >
      {{ saveNotice }}
    </AppAlert>
    <AppAlert v-if="saveError">
      {{ saveError }}
    </AppAlert>

    <AppEmpty
      v-if="!pending && !campaign"
      title="Campaign not found"
      description="That campaign is missing, or you do not have Marketing access. Use the selector to open another campaign."
    >
      <NuxtLink
        to="/marketing/campaigns"
        class="btn btn-secondary"
      >
        Back to campaigns
      </NuxtLink>
    </AppEmpty>

    <template #header>
      <AppRecordSelector
        :items="selectorItems"
        :current-id="campaignId"
        :record-to="campaignRecordTo"
        record-kind="Campaign"
        :current-label="campaign?.name"
        :current-badge="campaign ? campaignStatusLabel(campaign.status) : undefined"
        :current-badge-tone="campaign ? campaignStatusTone(campaign.status) : undefined"
        :loading="summariesPending"
        search-placeholder="Search Campaigns"
        aria-label="Select campaign"
      >
        <template
          v-if="campaign"
          #meta
        >
          <span>{{ campaignKindLabel(campaign.kind) }}</span>
          <template v-if="headerDateRange">
            <span aria-hidden="true">·</span>
            <span>{{ headerDateRange }}</span>
          </template>
          <template v-if="canViewMarketing">
            <span aria-hidden="true">·</span>
            <NuxtLink
              :to="campaignLeadsPath(campaign.id)"
              class="font-medium text-brand-700 hover:text-brand-600"
            >
              {{ campaign.leads.length }} attributed household{{ campaign.leads.length === 1 ? '' : 's' }}
            </NuxtLink>
          </template>
          <span aria-hidden="true">·</span>
          <span>{{ budgetSummary(campaign.budgetCents) }}</span>
        </template>
      </AppRecordSelector>
    </template>
    <template
      v-if="campaign"
      #actions
    >
      <AppButton
        variant="subtle"
        @click="copyDefault"
      >
        Copy campaign link
      </AppButton>
      <AppButton
        v-if="canManage && !overviewEditing"
        @click="startEdit"
      >
        Edit campaign
      </AppButton>
      <AppButton
        v-if="canManage && campaign.status !== 'CANCELLED'"
        variant="ghost"
        type="button"
        @click="moreOpen = true"
      >
        More
      </AppButton>
    </template>

    <template #tabs>
      <template v-if="campaign">
        <AppRecordTabs
          v-slot="{ active }"
          :tabs="campaignTabs"
        >
          <form
            v-if="active === 'overview' && overviewEditing && canManage"
            class="space-y-6"
            @submit.prevent="save"
          >
            <AppPanel title="Campaign details">
              <AppFieldGroup title="Identity">
                <AppField label="Name">
                  <input
                    v-model="edit.name"
                    class="control"
                  >
                </AppField>
                <AppField label="Status">
                  <select
                    v-model="edit.status"
                    class="control"
                  >
                    <option
                      v-for="item in CAMPAIGN_STATUSES"
                      :key="item"
                      :value="item"
                    >
                      {{ campaignStatusLabel(item) }}
                    </option>
                  </select>
                </AppField>
                <AppField label="Kind">
                  <select
                    v-model="edit.kind"
                    class="control"
                  >
                    <option value="ORGANIC">
                      Organic
                    </option>
                    <option value="PAID">
                      Paid
                    </option>
                  </select>
                </AppField>
                <AppField label="Primary channel">
                  <input
                    v-model="edit.channel"
                    class="control"
                  >
                </AppField>
              </AppFieldGroup>
              <AppFieldGroup title="Ownership">
                <AppField label="Owner">
                  <select
                    v-model="edit.ownerUserId"
                    class="control"
                  >
                    <option value="">
                      Unassigned
                    </option>
                    <option
                      v-for="person in people ?? []"
                      :key="person.id"
                      :value="person.id"
                    >
                      {{ person.displayName }}
                    </option>
                  </select>
                </AppField>
                <fieldset class="sm:col-span-2">
                  <legend class="mb-2 text-sm font-medium text-navy-900">
                    Collaborators
                  </legend>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="id in edit.collaboratorUserIds"
                      :key="id"
                      class="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-canvas px-3 text-sm"
                    >
                      {{ personNameById(id) }}
                      <button
                        type="button"
                        class="min-h-11 min-w-11 text-muted hover:text-navy-900"
                        :aria-label="`Remove ${personNameById(id)}`"
                        @click="removeCollaborator(id)"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                  <select
                    v-if="availableCollaborators.length"
                    v-model="addCollaboratorId"
                    class="control mt-3"
                    aria-label="Add collaborator"
                    @change="addCollaborator"
                  >
                    <option value="">
                      Add collaborator
                    </option>
                    <option
                      v-for="person in availableCollaborators"
                      :key="person.id"
                      :value="person.id"
                    >
                      {{ person.displayName }}
                    </option>
                  </select>
                  <p
                    v-else-if="!edit.collaboratorUserIds.length"
                    class="mt-2 text-sm text-muted"
                  >
                    No collaborators assigned
                  </p>
                </fieldset>
                <fieldset class="sm:col-span-2">
                  <legend class="mb-2 text-sm font-medium text-navy-900">
                    Programs
                  </legend>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="program in programs ?? []"
                      :key="program.id"
                      type="button"
                      class="min-h-11 rounded-md border px-3 text-sm"
                      :class="edit.programIds.includes(program.id)
                        ? 'border-navy-900 bg-navy-900 text-white'
                        : 'border-line bg-paper text-navy-900'"
                      :aria-pressed="edit.programIds.includes(program.id)"
                      @click="edit.programIds = toggleMulti(edit.programIds, program.id)"
                    >
                      {{ program.name }}
                    </button>
                  </div>
                </fieldset>
              </AppFieldGroup>
              <AppFieldGroup title="Campaign plan">
                <AppField label="Planned budget USD">
                  <input
                    v-model="edit.budget"
                    class="control control-short"
                  >
                </AppField>
                <AppField
                  class="sm:col-span-2"
                  label="Objective"
                >
                  <input
                    v-model="edit.objective"
                    class="control"
                  >
                </AppField>
                <AppField label="Offer">
                  <input
                    v-model="edit.offer"
                    class="control"
                  >
                </AppField>
                <AppField label="Target audience">
                  <input
                    v-model="edit.targetAudience"
                    class="control"
                  >
                </AppField>
                <AppField
                  class="sm:col-span-2"
                  label="Description"
                >
                  <textarea
                    v-model="edit.description"
                    class="control min-h-20"
                  />
                </AppField>
                <AppField
                  class="sm:col-span-2"
                  label="Notes"
                >
                  <textarea
                    v-model="edit.notes"
                    class="control min-h-20"
                  />
                </AppField>
              </AppFieldGroup>
              <AppFieldGroup title="Schedule">
                <AppField label="Planned start">
                  <input
                    v-model="edit.startsAt"
                    type="datetime-local"
                    class="control"
                  >
                </AppField>
                <AppField label="Planned end">
                  <input
                    v-model="edit.endsAt"
                    type="datetime-local"
                    class="control"
                  >
                </AppField>
                <AppField label="Actual start">
                  <input
                    v-model="edit.actualStartsAt"
                    type="datetime-local"
                    class="control"
                  >
                </AppField>
                <AppField label="Actual end">
                  <input
                    v-model="edit.actualEndsAt"
                    type="datetime-local"
                    class="control"
                  >
                </AppField>
              </AppFieldGroup>
              <p class="mt-4 text-sm text-muted">
                Planned budget is internal. Actual paid spend comes from a mapped Meta campaign when connected. $0 is valid for Organic campaigns.
              </p>
              <div class="mt-6 flex flex-wrap items-center gap-2">
                <AppButton type="submit">
                  Save changes
                </AppButton>
                <AppButton
                  variant="secondary"
                  type="button"
                  @click="discardEdit"
                >
                  Discard changes
                </AppButton>
                <AppAlert
                  v-if="saveNotice"
                  tone="success"
                  class="w-full sm:w-auto"
                >
                  {{ saveNotice }}
                </AppAlert>
                <AppAlert
                  v-if="saveError"
                  class="w-full sm:w-auto"
                >
                  {{ saveError }}
                </AppAlert>
              </div>
            </AppPanel>
          </form>

          <div
            v-else-if="active === 'overview'"
            class="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.85fr)]"
          >
            <div class="space-y-6">
              <section class="panel space-y-5 p-4 sm:p-6">
                <h2 class="font-display text-lg font-semibold text-navy-900">
                  Campaign plan
                </h2>
                <dl class="space-y-4 text-sm">
                  <div>
                    <dt class="text-muted">
                      Objective
                    </dt>
                    <dd class="mt-1 whitespace-pre-wrap text-navy-900">
                      {{ displayValue(campaign.objective) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted">
                      Offer
                    </dt>
                    <dd class="mt-1 whitespace-pre-wrap text-navy-900">
                      {{ displayValue(campaign.offer) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted">
                      Target audience
                    </dt>
                    <dd class="mt-1 whitespace-pre-wrap text-navy-900">
                      {{ displayValue(campaign.targetAudience) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted">
                      Programs
                    </dt>
                    <dd class="mt-1 text-navy-900">
                      {{ programSummary }}
                    </dd>
                  </div>
                  <div v-if="campaign.channel">
                    <dt class="text-muted">
                      Primary channel
                    </dt>
                    <dd class="mt-1 text-navy-900">
                      {{ campaign.channel }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted">
                      Description
                    </dt>
                    <dd class="mt-1 max-w-3xl whitespace-pre-wrap text-navy-900">
                      {{ displayValue(campaign.description) }}
                    </dd>
                  </div>
                </dl>
                <details
                  v-if="campaign.notes"
                  class="border-t border-line pt-4"
                >
                  <summary class="min-h-11 cursor-pointer text-sm font-medium text-navy-900">
                    Show notes
                  </summary>
                  <p class="mt-2 max-w-3xl whitespace-pre-wrap text-sm text-navy-800">
                    {{ campaign.notes }}
                  </p>
                </details>
              </section>

              <section class="panel space-y-4 p-4 sm:p-6">
                <h2 class="font-display text-lg font-semibold text-navy-900">
                  Activity
                </h2>
                <ul class="space-y-2 text-sm">
                  <li>
                    <NuxtLink
                      :to="campaignSectionTo('content')"
                      class="font-medium text-brand-700 hover:text-brand-600"
                    >
                      Content · {{ contentItems?.length ?? 0 }}
                    </NuxtLink>
                  </li>
                  <li>
                    <NuxtLink
                      :to="campaignSectionTo('tasks')"
                      class="font-medium text-brand-700 hover:text-brand-600"
                    >
                      Tasks · {{ openTaskCount }} open
                    </NuxtLink>
                  </li>
                  <li>
                    <NuxtLink
                      :to="campaignSectionTo('assets')"
                      class="font-medium text-brand-700 hover:text-brand-600"
                    >
                      Assets · {{ campaignAssets?.length ?? 0 }}
                    </NuxtLink>
                  </li>
                  <li>
                    <NuxtLink
                      :to="campaignSectionTo('events')"
                      class="font-medium text-brand-700 hover:text-brand-600"
                    >
                      Events · {{ campaignEvents?.length ?? 0 }}
                    </NuxtLink>
                  </li>
                  <li>
                    <NuxtLink
                      :to="campaignSectionTo('tracking')"
                      class="font-medium text-brand-700 hover:text-brand-600"
                    >
                      Tracking · {{ trackingSummary }}
                    </NuxtLink>
                  </li>
                  <li>
                    <NuxtLink
                      :to="campaignSectionTo('performance')"
                      class="font-medium text-brand-700 hover:text-brand-600"
                    >
                      Performance · {{ campaign.leads.length }} attributed household{{ campaign.leads.length === 1 ? '' : 's' }}
                    </NuxtLink>
                  </li>
                </ul>
                <dl class="grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt class="text-muted">
                      Attributed households
                    </dt>
                    <dd class="mt-1 font-medium text-navy-900">
                      {{ campaign.leads.length }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted">
                      Joined
                    </dt>
                    <dd class="mt-1 font-medium text-navy-900">
                      {{ joinedLineCount }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted">
                      Planned budget
                    </dt>
                    <dd class="mt-1 font-medium text-navy-900">
                      {{ budgetSummary(campaign.budgetCents) }}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>

            <div class="space-y-6">
              <section class="panel space-y-4 p-4 sm:p-6">
                <h2 class="font-display text-lg font-semibold text-navy-900">
                  Ownership
                </h2>
                <dl class="space-y-4 text-sm">
                  <div>
                    <dt class="text-muted">
                      Owner
                    </dt>
                    <dd class="mt-1 text-navy-900">
                      {{ campaign.owner?.displayName || 'Unassigned' }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted">
                      Collaborators
                    </dt>
                    <dd class="mt-1 text-navy-900">
                      <template v-if="collaboratorNames.length">
                        {{ collaboratorNames.join(', ') }}
                      </template>
                      <template v-else>
                        No collaborators assigned
                      </template>
                    </dd>
                  </div>
                </dl>
              </section>
              <section class="panel space-y-4 p-4 sm:p-6">
                <h2 class="font-display text-lg font-semibold text-navy-900">
                  Schedule
                </h2>
                <dl class="space-y-4 text-sm">
                  <div>
                    <dt class="text-muted">
                      Planned
                    </dt>
                    <dd class="mt-1 text-navy-900">
                      {{ dateRangeLabel(campaign.startsAt, campaign.endsAt, 'open') || 'Not set' }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted">
                      Actual
                    </dt>
                    <dd class="mt-1 text-navy-900">
                      {{ dateRangeLabel(campaign.actualStartsAt, campaign.actualEndsAt) || 'Not set' }}
                    </dd>
                  </div>
                </dl>
              </section>
              <section class="panel space-y-3 p-4 sm:p-6">
                <h2 class="font-display text-lg font-semibold text-navy-900">
                  Tracking
                </h2>
                <p class="text-sm text-navy-900">
                  {{ trackingSummary }}
                </p>
                <p
                  v-if="defaultPublicUrl"
                  class="break-all text-sm text-muted"
                >
                  {{ defaultPublicUrl }}
                </p>
              </section>
            </div>
          </div>

          <AppPanel
            v-else-if="active === 'content'"
            title="Content"
            description="Content Items planned for this campaign. The global queue is the same records."
          >
            <template #actions>
              <NuxtLink
                to="/marketing/content"
                class="text-sm font-medium text-brand-700 hover:text-brand-600"
              >
                Open content queue
              </NuxtLink>
            </template>
            <ul
              v-if="contentItems?.length"
              class="record-list text-sm"
            >
              <li
                v-for="item in contentItems"
                :key="item.id"
                class="record-item flex flex-wrap items-center justify-between gap-2"
              >
                <NuxtLink
                  :to="contentStaffPath(item.id, { campaignId: campaign?.id })"
                  class="font-medium text-navy-900 hover:text-brand-700"
                >
                  {{ item.title }}
                </NuxtLink>
                <span class="text-muted">
                  {{ contentStatusLabel(item.status) }}
                </span>
              </li>
            </ul>
            <p
              v-else
              class="text-sm text-muted"
            >
              No content for this campaign yet.
            </p>
            <form
              v-if="canManageContent"
              class="mt-4 grid gap-2 sm:grid-cols-3"
              @submit.prevent="addContent"
            >
              <AppField
                class="sm:col-span-2"
                label="New content title"
              >
                <input
                  v-model="newContentTitle"
                  class="control"
                  required
                >
              </AppField>
              <div class="flex items-end">
                <AppButton type="submit">
                  Add content
                </AppButton>
              </div>
            </form>
          </AppPanel>

          <AppPanel
            v-else-if="active === 'tasks'"
            title="Marketing Tasks"
            description="Campaign-scoped work. Completing a task here is the same as completing it on the queue."
          >
            <template #actions>
              <NuxtLink
                to="/marketing/tasks"
                class="text-sm font-medium text-brand-700 hover:text-brand-600"
              >
                Open task queue
              </NuxtLink>
            </template>
            <ul
              v-if="campaignTasks?.length"
              class="record-list text-sm"
            >
              <li
                v-for="task in campaignTasks"
                :key="task.id"
                class="record-item flex flex-wrap items-center justify-between gap-2"
              >
                <div class="min-w-0">
                  <NuxtLink
                    :to="marketingTaskStaffPath(task.id)"
                    class="font-medium text-navy-900 hover:text-brand-700"
                  >
                    {{ task.title }}
                  </NuxtLink>
                  <p class="text-muted">
                    {{ task.assignee?.displayName || 'Unassigned' }} · {{ whenLabel(task.dueAt) }}
                  </p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <AppBadge
                    v-if="task.dueState"
                    :tone="dueStateTone(task.dueState)"
                  >
                    {{ dueStateLabel(task.dueState) }}
                  </AppBadge>
                  <span class="text-muted">
                    {{ taskStatusLabel(task.status) }}
                  </span>
                </div>
              </li>
            </ul>
            <p
              v-else
              class="text-sm text-muted"
            >
              No marketing tasks for this campaign yet.
            </p>
            <form
              v-if="canManageTasks"
              class="mt-4 grid gap-2 sm:grid-cols-2"
              @submit.prevent="addTask"
            >
              <AppField label="Task title">
                <input
                  v-model="taskForm.title"
                  class="control"
                  required
                >
              </AppField>
              <AppField label="Type">
                <select
                  v-model="taskForm.type"
                  class="control"
                >
                  <option
                    v-for="item in MARKETING_TASK_TYPES"
                    :key="item"
                    :value="item"
                  >
                    {{ marketingTaskTypeLabel(item) }}
                  </option>
                </select>
              </AppField>
              <AppField label="Due">
                <input
                  v-model="taskForm.dueAt"
                  type="datetime-local"
                  class="control"
                  required
                >
              </AppField>
              <AppField label="Assignee">
                <select
                  v-model="taskForm.assigneeUserId"
                  class="control"
                >
                  <option value="">
                    Unassigned
                  </option>
                  <option
                    v-for="person in people ?? []"
                    :key="person.id"
                    :value="person.id"
                  >
                    {{ person.displayName }}
                  </option>
                </select>
              </AppField>
              <div>
                <AppButton type="submit">
                  Add task
                </AppButton>
              </div>
            </form>
          </AppPanel>

          <AppPanel
            v-else-if="active === 'assets'"
            title="Assets"
            description="Files attached to this campaign directly or through a usage."
          >
            <template #actions>
              <NuxtLink
                to="/marketing/assets"
                class="text-sm font-medium text-brand-700 hover:text-brand-600"
              >
                Open asset library
              </NuxtLink>
            </template>
            <ul
              v-if="campaignAssets?.length"
              class="record-list text-sm"
            >
              <li
                v-for="asset in campaignAssets"
                :key="asset.id"
                class="record-item flex flex-wrap items-center justify-between gap-2"
              >
                <span class="font-medium text-navy-900">
                  <NuxtLink
                    :to="assetStaffPath(asset.id)"
                    class="hover:text-brand-700"
                  >
                    {{ asset.displayName }}
                  </NuxtLink>
                </span>
                <span class="text-muted">
                  {{ asset.campaignId === campaign.id ? 'Campaign file' : 'Used on this campaign' }}
                  <span v-if="asset.archived"> · Archived</span>
                </span>
              </li>
            </ul>
            <p
              v-else
              class="text-sm text-muted"
            >
              No assets linked to this campaign yet.
            </p>
            <form
              v-if="canManageAssets"
              class="mt-4 grid gap-2 sm:grid-cols-3"
              @submit.prevent="uploadCampaignAsset"
            >
              <AppField label="Upload file">
                <input
                  ref="assetFileInput"
                  type="file"
                  class="control"
                >
              </AppField>
              <AppField label="Display name">
                <input
                  v-model="assetDisplayName"
                  class="control"
                  placeholder="Optional"
                >
              </AppField>
              <div class="flex items-end">
                <AppButton type="submit">
                  Upload to campaign
                </AppButton>
              </div>
            </form>
            <form
              v-if="canManageAssets"
              class="mt-3 grid gap-2 sm:grid-cols-3"
              @submit.prevent="linkLibraryAsset"
            >
              <AppField
                class="sm:col-span-2"
                label="Link library asset"
                hint="Keeps the file in the library and records a campaign usage."
              >
                <select
                  v-model="attachAssetId"
                  class="control"
                >
                  <option value="">
                    Choose asset
                  </option>
                  <option
                    v-for="asset in linkableAssets"
                    :key="asset.id"
                    :value="String(asset.id)"
                  >
                    {{ asset.displayName }}
                  </option>
                </select>
              </AppField>
              <div class="flex items-end">
                <AppButton type="submit">
                  Link asset
                </AppButton>
              </div>
            </form>
          </AppPanel>

          <AppPanel
            v-else-if="active === 'tracking'"
            title="Tracking links"
          >
            <ul class="record-list text-sm">
              <li
                v-for="link in campaign.trackingLinks"
                :key="link.id"
                class="record-item space-y-2"
              >
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="font-medium text-navy-900">
                      {{ link.label }}
                      <AppBadge
                        v-if="link.isDefault"
                        class="ml-1"
                      >
                        Default
                      </AppBadge>
                    </p>
                    <p class="break-all text-navy-900">
                      {{ publicUrl(link) }}
                    </p>
                    <p class="mt-1 text-xs text-muted">
                      Destination {{ link.destinationPath || '/trial' }}
                      <span v-if="link.utmSource || link.utmMedium">
                        · {{ [link.utmSource, link.utmMedium].filter(Boolean).join(' / ') }}
                      </span>
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <AppButton
                      variant="subtle"
                      @click="requestCopy(link)"
                    >
                      Copy link
                    </AppButton>
                    <AppButton
                      v-if="canManage"
                      variant="subtle"
                      type="button"
                      @click="startEditLink(link)"
                    >
                      Edit
                    </AppButton>
                  </div>
                </div>
                <details class="text-xs text-muted">
                  <summary class="cursor-pointer">
                    Raw tracking URL
                  </summary>
                  <p class="mt-1 break-all">
                    {{ rawTrackingUrl(link) }}
                  </p>
                </details>
              </li>
            </ul>
            <form
              v-if="canManage && editingLink"
              class="mt-3 grid gap-2 sm:grid-cols-3"
              @submit.prevent="saveEditLink"
            >
              <AppField
                label="Label"
                required
              >
                <input
                  v-model="editLinkForm.label"
                  class="control"
                  required
                  maxlength="80"
                >
              </AppField>
              <AppField
                label="Friendly slug"
                required
                hint="Used in /t/your-slug"
              >
                <input
                  v-model="editLinkForm.publicSlug"
                  class="control"
                  required
                  maxlength="80"
                >
              </AppField>
              <div class="flex flex-wrap items-end gap-2">
                <AppButton
                  type="submit"
                  :loading="editLinkPending"
                >
                  Save link
                </AppButton>
                <AppButton
                  variant="secondary"
                  type="button"
                  @click="cancelEditLink"
                >
                  Cancel
                </AppButton>
              </div>
            </form>
            <form
              v-if="canManage"
              class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
              @submit.prevent="addLink"
            >
              <AppField label="Optional extra link">
                <input
                  v-model="extraLabel"
                  class="control"
                  placeholder="Flyer, QR, etc."
                >
              </AppField>
              <AppField
                label="Friendly slug"
                hint="Leave blank to assign from the campaign and label."
              >
                <input
                  v-model="extraSlug"
                  class="control"
                  placeholder="september-facebook"
                  maxlength="80"
                >
              </AppField>
              <AppField
                label="Destination"
                hint="Usually /trial or /events/event-slug"
              >
                <input
                  v-model="extraPath"
                  class="control"
                  placeholder="/trial"
                >
              </AppField>
              <div class="flex items-end">
                <AppButton type="submit">
                  Add link
                </AppButton>
              </div>
            </form>
          </AppPanel>

          <AppPanel
            v-else-if="active === 'events'"
            title="Acquisition Events"
            description="Events whose campaign is this record. Open an event to work sessions and roster."
          >
            <template #actions>
              <NuxtLink
                to="/marketing/events"
                class="text-sm font-medium text-brand-700 hover:text-brand-600"
              >
                Open events
              </NuxtLink>
            </template>
            <ul
              v-if="campaignEvents?.length"
              class="record-list text-sm"
            >
              <li
                v-for="item in campaignEvents"
                :key="item.id"
                class="record-item flex flex-wrap items-center justify-between gap-2"
              >
                <NuxtLink
                  :to="`/marketing/events/${item.id}`"
                  class="font-medium text-navy-900 hover:text-brand-700"
                >
                  {{ item.title }}
                </NuxtLink>
                <span class="text-muted">
                  {{ eventStatusLabel(item.status) }}
                </span>
              </li>
            </ul>
            <p
              v-else
              class="text-sm text-muted"
            >
              No acquisition events for this campaign yet.
            </p>
            <form
              v-if="canManageEvents"
              class="mt-4 grid gap-2 sm:grid-cols-3"
              @submit.prevent="addEvent"
            >
              <AppField
                class="sm:col-span-2"
                label="New event title"
              >
                <input
                  v-model="newEventTitle"
                  class="control"
                  required
                >
              </AppField>
              <div class="flex items-end">
                <AppButton type="submit">
                  Add event
                </AppButton>
              </div>
            </form>
          </AppPanel>

          <div
            v-else-if="active === 'performance'"
            class="space-y-4"
          >
            <AppAlert v-if="!canViewReports">
              Detailed campaign performance needs the Marketing reports right. Household count and the Leads filter stay available.
            </AppAlert>
            <AppAlert v-else-if="performanceError">
              Could not load detailed campaign performance.
            </AppAlert>
            <AppPanel
              v-if="canViewReports && performance"
              title="Detailed performance"
              description="Labels say where each number comes from. Mapping writes stay in Settings."
            >
              <template #actions>
                <NuxtLink
                  to="/settings/meta"
                  class="text-sm font-medium text-brand-700 hover:text-brand-600"
                >
                  Meta mapping in Settings
                </NuxtLink>
              </template>
              <dl class="grid gap-3 sm:grid-cols-2">
                <div class="kv-row">
                  <dt>Planned budget (internal CRM)</dt>
                  <dd>${{ centsToDollarString(performance.plannedBudgetCents ?? 0) }}</dd>
                </div>
                <div class="kv-row">
                  <dt>Meta spend (Meta-reported)</dt>
                  <dd>
                    <template v-if="performance.mapped">
                      ${{ centsToDollarString(performance.metaSpendCents) }}
                    </template>
                    <span
                      v-else
                      class="text-muted"
                    >Not mapped</span>
                  </dd>
                </div>
                <div class="kv-row">
                  <dt>Households (attributed)</dt>
                  <dd>{{ performance.attributed.households }}</dd>
                </div>
                <div class="kv-row">
                  <dt>Prospective members (attributed)</dt>
                  <dd>{{ performance.attributed.prospectiveMembers }}</dd>
                </div>
                <div class="kv-row">
                  <dt>Trials scheduled (attributed)</dt>
                  <dd>{{ performance.attributed.trialsScheduled }}</dd>
                </div>
                <div class="kv-row">
                  <dt>Trials attended (attributed)</dt>
                  <dd>{{ performance.attributed.trialsAttended }}</dd>
                </div>
                <div class="kv-row">
                  <dt>Joined (attributed)</dt>
                  <dd>{{ performance.attributed.joined }}</dd>
                </div>
                <div class="kv-row">
                  <dt>Acquired MRR (attributed)</dt>
                  <dd>${{ centsToDollarString(performance.attributed.acquiredMrrCents) }}</dd>
                </div>
                <div class="kv-row">
                  <dt>Event registrations (internal CRM)</dt>
                  <dd>{{ performance.eventRegistrationCount }}</dd>
                </div>
              </dl>
              <div class="mt-4">
                <p class="text-sm font-medium text-navy-900">
                  Mapped Meta campaigns
                </p>
                <ul
                  v-if="performance.mappedMetaCampaigns.length"
                  class="mt-2 text-sm text-muted"
                >
                  <li
                    v-for="mapped in performance.mappedMetaCampaigns"
                    :key="mapped.id"
                  >
                    {{ mapped.name }} · {{ mapped.externalId }}
                  </li>
                </ul>
                <p
                  v-else
                  class="mt-2 text-sm text-muted"
                >
                  Not mapped. ADMIN maps an internal Campaign to a Meta campaign by id under Settings â†’ Meta.
                </p>
              </div>
              <p class="mt-3 text-xs text-muted">
                {{ performance.notes.meta }} {{ performance.notes.attributed }} {{ performance.notes.crm }}
              </p>
            </AppPanel>
            <AppPanel
              title="Attributed households"
              description="First-touch attribution on the household. Compensation credit on a person can differ."
            >
              <template
                v-if="canViewMarketing"
                #actions
              >
                <NuxtLink
                  :to="campaignLeadsPath(campaign.id)"
                  class="text-sm font-medium text-brand-700 hover:text-brand-600"
                >
                  Open in Leads
                </NuxtLink>
              </template>
              <ul
                v-if="campaign.leads.length"
                class="record-list text-sm"
              >
                <li
                  v-for="household in attributedHouseholds(campaign)"
                  :key="household.id"
                  class="record-item flex flex-wrap items-center justify-between gap-2"
                >
                  <NuxtLink
                    :to="leadStaffPath(household.id, { campaignId: String(campaign.id) })"
                    class="font-medium text-navy-900 hover:text-brand-700"
                  >
                    {{ personName(household) }}
                  </NuxtLink>
                  <span class="text-muted">
                    {{ householdDisplayStatus(household).label }}
                  </span>
                </li>
              </ul>
              <p
                v-else
                class="text-sm text-muted"
              >
                No households yet. Copy a tracking link, or assign the campaign when adding a walk-in.
              </p>
            </AppPanel>
          </div>
        </AppRecordTabs>
      </template>
    </template>

    <AppOverflowMenu
      v-model:open="moreOpen"
      title="Campaign actions"
    >
      <button
        v-if="campaign && campaign.status !== 'COMPLETED' && campaign.status !== 'CANCELLED'"
        type="button"
        class="btn btn-subtle min-h-11 w-full justify-start"
        @click="patchStatus('COMPLETED')"
      >
        Mark completed
      </button>
      <button
        v-if="campaign && campaign.status !== 'CANCELLED'"
        type="button"
        class="btn btn-danger min-h-11 w-full justify-start"
        @click="cancelConfirmOpen = true"
      >
        Cancel campaign
      </button>
    </AppOverflowMenu>
    <AppConfirm
      :open="cancelConfirmOpen"
      title="Cancel this campaign"
      description="Cancelled campaigns stop attributing new tracking-link signups. This does not discard unsaved Overview edits."
      confirm-label="Cancel campaign"
      danger
      @update:open="cancelConfirmOpen = $event"
      @confirm="confirmCancelCampaign"
    />
    <AppConfirm
      :open="copyConfirmOpen"
      :title="campaign?.status === 'CANCELLED' ? 'This campaign is cancelled' : 'This campaign is not Active yet'"
      :description="campaign?.status === 'CANCELLED'
        ? 'This campaign is cancelled. The URL will not attribute new signups. Copy it anyway?'
        : 'The public URL will still attribute signups to this campaign. Copy it anyway?'"
      confirm-label="Copy anyway"
      @update:open="copyConfirmOpen = $event"
      @confirm="confirmPendingCopy"
    />
  </AppRecordWorkspace>
</template>
