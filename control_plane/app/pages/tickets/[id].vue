<script setup lang="ts">
import { ticketPriorities, ticketStatuses } from '~~/shared/schemas/ticketing'

const route = useRoute()
const id = String(route.params.id)
const { data, pending, error, refresh } = await useFetch(`/api/tickets/${id}`)
useHead({ title: computed(() => data.value?.ticket?.key || 'Ticket') })
const saving = ref(false)
const actionError = ref('')
const comment = ref('')
const commentVisibility = ref('INTERNAL')
const resolution = ref('')

watchEffect(() => {
  if (data.value?.ticket?.resolution && !resolution.value) resolution.value = data.value.ticket.resolution
})

async function update(fields: Record<string, unknown>) {
  saving.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/tickets/${id}`, { method: 'PATCH', body: fields })
    await refresh()
  } catch (error) {
    actionError.value = fetchMessage(error, 'Update failed.')
  } finally {
    saving.value = false
  }
}

async function changeStatus(event: Event) {
  const status = (event.target as HTMLSelectElement).value
  await update({ status, resolution: status === 'DONE' || status === 'REJECTED' ? resolution.value : undefined })
}

async function addComment() {
  if (!comment.value.trim()) return
  saving.value = true
  try {
    await $fetch(`/api/tickets/${id}/comments`, { method: 'POST', body: { author: 'Operator', body: comment.value, visibility: commentVisibility.value } })
    comment.value = ''
    await refresh()
  } catch (error) {
    actionError.value = fetchMessage(error, 'Comment failed.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="page">
    <AppAsyncPanel
      :pending="pending"
      :error="error"
      :empty="!data?.ticket"
      empty-message="Ticket not found."
    >
      <AppPageHeader
        :title="`${data!.ticket.key} · ${data!.ticket.title}`"
        :crumbs="[{ to: '/tickets', label: 'Tickets' }, { label: data!.ticket.key }]"
      >
        {{ data!.ticket.source }} · {{ data!.ticket.category }} · created {{ new Date(data!.ticket.createdAt).toLocaleString() }}
      </AppPageHeader>
      <p
        v-if="actionError"
        class="action-error"
        role="alert"
      >
        {{ actionError }}
      </p>
      <div class="detail-grid">
        <section class="card detail-main">
          <h2>Description</h2><p class="pre-wrap">
            {{ data!.ticket.description }}
          </p>
          <h2>Resolution</h2>
          <textarea
            v-model="resolution"
            rows="4"
            placeholder="Required before Done or Rejected"
          />
          <button
            type="button"
            class="secondary"
            :disabled="saving"
            @click="update({ resolution: resolution || null })"
          >
            Save resolution
          </button>
          <h2>Originating findings</h2>
          <p
            v-if="!data!.findings.length"
            class="muted"
          >
            No QA finding linked.
          </p>
          <article
            v-for="finding in data!.findings"
            :key="finding.id"
            class="subcard"
          >
            <NuxtLink :to="`/qa/runs/${finding.qaRunId}#finding-${finding.id}`">{{ finding.title }}</NuxtLink>
            <p>{{ finding.observation }}</p>
            <span class="muted">{{ finding.workflow || finding.route || 'Run-level' }} · {{ finding.detectionMethod }}</span>
          </article>
          <h2>Evidence</h2>
          <p
            v-if="!data!.attachments.length"
            class="muted"
          >
            No attachments.
          </p>
          <ul>
            <li
              v-for="item in data!.attachments"
              :key="item.id"
            >
              <a
                v-if="item.evidence"
                :href="`/api/qa/evidence/${item.evidence.id}`"
                target="_blank"
              >{{ item.label }}</a><a
                v-else-if="item.externalUrl"
                :href="item.externalUrl"
              >{{ item.label }}</a>
            </li>
          </ul>
          <h2>Comments</h2>
          <article
            v-for="item in data!.comments"
            :key="item.id"
            class="comment"
          >
            <strong>{{ item.author }}</strong> <span class="muted">{{ item.visibility }} · {{ new Date(item.createdAt).toLocaleString() }}</span><p class="pre-wrap">
              {{ item.body }}
            </p>
          </article>
          <form
            class="subcard"
            @submit.prevent="addComment"
          >
            <label>Comment<textarea
              v-model="comment"
              required
              rows="4"
            /></label><label>Visibility<select v-model="commentVisibility"><option>INTERNAL</option><option>CUSTOMER</option></select></label><p class="muted">
              Customer-visible comments are modeled for future support UI, but no customer portal exists.
            </p><button :disabled="saving">
              Add comment
            </button>
          </form>
          <h2>Activity</h2>
          <ol class="activity">
            <li
              v-for="item in data!.activity"
              :key="item.id"
            >
              <strong>{{ item.action }}</strong> by {{ item.actor }} <span class="muted">{{ new Date(item.createdAt).toLocaleString() }}</span>
            </li>
          </ol>
        </section>
        <aside class="card detail-side">
          <label>Status<select
            :value="data!.ticket.status"
            :disabled="saving"
            @change="changeStatus"
          ><option
            v-for="item in ticketStatuses"
            :key="item"
          >{{ item }}</option></select></label>
          <label>Priority<select
            :value="data!.ticket.priority"
            :disabled="saving"
            @change="update({ priority: ($event.target as HTMLSelectElement).value })"
          ><option
            v-for="item in ticketPriorities"
            :key="item"
          >{{ item }}</option></select></label>
          <label>Assignee<input
            :value="data!.ticket.assignee || ''"
            @change="update({ assignee: ($event.target as HTMLInputElement).value || null })"
          ></label>
          <dl class="stacked-dl">
            <dt>Severity</dt><dd>{{ data!.ticket.severity || 'Not set' }}</dd><dt>Product</dt><dd>{{ data!.ticket.productId || 'Platform' }}</dd><dt>Customer</dt><dd>{{ data!.ticket.customerId || '—' }}</dd><dt>Environment</dt><dd>{{ data!.ticket.environmentId || '—' }}</dd>
          </dl>
        </aside>
      </div>
    </AppAsyncPanel>
  </main>
</template>
