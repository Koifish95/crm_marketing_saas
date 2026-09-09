<script setup lang="ts">
import { firstQueryValue, mergeRouteQuery } from '#shared/utils/record-workspace'

const props = withDefaults(defineProps<{
  tabs: Array<{ id: string, label: string }>
  queryKey?: string
}>(), {
  queryKey: 'tab',
})

const route = useRoute()
const router = useRouter()

const manyTabs = computed(() => props.tabs.length > 4)

const activeId = computed(() => {
  const requested = firstQueryValue(route.query[props.queryKey] as string | string[] | undefined)
  if (requested && props.tabs.some(tab => tab.id === requested)) {
    return requested
  }
  return props.tabs[0]?.id ?? ''
})

async function select(id: string) {
  if (!id || id === activeId.value) {
    return
  }
  await router.replace({
    query: mergeRouteQuery(route.query, { [props.queryKey]: id }),
  })
}

function focusTab(id: string) {
  document.getElementById(`record-tab-${id}`)?.focus()
}

async function onKeydown(event: KeyboardEvent, index: number) {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') {
    return
  }
  event.preventDefault()
  const last = props.tabs.length - 1
  if (last < 0) {
    return
  }
  let nextIndex = index
  if (event.key === 'ArrowRight') {
    nextIndex = index === last ? 0 : index + 1
  } else if (event.key === 'ArrowLeft') {
    nextIndex = index === 0 ? last : index - 1
  } else if (event.key === 'Home') {
    nextIndex = 0
  } else {
    nextIndex = last
  }
  const tab = props.tabs[nextIndex]
  if (!tab) {
    return
  }
  await select(tab.id)
  await nextTick()
  focusTab(tab.id)
}
</script>

<template>
  <div>
    <label
      v-if="manyTabs"
      class="mb-3 block lg:hidden"
    >
      <span class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        Section
      </span>
      <select
        class="control mt-1"
        :value="activeId"
        aria-label="Record section"
        @change="select(($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="tab in tabs"
          :key="tab.id"
          :value="tab.id"
        >
          {{ tab.label }}
        </option>
      </select>
    </label>
    <div
      role="tablist"
      class="record-tablist"
      :class="{ 'max-lg:!hidden': manyTabs }"
      aria-orientation="horizontal"
    >
      <button
        v-for="(tab, index) in tabs"
        :id="`record-tab-${tab.id}`"
        :key="tab.id"
        class="record-tab"
        :class="{ 'record-tab-active': tab.id === activeId }"
        type="button"
        role="tab"
        :aria-selected="tab.id === activeId"
        :aria-controls="`record-panel-${tab.id}`"
        :tabindex="tab.id === activeId ? 0 : -1"
        @click="select(tab.id)"
        @keydown="onKeydown($event, index)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div
      :id="`record-panel-${activeId}`"
      class="record-tabpanel"
      role="tabpanel"
      :aria-labelledby="`record-tab-${activeId}`"
    >
      <slot :active="activeId" />
    </div>
  </div>
</template>
