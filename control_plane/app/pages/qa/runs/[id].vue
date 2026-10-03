<script setup lang="ts">
const route = useRoute()
const id = String(route.params.id)
const { data, pending, error, refresh } = await useFetch(`/api/qa/runs/${id}`)
useHead({ title: 'QA run' })
const reviewError = ref('')
const reviewNote = reactive<Record<string, string>>({})
const duplicateTarget = reactive<Record<string, string>>({})
const linkTicket = reactive<Record<string, string>>({})

async function review(findingId: string, body: Record<string, unknown>) {
  reviewError.value = ''
  try {
    await $fetch(`/api/qa/findings/${findingId}/review`, { method: 'POST', body })
    await refresh()
  } catch (error) {
    reviewError.value = fetchMessage(error, 'Finding review failed.')
  }
}

function evidenceFor(findingId: string) {
  return data.value?.evidence.filter(item => item.findingId === findingId) || []
}
function routesFor(workflow: unknown): string[] {
  return ((workflow as { routes?: string[] }).routes || [])
}
function stepsFor(finding: unknown): string[] {
  return ((finding as { reproductionSteps?: string[] }).reproductionSteps || [])
}
</script>

<template>
  <main class="page">
    <AppAsyncPanel
      :pending="pending"
      :error="error"
      :empty="!data?.run"
      empty-message="QA run not found."
    >
      <AppPageHeader
        title="QA run"
        :crumbs="[{ to: '/qa/runs', label: 'QA Runs' }, { label: id.slice(0, 8) }]"
      >
        {{ data!.run.productId }} · {{ data!.run.environmentType }} · {{ data!.run.baseUrl }}
      </AppPageHeader>
      <div class="summary-grid">
        <div class="card">
          <span class="muted">Status</span><div><AppStatusBadge :status="data!.run.status.toLowerCase().replaceAll('_', '-')" /></div>
        </div><div class="card">
          <span class="muted">Started</span><div>{{ new Date(data!.run.startedAt).toLocaleString() }}</div>
        </div><div class="card">
          <span class="muted">Build</span><div>{{ data!.run.buildVersion || 'Unknown' }}</div>
        </div><div class="card">
          <span class="muted">Findings</span><div>{{ data!.findings.length }}</div>
        </div>
      </div>
      <p
        v-if="data!.run.errorSummary"
        class="action-error"
      >
        {{ data!.run.errorSummary }}
      </p>
      <h2>Workflows</h2>
      <AppDataTable
        label="Workflows"
        :columns="['Workflow', 'Status', 'Routes', 'Result']"
      >
        <tr
          v-for="workflow in data!.workflows"
          :key="workflow.id"
        >
          <td>{{ workflow.name }}</td><td>{{ workflow.status }}</td><td>{{ routesFor(workflow).join(', ') || '—' }}</td><td>{{ workflow.errorSummary || 'Completed' }}</td>
        </tr>
      </AppDataTable>
      <h2>Findings</h2>
      <p
        v-if="reviewError"
        class="action-error"
        role="alert"
      >
        {{ reviewError }}
      </p>
      <p
        v-if="!data!.findings.length"
        class="muted"
      >
        No findings.
      </p>
      <article
        v-for="finding in data!.findings"
        :id="`finding-${finding.id}`"
        :key="finding.id"
        class="card finding-card"
      >
        <div class="row">
          <AppStatusBadge :status="finding.status.toLowerCase()" /><strong>{{ finding.severity }} · {{ finding.category }}</strong><span class="muted">{{ finding.workflow || 'Run' }} · {{ finding.route || 'No route' }}</span>
        </div>
        <h3>{{ finding.title }}</h3><p>{{ finding.observation }}</p>
        <dl class="dl">
          <dt>Expected</dt><dd>{{ finding.expectedBehavior || '—' }}</dd><dt>Suggested improvement</dt><dd>{{ finding.suggestedRemediation || '—' }}</dd><dt>Detection</dt><dd>{{ finding.detectionMethod }}</dd><dt>Confidence / rationale</dt><dd>{{ finding.confidence || '—' }} {{ finding.rationale || '' }}</dd><dt>Steps</dt><dd>
            <ol>
              <li
                v-for="step in stepsFor(finding)"
                :key="step"
              >
                {{ step }}
              </li>
            </ol>
          </dd>
        </dl>
        <div
          v-if="evidenceFor(finding.id).length"
          class="row"
        >
          <a
            v-for="item in evidenceFor(finding.id)"
            :key="item.id"
            :href="`/api/qa/evidence/${item.id}`"
            target="_blank"
          >{{ item.fileName }}</a>
        </div>
        <div
          v-if="finding.status === 'NEW' || finding.status === 'REVIEWED'"
          class="review-actions"
        >
          <button
            type="button"
            @click="review(finding.id, { action: 'create_ticket', priority: finding.severity === 'CRITICAL' ? 'URGENT' : finding.severity === 'HIGH' ? 'HIGH' : 'MEDIUM' })"
          >
            Create ticket
          </button>
          <label>Existing ticket ID/key<input v-model="linkTicket[finding.id]"><button
            type="button"
            class="secondary"
            :disabled="!linkTicket[finding.id]"
            @click="review(finding.id, { action: 'link', ticketId: linkTicket[finding.id] })"
          >Link</button></label>
          <label>Duplicate finding ID<input v-model="duplicateTarget[finding.id]"><button
            type="button"
            class="secondary"
            :disabled="!duplicateTarget[finding.id]"
            @click="review(finding.id, { action: 'duplicate', duplicateOfFindingId: duplicateTarget[finding.id], note: reviewNote[finding.id] })"
          >Duplicate</button></label>
          <label>Review note<textarea
            v-model="reviewNote[finding.id]"
            rows="2"
          /><button
            type="button"
            class="secondary"
            :disabled="!reviewNote[finding.id]"
            @click="review(finding.id, { action: 'dismiss', note: reviewNote[finding.id] })"
          >Dismiss</button></label>
        </div>
      </article>
    </AppAsyncPanel>
  </main>
</template>
