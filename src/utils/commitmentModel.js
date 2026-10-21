import { DATE_TYPES } from '../data/catalog.js'
import { createId } from './ids.js'
import { isValidIsoDate, todayIso } from './format.js'

const DATE_TYPE_VALUES = new Set(DATE_TYPES.map((item) => item.value))

export function emptyDateRow() {
  return {
    key: createId('date-row'),
    type: 'custom',
    date: '',
    note: '',
  }
}

export function emptyActionRow() {
  return {
    key: createId('action-row'),
    title: '',
    dueDate: '',
    note: '',
    completed: false,
  }
}

export function emptyCommitmentForm(now = new Date()) {
  return {
    title: '',
    category: 'purchase',
    amount: '',
    currency: 'INR',
    commitmentDate: todayIso(now),
    merchant: '',
    referenceId: '',
    channel: 'online',
    description: '',
    importantDates: [],
    financialExposure: {
      refundableAmount: '',
      depositAmount: '',
      expectedRefundAmount: '',
      potentialCharge: '',
      notes: '',
    },
    actions: [],
    documentEvidence: [],
    status: 'active',
  }
}

export function formFromCommitment(commitment) {
  return {
    title: commitment.title ?? '',
    category: commitment.category ?? 'purchase',
    amount: stringifyNumber(commitment.amount),
    currency: commitment.currency ?? 'INR',
    commitmentDate: commitment.commitmentDate ?? '',
    merchant: commitment.merchant ?? '',
    referenceId: commitment.referenceId ?? '',
    channel: commitment.channel ?? 'online',
    description: commitment.description ?? '',
    importantDates: (commitment.importantDates ?? []).map((item) => ({
      key: item.id ?? createId('date-row'),
      id: item.id,
      type: DATE_TYPE_VALUES.has(item.type) ? item.type : 'custom',
      date: item.date ?? '',
      note: item.note ?? '',
      resolved: Boolean(item.resolved),
    })),
    financialExposure: {
      refundableAmount: stringifyNumber(commitment.financialExposure?.refundableAmount),
      depositAmount: stringifyNumber(commitment.financialExposure?.depositAmount),
      expectedRefundAmount: stringifyNumber(
        commitment.financialExposure?.expectedRefundAmount,
      ),
      potentialCharge: stringifyNumber(commitment.financialExposure?.potentialCharge),
      notes: commitment.financialExposure?.notes ?? '',
    },
    actions: (commitment.actions ?? []).map((item) => ({
      key: item.id ?? createId('action-row'),
      id: item.id,
      title: item.title ?? '',
      dueDate: item.dueDate ?? '',
      note: item.note ?? '',
      completed: Boolean(item.completed),
    })),
    documentEvidence: structuredCloneSafe(commitment.documentEvidence ?? []),
    status: commitment.status ?? 'active',
  }
}

export function validateCommitmentForm(form) {
  const errors = {}
  const warnings = {}
  const title = form.title.trim()

  if (!title) {
    errors.title = 'Enter a title so you can recognise this commitment later.'
  }

  const amount = parseMoneyInput(form.amount, { required: true })
  if (amount.error) errors.amount = amount.error

  if (!form.currency) {
    errors.currency = 'Choose a currency.'
  }

  if (!form.commitmentDate) {
    errors.commitmentDate = 'Enter the purchase or commitment date.'
  } else if (!isValidIsoDate(form.commitmentDate)) {
    errors.commitmentDate = 'Enter a real calendar date.'
  }

  const dateErrors = {}
  const dateWarnings = {}
  form.importantDates.forEach((row, index) => {
    const rowErrors = {}
    if (!DATE_TYPE_VALUES.has(row.type)) {
      rowErrors.type = 'Choose a date type.'
    }
    if (!row.date) {
      rowErrors.date = 'Enter a date or remove this row.'
    } else if (!isValidIsoDate(row.date)) {
      rowErrors.date = 'Enter a real calendar date.'
    } else if (
      isValidIsoDate(form.commitmentDate) &&
      row.date < form.commitmentDate
    ) {
      dateWarnings[index] = {
        date: 'This deadline is before the commitment date. Check it before saving — it will not be changed for you.',
      }
    }
    if (Object.keys(rowErrors).length) dateErrors[index] = rowErrors
  })
  if (Object.keys(dateErrors).length) errors.importantDates = dateErrors
  if (Object.keys(dateWarnings).length) warnings.importantDates = dateWarnings

  const moneyFields = [
    'refundableAmount',
    'depositAmount',
    'expectedRefundAmount',
    'potentialCharge',
  ]
  const financialErrors = {}
  moneyFields.forEach((field) => {
    const parsed = parseMoneyInput(form.financialExposure[field], { required: false })
    if (parsed.error) financialErrors[field] = parsed.error
  })
  if (Object.keys(financialErrors).length) {
    errors.financialExposure = financialErrors
  }

  const actionErrors = {}
  form.actions.forEach((row, index) => {
    const rowErrors = {}
    if (!row.title.trim()) {
      rowErrors.title = 'Enter an action title or remove this row.'
    }
    if (row.dueDate && !isValidIsoDate(row.dueDate)) {
      rowErrors.dueDate = 'Enter a real calendar date, or leave this blank.'
    }
    if (Object.keys(rowErrors).length) actionErrors[index] = rowErrors
  })
  if (Object.keys(actionErrors).length) errors.actions = actionErrors

  return {
    errors,
    warnings,
    isValid: Object.keys(errors).length === 0,
  }
}

export function buildCommitmentRecord(form, { existing } = {}) {
  const now = new Date().toISOString()
  const amount = parseMoneyInput(form.amount, { required: true }).value ?? 0

  return {
    id: existing?.id ?? createId('cmt'),
    source: existing?.source === 'sample' ? 'sample' : 'user',
    title: form.title.trim(),
    category: form.category,
    amount,
    currency: form.currency,
    commitmentDate: form.commitmentDate,
    merchant: form.merchant.trim(),
    referenceId: form.referenceId.trim(),
    channel: form.channel,
    description: form.description.trim(),
    importantDates: form.importantDates
      .filter((row) => row.date)
      .map((row) => ({
        id: row.id ?? createId('date'),
        type: row.type,
        date: row.date,
        note: row.note.trim(),
        ...(row.resolved ? { resolved: true } : {}),
      })),
    financialExposure: {
      refundableAmount: parseMoneyInput(form.financialExposure.refundableAmount).value,
      depositAmount: parseMoneyInput(form.financialExposure.depositAmount).value,
      expectedRefundAmount: parseMoneyInput(
        form.financialExposure.expectedRefundAmount,
      ).value,
      potentialCharge: parseMoneyInput(form.financialExposure.potentialCharge).value,
      notes: form.financialExposure.notes.trim(),
    },
    actions: form.actions
      .filter((row) => row.title.trim())
      .map((row) => ({
        id: row.id ?? createId('act'),
        title: row.title.trim(),
        dueDate: row.dueDate || null,
        note: row.note?.trim() ?? '',
        completed: Boolean(row.completed),
      })),
    documentEvidence: structuredCloneSafe(form.documentEvidence ?? []),
    status: form.status || 'active',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

export function getNearestUpcomingDate(commitment, asOf) {
  const dates = (commitment.importantDates ?? [])
    .filter((item) => isValidIsoDate(item.date))
    .sort((a, b) => a.date.localeCompare(b.date))
  return dates.find((item) => item.date >= asOf) ?? null
}

export function getAttentionDate(commitment, asOf) {
  const dates = (commitment.importantDates ?? [])
    .filter((item) => isValidIsoDate(item.date))
    .sort((a, b) => a.date.localeCompare(b.date))
  if (!dates.length) return null
  const overdue = dates.filter((item) => item.date < asOf)
  if (overdue.length) return overdue[overdue.length - 1]
  return dates.find((item) => item.date >= asOf) ?? null
}

export function incompleteActionCount(commitment) {
  return (commitment.actions ?? []).filter((item) => !item.completed).length
}

export function parseMoneyInput(value, { required = false } = {}) {
  if (value === '' || value === null || value === undefined) {
    if (required) {
      return { error: 'Enter an amount. Use 0 if no money is involved.' }
    }
    return { value: null }
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      return { error: 'Enter a valid amount that is zero or greater.' }
    }
    return { value }
  }
  const trimmed = String(value).trim().replace(/,/g, '')
  if (!trimmed) {
    if (required) {
      return { error: 'Enter an amount. Use 0 if no money is involved.' }
    }
    return { value: null }
  }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { error: 'Enter a valid amount that is zero or greater.' }
  }
  const number = Number(trimmed)
  if (!Number.isFinite(number) || number < 0) {
    return { error: 'Enter a valid amount that is zero or greater.' }
  }
  return { value: number }
}

function stringifyNumber(value) {
  if (value === null || value === undefined || value === '') return ''
  return String(value)
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value))
}
