import { createError, defineEventHandler, getQuery } from 'h3'
import { DESK_VIEWS, type DeskView } from '../../../shared/utils/prospect-desk'
import { useDb } from '../../database'
import { latestProspectRun } from '../../services/prospect-runs'
import { listDeskProspects, prospectDeskSummary } from '../../services/prospect-outreach'
import { throwDomain } from '../../utils/api'
import { requireSalesAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  try {
    const db = useDb()
    const summary = await prospectDeskSummary(db)
    if (!summary.config.enabled) {
      throw createError({ statusCode: 404, message: 'Prospect desk is off.' })
    }
    const requested = String(getQuery(event).view ?? 'needs_you')
    const view = (DESK_VIEWS as readonly string[]).includes(requested) ? requested as DeskView : 'needs_you'
    const [items, run] = await Promise.all([
      listDeskProspects(db, view),
      latestProspectRun(db),
    ])
    return { ...summary, view, items, run }
  } catch (error) {
    throwDomain(error)
  }
})
