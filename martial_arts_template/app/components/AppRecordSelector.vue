<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { BadgeTone } from '#shared/utils/labels'
import { adjacentRecordIds, filterRecordsByLabel } from '#shared/utils/record-workspace'

interface RecordSelectorItem {
  id: number
  label: string
  badge?: string
  badgeTone?: BadgeTone
}

const props = withDefaults(defineProps<{
  items: RecordSelectorItem[]
  currentId: number
  recordTo: (id: number) => RouteLocationRaw
  recordKind?: string
  currentLabel?: string
  currentBadge?: string
  currentBadgeTone?: BadgeTone
  loading?: boolean
  searchPlaceholder?: string
  ariaLabel?: string
}>(), {
  recordKind: 'Record',
  currentLabel: '',
  currentBadge: '',
  loading: false,
  searchPlaceholder: 'Search records',
  ariaLabel: 'Select record',
})

const open = ref(false)
const filterQuery = ref('')
const highlighted = ref(0)
const root = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const uid = useId()
const listboxId = computed(() => `${uid}-listbox`)
const optionId = (id: number) => `${uid}-option-${id}`

const currentItem = computed(() => props.items.find(item => item.id === props.currentId) ?? null)
const displayLabel = computed(() => currentItem.value?.label || props.currentLabel || (props.currentId ? `${props.recordKind} ${props.currentId}` : props.recordKind))
const displayBadge = computed(() => currentItem.value?.badge || props.currentBadge || undefined)
const displayBadgeTone = computed(() => currentItem.value?.badgeTone ?? props.currentBadgeTone)
const filtered = computed(() => filterRecordsByLabel(props.items, filterQuery.value))
const navIds = computed(() => (filterQuery.value.trim() ? filtered.value : props.items).map(item => item.id))
const neighbors = computed(() => adjacentRecordIds(navIds.value, props.currentId))

watch(filtered, (rows) => {
  const currentIndex = rows.findIndex(item => item.id === props.currentId)
  highlighted.value = currentIndex >= 0 ? currentIndex : 0
})

function close() {
  open.value = false
  filterQuery.value = ''
}

async function goTo(id: number) {
  close()
  if (id === props.currentId) {
    return
  }
  await navigateTo(props.recordTo(id))
}

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  filterQuery.value = target.value
  open.value = true
}

async function openSelector() {
  open.value = true
  filterQuery.value = ''
  await nextTick()
  searchInput.value?.focus()
}

async function onIdentityKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowDown' && event.key !== 'Enter' && event.key !== ' ') {
    return
  }
  event.preventDefault()
  await openSelector()
}

async function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    open.value = true
    highlighted.value = Math.min(highlighted.value + 1, Math.max(filtered.value.length - 1, 0))
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    open.value = true
    highlighted.value = Math.max(highlighted.value - 1, 0)
    return
  }
  if (event.key === 'Home' && open.value) {
    event.preventDefault()
    highlighted.value = 0
    return
  }
  if (event.key === 'End' && open.value) {
    event.preventDefault()
    highlighted.value = Math.max(filtered.value.length - 1, 0)
    return
  }
  if (event.key === 'Enter' && open.value) {
    event.preventDefault()
    const item = filtered.value[highlighted.value]
    if (item) {
      await goTo(item.id)
    }
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  }
}

const compact = ref(false)

function updateCompact() {
  compact.value = window.matchMedia('(max-width: 1023px)').matches
}

function onDocumentPointer(event: MouseEvent) {
  if (compact.value) {
    return
  }
  if (!root.value?.contains(event.target as Node)) {
    close()
  }
}

onMounted(() => {
  updateCompact()
  window.addEventListener('resize', updateCompact)
  document.addEventListener('mousedown', onDocumentPointer)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateCompact)
  document.removeEventListener('mousedown', onDocumentPointer)
})
</script>

<template>
  <div
    ref="root"
    class="min-w-0"
  >
    <p class="record-kind">
      {{ recordKind }}
    </p>
    <div class="record-identity-row">
      <div class="relative min-w-0 flex-1">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <button
            class="record-identity-trigger"
            type="button"
            :aria-label="ariaLabel"
            :aria-expanded="open"
            aria-haspopup="listbox"
            :aria-controls="listboxId"
            @click="openSelector"
            @keydown="onIdentityKeydown"
          >
            <span class="record-identity-name">
              {{ displayLabel }}
            </span>
            <svg
              class="record-identity-chevron"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
          <AppBadge
            v-if="displayBadge"
            :tone="displayBadgeTone"
          >
            {{ displayBadge }}
          </AppBadge>
        </div>
        <Teleport
          to="body"
          :disabled="!compact"
        >
          <div
            v-if="open && compact"
            class="fixed inset-0 z-40 bg-navy-950/50 lg:hidden"
            @click="close"
          />
          <div
            v-if="open"
            :class="compact ? 'record-selector-sheet' : 'record-selector-popover'"
          >
            <div
              v-if="compact"
              class="flex items-center justify-between border-b border-line px-3 py-2"
            >
              <p class="text-sm font-medium text-navy-900">
                {{ searchPlaceholder }}
              </p>
              <button
                type="button"
                class="btn btn-ghost px-3"
                @click="close"
              >
                Close
              </button>
            </div>
            <input
              ref="searchInput"
              class="control rounded-none border-0 border-b border-line"
              :value="filterQuery"
              :placeholder="searchPlaceholder"
              :aria-label="searchPlaceholder"
              role="combobox"
              aria-expanded="true"
              aria-autocomplete="list"
              :aria-controls="listboxId"
              :aria-activedescendant="filtered[highlighted] ? optionId(filtered[highlighted]!.id) : undefined"
              autocomplete="off"
              @input="onInput"
              @keydown="onKeydown"
            >
            <ul
              :id="listboxId"
              class="max-h-72 overflow-auto"
              role="listbox"
            >
              <li
                v-if="loading && !items.length"
                class="px-3 py-3 text-sm text-muted"
              >
                Loading records…
              </li>
              <li
                v-else-if="!filtered.length"
                class="px-3 py-3 text-sm text-muted"
              >
                No matching records.
              </li>
              <li
                v-for="(item, index) in filtered"
                :id="optionId(item.id)"
                :key="item.id"
                class="record-selector-option"
                :class="{
                  'record-selector-option-active': index === highlighted,
                  'record-selector-option-current': item.id === currentId,
                }"
                role="option"
                :aria-selected="item.id === currentId"
                @mousedown.prevent="goTo(item.id)"
                @mouseenter="highlighted = index"
              >
                <span class="min-w-0 truncate">
                  {{ item.label }}
                </span>
                <span class="flex shrink-0 items-center gap-2">
                  <span
                    v-if="item.id === currentId"
                    class="text-[11px] font-medium uppercase tracking-wide text-muted"
                  >Current</span>
                  <AppBadge
                    v-if="item.badge"
                    :tone="item.badgeTone"
                  >
                    {{ item.badge }}
                  </AppBadge>
                </span>
              </li>
            </ul>
          </div>
        </Teleport>
      </div>
      <div class="record-nav">
        <button
          class="record-nav-btn"
          type="button"
          :disabled="neighbors.previousId == null"
          aria-label="Previous record"
          @click="neighbors.previousId != null && goTo(neighbors.previousId)"
        >
          <svg
            class="size-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.832 10l3.938 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.24a.75.75 0 0 1 0-1.08l4.5-4.24a.75.75 0 0 1 1.06.02Z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
        <button
          class="record-nav-btn"
          type="button"
          :disabled="neighbors.nextId == null"
          aria-label="Next record"
          @click="neighbors.nextId != null && goTo(neighbors.nextId)"
        >
          <svg
            class="size-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.24a.75.75 0 0 1 0 1.08l-4.5 4.24a.75.75 0 0 1-1.06-.02Z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
    <div
      v-if="$slots.meta"
      class="record-meta"
    >
      <slot name="meta" />
    </div>
  </div>
</template>
