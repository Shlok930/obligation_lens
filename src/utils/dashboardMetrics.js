import { buildTimeline } from './obligationEngine.js'

export function selectDashboardMetrics(commitments, today) {
  const active = commitments.filter((item) => item.status === 'active')
  const events = buildTimeline(active, today)
  const exposure = new Map()
  for (const item of active) {
    const amount = (value) => Number.isFinite(value) && value >= 0 ? value : 0
    const total = amount(item.financialExposure?.refundableAmount) + amount(item.financialExposure?.potentialCharge)
    if (total > 0) exposure.set(item.currency, (exposure.get(item.currency) ?? 0) + total)
  }
  return {
    activeCount: active.length,
    overdueActions: events.filter((event) => event.eventType === 'action' && event.status === 'overdue').length,
    upcomingDates: events.filter((event) => event.eventType === 'important_date' && !event.resolved && ['due_today', 'due_soon', 'upcoming'].includes(event.status)).length,
    completedActions: commitments.reduce((count, item) => count + (item.actions ?? []).filter((action) => action.completed).length, 0),
    completedCommitments: commitments.filter((item) => item.status === 'completed').length,
    exposureByCurrency: [...exposure.entries()].sort(([a], [b]) => a.localeCompare(b)),
    events,
  }
}
