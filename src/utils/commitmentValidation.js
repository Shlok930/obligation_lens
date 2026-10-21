import { CATEGORIES, CURRENCIES, DATE_TYPES, STATUSES } from '../data/catalog.js'
import { isValidIsoDate } from './format.js'

const categoryValues = new Set(CATEGORIES.map((item) => item.value))
const currencyValues = new Set(CURRENCIES.map((item) => item.value))
const dateTypeValues = new Set(DATE_TYPES.map((item) => item.value))
const statusValues = new Set(STATUSES.map((item) => item.value))
const moneyFields = ['refundableAmount', 'depositAmount', 'expectedRefundAmount', 'potentialCharge']

export function validateCommitment(record) {
  const errors = []
  if (!isObject(record)) return { valid: false, errors: ['Record must be a JSON object.'] }

  const id = typeof record.id === 'string' ? record.id.trim() : ''
  const title = typeof record.title === 'string' ? record.title.trim() : ''
  if (!id) errors.push('A non-empty ID is required.')
  if (!title) errors.push('A non-empty title is required.')
  if (!categoryValues.has(record.category)) errors.push('Category is not recognized.')
  if (!currencyValues.has(record.currency)) errors.push('Currency is not supported.')
  if (!isValidMoney(record.amount)) errors.push('Amount must be a valid non-negative number.')
  if (!isValidIsoDate(record.commitmentDate)) errors.push('Commitment date must be a valid calendar date.')
  if (record.status !== undefined && !statusValues.has(record.status)) errors.push('Status is not recognized.')
  if (record.source !== undefined && !['sample', 'user'].includes(record.source)) errors.push('Record source is not recognized.')
  validateTimestamp(record.createdAt, 'createdAt', errors)
  validateTimestamp(record.updatedAt, 'updatedAt', errors)

  if (record.importantDates !== undefined && !Array.isArray(record.importantDates)) errors.push('Important dates must be a list.')
  if (record.actions !== undefined && !Array.isArray(record.actions)) errors.push('Actions must be a list.')
  if (record.documentEvidence !== undefined && !Array.isArray(record.documentEvidence)) errors.push('Document evidence must be a list.')
  const dates = Array.isArray(record.importantDates) ? record.importantDates : []
  const actions = Array.isArray(record.actions) ? record.actions : []
  const evidence = Array.isArray(record.documentEvidence) ? record.documentEvidence : []
  validateNestedIds(dates, 'Important date', errors)
  validateNestedIds(actions, 'Action', errors)
  validateNestedIds(evidence, 'Document evidence', errors)

  dates.forEach((date, index) => {
    if (!isObject(date)) { errors.push(`Important date ${index + 1} must be an object.`); return }
    if (!dateTypeValues.has(date.type)) errors.push(`Important date ${index + 1} has an unsupported type.`)
    if (!isValidIsoDate(date.date)) errors.push(`Important date ${index + 1} has an invalid date.`)
    if (date.note !== undefined && typeof date.note !== 'string') errors.push(`Important date ${index + 1} note must be text.`)
    if (date.resolved !== undefined && typeof date.resolved !== 'boolean') errors.push(`Important date ${index + 1} resolved state must be boolean.`)
  })

  actions.forEach((action, index) => {
    if (!isObject(action)) { errors.push(`Action ${index + 1} must be an object.`); return }
    if (typeof action.title !== 'string' || !action.title.trim()) errors.push(`Action ${index + 1} needs a title.`)
    if (action.dueDate !== undefined && action.dueDate !== null && !isValidIsoDate(action.dueDate)) errors.push(`Action ${index + 1} has an invalid due date.`)
    if (action.completed !== undefined && typeof action.completed !== 'boolean') errors.push(`Action ${index + 1} completion state must be boolean.`)
    if (action.note !== undefined && typeof action.note !== 'string') errors.push(`Action ${index + 1} note must be text.`)
  })

  evidence.forEach((item, index) => {
    if (!isObject(item)) { errors.push(`Document evidence ${index + 1} must be an object.`); return }
    for (const field of ['title', 'type', 'extractedValue', 'quote', 'confidence', 'acceptedAt']) {
      if (typeof item[field] !== 'string' || !item[field].trim()) errors.push(`Document evidence ${index + 1} needs ${field}.`)
    }
    for (const field of ['sourceDocumentTitle', 'reviewNote']) {
      if (item[field] !== undefined && typeof item[field] !== 'string') errors.push(`Document evidence ${index + 1} ${field} must be text.`)
    }
    if (typeof item.acceptedAt === 'string' && !Number.isFinite(Date.parse(item.acceptedAt))) errors.push(`Document evidence ${index + 1} acceptance time is invalid.`)
    if (item.amount !== undefined && item.amount !== null && !isValidMoney(item.amount)) errors.push(`Document evidence ${index + 1} amount is invalid.`)
    for (const field of ['dateType', 'currency', 'financialKind']) {
      if (item[field] !== undefined && item[field] !== null && typeof item[field] !== 'string') errors.push(`Document evidence ${index + 1} ${field} must be text.`)
    }
  })

  if (record.financialExposure !== undefined && !isObject(record.financialExposure)) errors.push('Financial exposure must be an object.')
  const exposure = isObject(record.financialExposure) ? record.financialExposure : {}
  moneyFields.forEach((field) => {
    if (exposure[field] !== undefined && exposure[field] !== null && !isValidMoney(exposure[field])) errors.push(`${field} must be a valid non-negative number.`)
  })
  if (exposure.notes !== undefined && typeof exposure.notes !== 'string') errors.push('Financial exposure notes must be text.')

  for (const field of ['merchant', 'referenceId', 'channel', 'description']) {
    if (record[field] !== undefined && typeof record[field] !== 'string') errors.push(`${field} must be text.`)
  }

  return { valid: errors.length === 0, errors }
}

export function normalizeCommitment(record) {
  const validation = validateCommitment(record)
  if (!validation.valid) return { ok: false, errors: validation.errors }

  const dates = (record.importantDates ?? []).map((date) => ({
    ...date,
    id: date.id.trim(),
    note: date.note ?? '',
    resolved: date.resolved ?? false,
  }))
  const actions = (record.actions ?? []).map((action) => ({
    ...action,
    id: action.id.trim(),
    title: action.title.trim(),
    dueDate: action.dueDate ?? null,
    note: action.note ?? '',
    completed: action.completed ?? false,
  }))
  const documentEvidence = (record.documentEvidence ?? []).map((item) => ({ ...item, id: item.id.trim() }))
  const financialExposure = Object.fromEntries(moneyFields.map((field) => [field, record.financialExposure?.[field] ?? null]))
  financialExposure.notes = record.financialExposure?.notes ?? ''

  return {
    ok: true,
    record: {
      ...record,
      id: record.id.trim(),
      title: record.title.trim(),
      source: record.source ?? 'user',
      merchant: record.merchant ?? '',
      referenceId: record.referenceId ?? '',
      channel: record.channel ?? 'other',
      description: record.description ?? '',
      importantDates: dates,
      actions,
      documentEvidence,
      financialExposure,
      status: record.status ?? 'active',
    },
  }
}

export function validateCommitments(records) {
  if (!Array.isArray(records)) return { valid: false, errors: ['Commitments must be a list.'], records: [] }
  const ids = new Set()
  const normalized = []
  const errors = []

  records.forEach((record, index) => {
    const result = normalizeCommitment(record)
    if (!result.ok) {
      errors.push({ index, id: record?.id ?? null, errors: result.errors })
      return
    }
    if (ids.has(result.record.id)) {
      errors.push({ index, id: result.record.id, errors: ['Commitment ID is duplicated.'] })
      return
    }
    ids.add(result.record.id)
    normalized.push(result.record)
  })

  return { valid: errors.length === 0, errors, records: normalized }
}

function validateNestedIds(items, label, errors) {
  const ids = new Set()
  items.forEach((item, index) => {
    const id = typeof item?.id === 'string' ? item.id.trim() : ''
    if (!id) errors.push(`${label} ${index + 1} needs a non-empty ID.`)
    else if (ids.has(id)) errors.push(`${label} ID "${id}" is duplicated.`)
    else ids.add(id)
  })
}

function validateTimestamp(value, field, errors) {
  if (value === undefined || value === null) return
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value) || !Number.isFinite(Date.parse(value))) {
    errors.push(`${field} must be a valid ISO timestamp.`)
  }
}

function isValidMoney(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
