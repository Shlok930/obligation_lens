import { dateTypeLabel } from '../data/catalog.js'
import { isValidIsoDate, todayIso } from './format.js'

// ─── Date status classification ──────────────────────────────────────────────

/**
 * Classify a date string relative to today using calendar-day comparison.
 * Returns one of: 'overdue' | 'due_today' | 'due_soon' | 'upcoming' | 'no_date'
 */
export function classifyDate(isoDate, today = todayIso()) {
  if (!isoDate || !isValidIsoDate(isoDate)) return 'no_date'
  if (isoDate < today) return 'overdue'
  if (isoDate === today) return 'due_today'
  const diff = daysBetween(today, isoDate)
  if (diff <= 7) return 'due_soon'
  return 'upcoming'
}

/**
 * Classify an important-date event (not an action).
 * Returns one of: 'deadline_passed' | 'due_today' | 'due_soon' | 'upcoming' | 'no_date'
 */
export function classifyDeadline(isoDate, today = todayIso()) {
  if (!isoDate || !isValidIsoDate(isoDate)) return 'no_date'
  if (isoDate < today) return 'deadline_passed'
  if (isoDate === today) return 'due_today'
  const diff = daysBetween(today, isoDate)
  if (diff <= 7) return 'due_soon'
  return 'upcoming'
}

export function daysBetween(fromIso, toIso) {
  // Parse as local calendar dates to avoid UTC shift
  const [fy, fm, fd] = fromIso.split('-').map(Number)
  const [ty, tm, td] = toIso.split('-').map(Number)
  const from = new Date(fy, fm - 1, fd)
  const to = new Date(ty, tm - 1, td)
  return Math.round((to - from) / 86_400_000)
}

export function statusLabel(status) {
  const map = {
    overdue: 'Overdue',
    due_today: 'Due today',
    due_soon: 'Due soon',
    upcoming: 'Upcoming',
    deadline_passed: 'Deadline passed',
    date_passed: 'Date passed',
    follow_up: 'Follow-up may be needed',
    resolved: 'Resolved',
    completed: 'Completed',
    no_date: 'No date',
  }
  return map[status] ?? status
}

export function statusSortOrder(status) {
  const order = {
    overdue: 0,
    due_today: 1,
    due_soon: 2,
    upcoming: 3,
    deadline_passed: 4,
    date_passed: 4,
    follow_up: 0,
    resolved: 5,
    completed: 5,
    no_date: 6,
  }
  return order[status] ?? 99
}

// ─── Consequence / recommended-action text ───────────────────────────────────

const DEADLINE_CONSEQUENCE = {
  return_deadline:
    'The stated return window may close. Check the original terms to confirm what happens after this date.',
  cancellation_deadline:
    'The free-cancellation window may close. Review the cancellation terms before acting.',
  renewal_date:
    'The subscription may renew and a charge may be applied. Decide whether to continue before this date.',
  trial_expiration:
    'The free trial may end and billing may begin. Confirm the terms before this date.',
  warranty_expiration:
    'The warranty period may end. Preserve the invoice and any service records.',
  expected_refund:
    'A refund was expected by this date. Follow up with the provider if it has not arrived.',
  custom:
    'Check the original terms to confirm what happens after this date.',
}

const DEADLINE_RECOMMENDATION = {
  return_deadline: 'Review the return conditions and keep the invoice and product evidence.',
  cancellation_deadline: 'Review the cancellation terms and confirm whether the booking is still needed.',
  renewal_date: 'Review the renewal conditions and decide whether to continue before the renewal date.',
  trial_expiration: 'Review the trial terms and decide whether to subscribe before the trial ends.',
  warranty_expiration: 'Check the warranty terms and preserve the invoice and relevant service records.',
  expected_refund: 'Check the refund status and review the provider\'s stated refund timeline.',
  custom: 'Review the original terms and take any required action before this date.',
}

// ─── Event generation ─────────────────────────────────────────────────────────

/**
 * Convert a single commitment into an array of normalized timeline events.
 * Does not mutate the source commitment.
 */
export function commitmentToEvents(commitment, today = todayIso()) {
  const events = []

  // A — Important dates
  for (const d of commitment.importantDates ?? []) {
    if (!d.id || !isValidIsoDate(d.date)) continue

    const classified = classifyDeadline(d.date, today)
    const status = d.resolved
      ? 'resolved'
      : classified === 'deadline_passed' && d.type === 'expected_refund'
      ? 'follow_up'
      : classified === 'deadline_passed' && d.type === 'warranty_expiration'
        ? 'date_passed'
        : classified
    events.push({
      id: `evt-date-${commitment.id}-${d.id}`,
      commitmentId: commitment.id,
      commitmentTitle: commitment.title,
      category: commitment.category,
      merchant: commitment.merchant ?? '',
      title: dateTypeLabel(d.type),
      date: d.date,
      eventType: 'important_date',
      sourceId: d.id,
      dateType: d.type,
      status,
      note: d.note ?? '',
      financialAmount: resolveFinancialAmount(commitment, d.type),
      currency: commitment.currency,
      consequence: DEADLINE_CONSEQUENCE[d.type] ?? DEADLINE_CONSEQUENCE.custom,
      recommendedAction: DEADLINE_RECOMMENDATION[d.type] ?? DEADLINE_RECOMMENDATION.custom,
      completed: false, // important dates are not completable as actions
      resolved: d.resolved ?? false,
    })
  }

  // B — Action items
  for (const a of commitment.actions ?? []) {
    if (!a.id || !isValidIsoDate(a.dueDate)) continue

    let status
    if (a.completed) {
      status = 'completed'
    } else {
      status = classifyDate(a.dueDate, today)
    }

    events.push({
      id: `evt-act-${commitment.id}-${a.id}`,
      commitmentId: commitment.id,
      commitmentTitle: commitment.title,
      category: commitment.category,
      merchant: commitment.merchant ?? '',
      title: a.title,
      date: a.dueDate,
      eventType: 'action',
      sourceId: a.id,
      dateType: null,
      status,
      note: a.note ?? '',
      financialAmount: null,
      currency: commitment.currency,
      consequence: null,
      recommendedAction: null,
      completed: Boolean(a.completed),
      resolved: false,
    })
  }

  return events
}

/**
 * Convert all commitments to a flat sorted array of timeline events.
 */
export function buildTimeline(commitments, today = todayIso()) {
  const events = commitments.flatMap((c) => commitmentToEvents(c, today))
  return sortEvents(events)
}

/**
 * Sort events: by date ascending (nulls last), then by status priority,
 * then incomplete actions before informational events on the same date.
 */
export function sortEvents(events) {
  return [...events].sort((a, b) => {
    const aDate = a.date ?? '9999-99-99'
    const bDate = b.date ?? '9999-99-99'
    if (aDate !== bDate) return aDate.localeCompare(bDate)
    // Same date: incomplete actions first
    const aIsAction = a.eventType === 'action' && !a.completed ? 0 : 1
    const bIsAction = b.eventType === 'action' && !b.completed ? 0 : 1
    if (aIsAction !== bIsAction) return aIsAction - bIsAction
    return statusSortOrder(a.status) - statusSortOrder(b.status)
  })
}

// ─── Timeline grouping ────────────────────────────────────────────────────────

export function groupEventsByPeriod(events, today = todayIso()) {
  const groups = {
    overdue: [],
    today: [],
    tomorrow: [],
    this_week: [],
    later: [],
    no_date: [],
    past: [],
  }

  const tomorrow = offsetDate(today, 1)
  const weekEnd = offsetDate(today, 7)

  for (const evt of events) {
    if (!evt.date) {
      groups.no_date.push(evt)
      continue
    }
    if ((evt.status === 'completed' || evt.status === 'resolved') && evt.date < today) {
      groups.past.push(evt)
      continue
    }
    if (evt.date < today && evt.eventType === 'important_date') {
      groups.past.push(evt)
      continue
    }
    if (evt.date < today) {
      // overdue incomplete actions or passed deadlines
      groups.overdue.push(evt)
      continue
    }
    if (evt.date === today) {
      groups.today.push(evt)
      continue
    }
    if (evt.date === tomorrow) {
      groups.tomorrow.push(evt)
      continue
    }
    if (evt.date <= weekEnd) {
      groups.this_week.push(evt)
      continue
    }
    groups.later.push(evt)
  }

  return groups
}

export const GROUP_LABELS = {
  overdue: 'Overdue',
  today: 'Today',
  tomorrow: 'Tomorrow',
  this_week: 'This week',
  later: 'Later',
  no_date: 'No deadline',
  past: 'Past events',
}

export const GROUP_ORDER = ['overdue', 'today', 'tomorrow', 'this_week', 'later', 'no_date', 'past']

// ─── Summary metrics ──────────────────────────────────────────────────────────

export function computeTimelineSummary(events, commitments = []) {
  let overdue = 0
  let dueToday = 0
  let dueSoon = 0
  const unresolvedCommitmentIds = new Set()

  for (const evt of events) {
    if (evt.completed || evt.resolved) continue
    if (evt.eventType === 'action' && evt.status === 'overdue') overdue++
    if (evt.eventType === 'action' && evt.status === 'due_today') dueToday++
    if (evt.eventType === 'action' && evt.status === 'due_soon') dueSoon++
    if (evt.eventType === 'action' || (evt.eventType === 'important_date' && !evt.resolved)) {
      unresolvedCommitmentIds.add(evt.commitmentId)
    }
  }

  for (const commitment of commitments) {
    if (commitment.status === 'completed') continue
    if ((commitment.actions ?? []).some((action) => !action.completed) || (commitment.importantDates ?? []).some((date) => !date.resolved)) {
      unresolvedCommitmentIds.add(commitment.id)
    }
  }

  return { overdue, dueToday, dueSoon, unresolved: unresolvedCommitmentIds.size }
}

// ─── Filtering ────────────────────────────────────────────────────────────────

export function filterEvents(events, { statusFilter, categoryFilter, timeRange, search }) {
  const today = todayIso()
  const query = (search ?? '').trim().toLowerCase()

  return events.filter((evt) => {
    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'completed' && !evt.completed && !evt.resolved) return false
      if (statusFilter === 'overdue' && evt.status !== 'overdue') return false
      if (statusFilter === 'due_today' && evt.status !== 'due_today') return false
      if (statusFilter === 'due_soon' && evt.status !== 'due_soon') return false
      if (statusFilter === 'upcoming' && !['due_today', 'due_soon', 'upcoming'].includes(evt.status)) return false
      if (statusFilter === 'historical' && !['deadline_passed', 'date_passed', 'follow_up'].includes(evt.status)) return false
    }

    // Category filter
    if (categoryFilter && categoryFilter !== 'all') {
      if (evt.category !== categoryFilter) return false
    }

    // Time range
    if (timeRange === '7d' && (!evt.date || evt.date < today)) return false
    if (timeRange === '7d' && evt.date) {
      const end = offsetDate(today, 7)
      if (evt.date > end || evt.date < today) return false
    }
    if (timeRange === '30d' && (!evt.date || evt.date < today)) return false
    if (timeRange === '30d' && evt.date) {
      const end = offsetDate(today, 30)
      if (evt.date > end || evt.date < today) return false
    }

    // Search
    if (query) {
      const haystack = [
        evt.title,
        evt.commitmentTitle,
        evt.merchant,
        evt.note,
      ].join(' ').toLowerCase()
      if (!haystack.includes(query)) return false
    }

    return true
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function offsetDate(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function resolveFinancialAmount(commitment, dateType) {
  const fe = commitment.financialExposure ?? {}
  if (dateType === 'return_deadline') return fe.refundableAmount ?? null
  if (dateType === 'cancellation_deadline') return fe.potentialCharge ?? null
  if (dateType === 'renewal_date') return fe.potentialCharge ?? null
  if (dateType === 'trial_expiration') return fe.potentialCharge ?? null
  if (dateType === 'expected_refund') return fe.expectedRefundAmount ?? null
  if (dateType === 'warranty_expiration') return null
  return null
}
