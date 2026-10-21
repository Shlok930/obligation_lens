import { classifyDate, classifyDeadline, offsetDate, statusLabel } from './obligationEngine.js'
import { isValidIsoDate } from './format.js'

export function getCommitmentHealth(commitment, today) {
  if (commitment.status === 'completed') {
    const openActions = (commitment.actions ?? []).filter((action) => !action.completed).length
    return { status: 'Completed', reason: `This commitment is explicitly marked completed.${openActions ? ` It still contains ${openActions} incomplete action${openActions === 1 ? '' : 's'} for review.` : ''}` }
  }

  const overdueAction = (commitment.actions ?? []).find((action) => !action.completed && isValidIsoDate(action.dueDate) && classifyDate(action.dueDate, today) === 'overdue')
  if (overdueAction) return { status: 'Overdue', reason: `“${overdueAction.title}” has a recorded due date of ${overdueAction.dueDate} and is still incomplete.` }

  const dueSoonAction = (commitment.actions ?? []).find((action) => !action.completed && ['due_today', 'due_soon'].includes(classifyDate(action.dueDate, today)))
  if (dueSoonAction) return { status: 'Needs attention', reason: `“${dueSoonAction.title}” is an incomplete action due ${classifyDate(dueSoonAction.dueDate, today) === 'due_today' ? 'today' : `soon (${dueSoonAction.dueDate})`}.` }

  const upcomingAction = (commitment.actions ?? []).find((action) => !action.completed && classifyDate(action.dueDate, today) === 'upcoming')
  if (upcomingAction) return { status: 'Needs attention', reason: `“${upcomingAction.title}” is incomplete and has a future due date (${upcomingAction.dueDate}).` }

  const refundFollowUp = (commitment.importantDates ?? []).find((item) => !item.resolved && item.type === 'expected_refund' && classifyDeadline(item.date, today) === 'deadline_passed')
  if (refundFollowUp) return { status: 'Needs attention', reason: `The recorded expected-refund date (${refundFollowUp.date}) has passed; this does not confirm a delay.` }

  const upcomingDate = (commitment.importantDates ?? []).find((item) => !item.resolved && ['due_today', 'due_soon', 'upcoming'].includes(classifyDeadline(item.date, today)))
  if (upcomingDate) return { status: 'Needs attention', reason: `${upcomingDate.type.replaceAll('_', ' ')} is recorded for ${upcomingDate.date}.` }

  const hasUsableTimelineData = (commitment.importantDates ?? []).some((item) => isValidIsoDate(item.date)) ||
    (commitment.actions ?? []).some((action) => action.completed || isValidIsoDate(action.dueDate))
  const undatedOpenAction = (commitment.actions ?? []).some((action) => !action.completed && !isValidIsoDate(action.dueDate))
  if (undatedOpenAction) return { status: 'Insufficient information', reason: 'At least one incomplete action has no due date, so its timing cannot be assessed.' }
  if (!hasUsableTimelineData) return { status: 'Insufficient information', reason: 'No dated responsibility is recorded, so timing cannot be assessed.' }
  return { status: 'On track', reason: 'No known overdue incomplete action or upcoming unresolved important date is recorded.' }
}

export function getCommitmentRecommendations(commitment, today) {
  const recommendations = []
  const actions = commitment.actions ?? []
  const dates = commitment.importantDates ?? []
  for (const action of actions.filter((item) => !item.completed && isValidIsoDate(item.dueDate) && classifyDate(item.dueDate, today) === 'overdue')) {
    recommendations.push({ title: `Review “${action.title}”`, reason: `Its recorded due date (${action.dueDate}) has passed and it remains incomplete.`, sourceId: action.id })
  }
  for (const action of actions.filter((item) => !item.completed && isValidIsoDate(item.dueDate) && ['due_today', 'due_soon'].includes(classifyDate(item.dueDate, today)))) {
    const status = classifyDate(action.dueDate, today)
    recommendations.push({ title: `Plan for “${action.title}”`, reason: `This incomplete action is ${status === 'due_today' ? 'due today' : `due soon (${action.dueDate})`}, according to its saved date.`, sourceId: action.id })
  }
  for (const action of actions.filter((item) => !item.completed && isValidIsoDate(item.dueDate) && classifyDate(item.dueDate, today) === 'upcoming')) {
    recommendations.push({ title: `Planned action: “${action.title}”`, reason: `This action has a future due date (${action.dueDate}) recorded.`, sourceId: action.id })
  }
  for (const item of dates.filter((date) => !date.resolved && isValidIsoDate(date.date))) {
    const status = classifyDeadline(item.date, today)
    if (['due_today', 'due_soon'].includes(status)) {
      recommendations.push({ title: `Review ${item.type.replaceAll('_', ' ')}`, reason: `This recorded date is ${statusLabel(status).toLowerCase()} (${item.date}). Check your saved note or original terms.`, sourceId: item.id })
    } else if (item.type === 'expected_refund' && status === 'deadline_passed') {
      recommendations.push({ title: 'Check the refund status', reason: `The recorded expected-refund date (${item.date}) has passed; the app cannot verify payment or delay.`, sourceId: item.id })
    }
  }
  if (!dates.some((item) => isValidIsoDate(item.date)) && !actions.some((item) => isValidIsoDate(item.dueDate))) {
    recommendations.push({ title: 'No deadline recorded', reason: 'No valid important date is saved for this commitment. The app cannot infer one.' })
  }
  if (actions.some((item) => !item.completed && !isValidIsoDate(item.dueDate))) {
    recommendations.push({ title: 'Some actions have no due date', reason: 'Their timeliness cannot be assessed from the saved record.' })
  }
  if (!recommendations.length) recommendations.push({ title: 'No immediate next step identified', reason: 'Based on the recorded dates and action statuses, no rule in this view currently signals an action. This is not a guarantee about external terms.' })
  return recommendations
}

export function simulateActionCompletion(commitment, actionId, today) {
  const action = (commitment.actions ?? []).find((item) => item.id === actionId)
  if (!action) return { ok: false, error: 'Choose a saved action to simulate.' }
  if (action.completed) return { ok: false, error: 'This action is already marked complete.' }
  const simulated = { ...commitment, actions: commitment.actions.map((item) => item.id === actionId ? { ...item, completed: true } : item) }
  return { ok: true, commitment: simulated, before: statusLabel(classifyDate(action.dueDate, today)), after: 'Completed', recommendations: getCommitmentRecommendations(simulated, today) }
}

export function simulateActionDate(commitment, actionId, newDate, today) {
  const action = (commitment.actions ?? []).find((item) => item.id === actionId)
  if (!action) return { ok: false, error: 'Choose a saved action to simulate.' }
  if (!isValidIsoDate(action.dueDate)) return { ok: false, error: 'This action has no valid planned date to move.' }
  if (!isValidIsoDate(newDate)) return { ok: false, error: 'Choose a valid calendar date for the simulation.' }
  const simulated = { ...commitment, actions: commitment.actions.map((item) => item.id === actionId ? { ...item, dueDate: newDate } : item) }
  return { ok: true, commitment: simulated, before: statusLabel(classifyDate(action.dueDate, today)), after: statusLabel(classifyDate(newDate, today)), recommendations: getCommitmentRecommendations(simulated, today) }
}

export function postponeDateByWeek(isoDate) {
  return isValidIsoDate(isoDate) ? offsetDate(isoDate, 7) : ''
}

export function getAcceptedEvidence(commitment) {
  const stored = (commitment.documentEvidence ?? []).filter((item) => typeof item.quote === 'string' && item.quote.length > 0)
  const legacy = []
  for (const item of commitment.importantDates ?? []) {
    if (item.note) legacy.push(...parseLegacyEvidence(item.note, { id: item.id, title: item.type.replaceAll('_', ' '), type: 'deadline', extractedValue: item.date }))
  }
  for (const item of commitment.actions ?? []) {
    if (item.note) legacy.push(...parseLegacyEvidence(item.note, { id: item.id, title: item.title, type: 'action', extractedValue: item.title }))
  }
  if (commitment.financialExposure?.notes) legacy.push(...parseLegacyEvidence(commitment.financialExposure.notes, { id: 'financial-notes', type: 'financial', extractedValue: '' }))
  const known = new Set(stored.map((item) => `${item.title}:${item.quote}`))
  return [...stored, ...legacy.filter((item) => !known.has(`${item.title}:${item.quote}`))]
}

function parseLegacyEvidence(note, defaults) {
  const output = []
  const pattern = /Source: “([^”]*)”/g
  for (const match of note.matchAll(pattern)) {
    const prefix = note.slice(0, match.index)
    const labeled = /Evidence for ([^:\n]+):\s*$/.exec(prefix)
    const lineTitle = /(?:^|\n)([^:\n]+):[^\n]*$/.exec(prefix)
    output.push({
      id: `legacy-evidence-${defaults.id}-${match.index}`,
      title: labeled?.[1]?.trim() ?? defaults.title ?? lineTitle?.[1]?.trim() ?? 'Saved document finding',
      type: defaults.type,
      extractedValue: defaults.extractedValue,
      quote: match[1],
      confidence: 'Not recorded for this older finding',
      sourceDocumentTitle: 'Original document title not retained',
      reviewNote: '',
      legacy: true,
    })
  }
  return output
}
