import { createId } from './ids.js'
import { isValidIsoDate } from './format.js'

export function buildFindingSavePlan(commitment, findings, decisions = {}) {
  const record = structuredClone(commitment)
  record.importantDates ??= []
  record.actions ??= []
  record.documentEvidence ??= []
  record.financialExposure ??= { refundableAmount: null, depositAmount: null, expectedRefundAmount: null, potentialCharge: null, notes: '' }
  const collisions = []
  let added = 0
  const notes = []
  for (const finding of findings.filter((item) => item.reviewStatus === 'accepted' && !item.saved)) {
    const decision = decisions[finding.id] ?? 'keep'
    const note = `Source: “${finding.evidence.quote}”${finding.notes ? `\nReview note: ${finding.notes}` : ''}`
    const evidenceKey = `${finding.type}:${finding.title}:${finding.extractedValue}:${finding.evidence.quote}:${finding.sourceDocumentTitle ?? ''}`
    const hasEvidence = record.documentEvidence.some((item) => `${item.type}:${item.title}:${item.extractedValue}:${item.quote}:${item.sourceDocumentTitle ?? ''}` === evidenceKey)
    if (!hasEvidence) record.documentEvidence.push({
      id: createId('evidence'),
      title: finding.title,
      type: finding.type,
      extractedValue: String(finding.extractedValue ?? ''),
      dateType: finding.dateType ?? null,
      amount: finding.amount ?? null,
      currency: finding.currency ?? null,
      financialKind: finding.financialKind ?? null,
      sourceDocumentTitle: finding.sourceDocumentTitle ?? '',
      quote: finding.evidence.quote,
      confidence: finding.confidence,
      reviewNote: finding.notes ?? '',
      acceptedAt: new Date().toISOString(),
    })
    if (finding.type === 'deadline') {
      if (finding.valueType !== 'date' || !isValidIsoDate(finding.extractedValue)) {
        notes.push(`${finding.title}: relative or ambiguous date retained in notes; no exact date was added.`)
      } else {
        const matches = record.importantDates.filter((item) => item.type === finding.dateType)
        const exact = matches.find((item) => item.date === finding.extractedValue)
        if (exact) { collisions.push({ id: finding.id, kind: 'date_duplicate', label: `${finding.title} already exists on ${exact.date}.` }); continue }
        if (matches.length) {
          collisions.push({ id: finding.id, kind: 'date_conflict', label: `${finding.title} conflicts with ${matches.map((item) => item.date).join(', ')}.`, choices: ['keep', 'add', 'replace'] })
          if (decision === 'keep') continue
          if (decision === 'replace') record.importantDates = record.importantDates.filter((item) => item.type !== finding.dateType)
          else if (decision !== 'add') continue
        }
        record.importantDates.push({ id: createId('date'), type: finding.dateType, date: finding.extractedValue, note })
        added++
      }
      if (finding.requiredAction) appendAction(record, finding.requiredAction, isValidIsoDate(finding.extractedValue) ? finding.extractedValue : null, note, collisions, finding, decisions, () => { added++ })
    } else if (finding.type === 'action' || finding.type === 'requirement') {
      appendAction(record, finding.requiredAction || finding.extractedValue, null, note, collisions, finding, decisions, () => { added++ })
    } else if (finding.type === 'financial' && finding.amount !== null) {
      const target = { deposit: 'depositAmount', expected_refund: 'expectedRefundAmount', fee: 'potentialCharge' }[finding.financialKind]
      if (target) {
        const existing = record.financialExposure[target]
        if (existing !== null && existing !== undefined && Number(existing) === Number(finding.amount) && finding.currency === record.currency) {
          collisions.push({ id: finding.id, kind: 'money_duplicate', label: `${finding.title} (${finding.currency} ${finding.amount}) is already recorded.` })
          continue
        }
        if (existing !== null && existing !== undefined && Number(existing) !== Number(finding.amount)) {
          collisions.push({ id: finding.id, kind: 'money_conflict', label: `${finding.title} (${record.currency} ${existing}) differs from extracted ${finding.currency ?? 'unknown currency'} ${finding.amount}.`, choices: ['keep', 'replace'] })
          if (decision !== 'replace') continue
        }
        if (finding.currency && finding.currency !== record.currency) { notes.push(`${finding.title}: ${finding.currency} ${finding.amount} not put in ${record.currency} field; preserved in notes.\n${note}`) }
        else { record.financialExposure[target] = finding.amount; notes.push(`Evidence for ${finding.title}: ${note}`); added++ }
      } else notes.push(`${finding.title}: ${finding.currency ?? 'Currency unknown'} ${finding.amount}${finding.financialKind === 'recurring_charge' ? ' (recurring charge; billing cadence is not represented in the financial fields)' : ` (${finding.financialKind})`}; preserved in notes, not assigned to purchase amount.\n${note}`)
    } else {
      notes.push(`${finding.title}: ${finding.extractedValue}\n${note}`)
    }
  }
  if (notes.length) record.financialExposure.notes = [record.financialExposure.notes, ...notes].filter(Boolean).join('\n')
  record.updatedAt = new Date().toISOString()
  return { record, collisions, added }
}

function appendAction(record, title, dueDate, note, collisions, finding, decisions, onAdd) {
  const existing = record.actions.find((action) => action.title.trim().toLowerCase() === title.trim().toLowerCase())
  if (existing) {
    collisions.push({ id: finding.id, kind: 'action_duplicate', label: `Action already exists: “${existing.title}”.` })
    return
  }
  record.actions.push({ id: createId('act'), title, dueDate, completed: false, note })
  onAdd()
}
