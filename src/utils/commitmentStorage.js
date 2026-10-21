import { createId } from './ids.js'
import { normalizeCommitment, validateCommitments } from './commitmentValidation.js'

export const STORAGE_KEY = 'obligation-lens-commitments'
export const SCHEMA_VERSION = 1
export const APPLICATION_ID = 'Obligation Lens'

export function readCommitments() {
  let raw
  try {
    if (typeof localStorage === 'undefined') {
      return { ok: false, missing: true, data: [], error: 'Browser storage is not available on this device.' }
    }
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return { ok: false, missing: true, data: [], error: 'Saved commitments could not be accessed in this browser.' }
  }
  if (raw === null) return { ok: true, missing: true, data: [] }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, missing: false, data: [], error: 'Saved data is not valid JSON. The original stored value has been preserved.' }
  }

  if (Array.isArray(parsed)) return migrateLegacyArray(parsed)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, missing: false, data: [], error: 'Saved data has an unsupported structure. The original value has been preserved.' }
  }
  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, missing: false, data: [], error: `Saved data uses schema version ${parsed.schemaVersion ?? 'unknown'}, which this version cannot safely read. The original value has been preserved.` }
  }
  if (parsed.application !== APPLICATION_ID) {
    return { ok: false, missing: false, data: [], error: 'Saved data belongs to an unrecognized application. The original value has been preserved.' }
  }

  const validation = validateCommitments(parsed.commitments)
  if (!validation.valid) {
    return { ok: false, missing: false, data: [], error: describeValidationErrors(validation.errors, 'Saved commitments') }
  }
  const relationships = Array.isArray(parsed.relationships) ? parsed.relationships : []
  const validRelationships = validateRelationships(validation.records, relationships)
  if (!validRelationships.valid) return { ok: false, missing: false, data: [], error: describeValidationErrors(validRelationships.errors, 'Saved relationships') }
  return { ok: true, missing: false, data: validation.records, relationships: validRelationships.records }
}

export function getAllCommitments() {
  return readCommitments()
}

export function getCommitmentById(id) {
  const result = readCommitments()
  if (!result.ok) return result
  return { ...result, data: result.data.find((record) => record.id === id) ?? null }
}

export function writeCommitments(records) {
  const validation = validateCommitments(records)
  if (!validation.valid) return { ok: false, error: describeValidationErrors(validation.errors, 'Commitments') }
  return writeValidated(validation.records, readCommitments().relationships ?? [])
}

export function writeRelationships(records, relationships) {
  const current = readCurrentRecords(records)
  if (!current.ok) return current
  const checked = validateRelationships(current.data, relationships)
  if (!checked.valid) return { ok: false, error: describeValidationErrors(checked.errors, 'Relationships') }
  return writeValidated(current.data, checked.records)
}

export function mergeDemoData(currentRecords, demoRecords, demoRelationships) {
  const source = readCurrentRecords(currentRecords)
  if (!source.ok) return source
  const incoming = validateCommitments(demoRecords)
  if (!incoming.valid) return { ok: false, error: describeValidationErrors(incoming.errors, 'Demo commitments') }
  const existingById = new Map(source.data.map((record) => [record.id, record]))
  for (const record of incoming.records) {
    const existing = existingById.get(record.id)
    if (existing && (existing.referenceId !== record.referenceId || existing.source !== 'sample')) {
      return { ok: false, error: `A saved record conflicts with demo ID ${record.id}. Nothing was changed.` }
    }
  }
  const toAdd = incoming.records.filter((record) => !existingById.has(record.id))
  const records = [...source.data, ...toAdd]
  const relationshipMap = new Map(source.relationships.map((edge) => [edge.id, edge]))
  for (const edge of demoRelationships) {
    const current = relationshipMap.get(edge.id)
    if (current && (itemKey(current.prerequisite) !== itemKey(edge.prerequisite) || itemKey(current.dependent) !== itemKey(edge.dependent))) {
      return { ok: false, error: `A saved relationship conflicts with demo ID ${edge.id}. Nothing was changed.` }
    }
    if (!current) relationshipMap.set(edge.id, edge)
  }
  const links = validateRelationships(records, [...relationshipMap.values()])
  if (!links.valid) return { ok: false, error: describeValidationErrors(links.errors, 'Demo relationships') }
  const written = writeValidated(records, links.records)
  return written.ok ? { ...written, added: toAdd.length, addedRelationships: links.records.length - source.relationships.length, alreadyLoaded: toAdd.length === 0 && links.records.length === source.relationships.length } : written
}

export function removeStoredCommitments(currentRecords, ids) {
  const source = readCurrentRecords(currentRecords)
  if (!source.ok) return source
  const remove = new Set(ids)
  const data = source.data.filter((record) => !remove.has(record.id))
  const validIds = collectItemIds(data)
  const relationships = source.relationships.filter((edge) => validIds.has(itemKey(edge.prerequisite)) && validIds.has(itemKey(edge.dependent)))
  const written = writeValidated(data, relationships)
  return written.ok ? { ...written, removed: source.data.length - data.length } : written
}

export function createStoredCommitment(currentRecords, record) {
  const source = readCurrentRecords(currentRecords)
  if (!source.ok) return source
  const normalized = normalizeCommitment(record)
  if (!normalized.ok) return { ok: false, error: describeValidationErrors([{ index: 0, errors: normalized.errors }], 'Commitment') }
  if (source.data.some((item) => item.id === normalized.record.id)) {
    return { ok: false, error: 'A commitment with that ID already exists. Nothing was saved.' }
  }
  const possibleDuplicate = source.data.find((item) => isLikelyDuplicate(item, normalized.record))
  if (possibleDuplicate) {
    return { ok: false, error: `A similar commitment (“${possibleDuplicate.title}”) is already saved. Open it to update the existing record, or change the merchant/reference details if this is a separate purchase.` }
  }
  return writeValidated([...source.data, normalized.record], source.relationships)
}

export function updateStoredCommitment(currentRecords, record, expectedUpdatedAt) {
  const source = readCurrentRecords(currentRecords)
  if (!source.ok) return source
  const index = source.data.findIndex((item) => item.id === record.id)
  if (index < 0) return { ok: false, error: 'That commitment could not be found, so nothing was changed.' }
  const current = source.data[index]
  if (expectedUpdatedAt !== undefined && current.updatedAt !== expectedUpdatedAt) {
    return { ok: false, error: 'This commitment changed in another tab. Reload the latest version before saving your edits.' }
  }
  const normalized = normalizeCommitment({
    ...record,
    id: current.id,
    createdAt: current.createdAt ?? record.createdAt,
    updatedAt: new Date().toISOString(),
  })
  if (!normalized.ok) return { ok: false, error: describeValidationErrors([{ index, errors: normalized.errors }], 'Commitment') }
  const possibleDuplicate = source.data.find((item) => item.id !== current.id && isLikelyDuplicate(item, normalized.record))
  if (possibleDuplicate) {
    return { ok: false, error: `Another commitment (“${possibleDuplicate.title}”) has the same identifying details. Nothing was changed.` }
  }
  const next = [...source.data]
  next[index] = normalized.record
  const validIds = collectItemIds(next)
  return writeValidated(next, source.relationships.filter((edge) => validIds.has(itemKey(edge.prerequisite)) && validIds.has(itemKey(edge.dependent))))
}

export function deleteStoredCommitment(currentRecords, id) {
  const source = readCurrentRecords(currentRecords)
  if (!source.ok) return source
  if (!source.data.some((item) => item.id === id)) {
    return { ok: false, error: 'That commitment could not be found, so nothing was deleted.' }
  }
  const next = source.data.filter((item) => item.id !== id)
  const validIds = collectItemIds(next)
  return writeValidated(next, source.relationships.filter((edge) => validIds.has(itemKey(edge.prerequisite)) && validIds.has(itemKey(edge.dependent))))
}

export function replaceAllCommitments(records, relationships = []) {
  const validation = validateCommitments(records)
  if (!validation.valid) return { ok: false, error: describeValidationErrors(validation.errors, 'Commitments') }
  const edges = validateRelationships(validation.records, relationships)
  if (!edges.valid) return { ok: false, error: describeValidationErrors(edges.errors, 'Relationships') }
  return writeValidated(validation.records, edges.records)
}

export function exportCommitments(records) {
  const validation = validateCommitments(records)
  if (!validation.valid) return { ok: false, error: describeValidationErrors(validation.errors, 'Commitments') }
  try {
    return {
      ok: true,
      contents: JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        application: APPLICATION_ID,
        commitments: validation.records,
        relationships: readCommitments().relationships ?? [],
      }, null, 2),
    }
  } catch {
    return { ok: false, error: 'The backup could not be prepared.' }
  }
}

export function previewImportCommitments(fileContents) {
  let parsed
  try {
    parsed = JSON.parse(fileContents)
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' }
  }

  let records
  let relationships = []
  if (Array.isArray(parsed)) {
    records = parsed
  } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    if (parsed.application !== APPLICATION_ID) return { ok: false, error: 'This backup does not identify itself as an Obligation Lens file.' }
    if (parsed.schemaVersion !== SCHEMA_VERSION) return { ok: false, error: `Backup schema version ${parsed.schemaVersion ?? 'unknown'} is not supported.` }
    if (parsed.exportedAt !== undefined && (typeof parsed.exportedAt !== 'string' || !Number.isFinite(Date.parse(parsed.exportedAt)))) return { ok: false, error: 'The backup export timestamp is invalid.' }
    if (!Array.isArray(parsed.commitments)) return { ok: false, error: 'The backup does not contain a commitments list.' }
    records = parsed.commitments
    relationships = parsed.relationships ?? []
  } else {
    return { ok: false, error: 'The file must contain an Obligation Lens backup or a legacy commitments list.' }
  }

  const seenIds = new Set()
  const valid = []
  const invalid = []
  records.forEach((record, index) => {
    const result = normalizeCommitment(record)
    if (!result.ok) {
      invalid.push({ index, title: record?.title ?? '', errors: result.errors })
      return
    }
    if (seenIds.has(result.record.id)) {
      invalid.push({ index, title: result.record.title, errors: ['Commitment ID is duplicated in this file.'] })
      return
    }
    seenIds.add(result.record.id)
    valid.push(result.record)
  })
  const checkedRelationships = validateRelationships(valid, relationships)
  return { ok: true, valid, invalid, relationships: checkedRelationships.valid ? checkedRelationships.records : [], invalidRelationships: checkedRelationships.valid ? [] : checkedRelationships.errors, total: records.length, legacy: Array.isArray(parsed) }
}

export function applyImport(existing, imported, { mode, conflictStrategy = 'keep_existing', relationships = [], currentRelationships = [] }) {
  const checked = validateCommitments(existing)
  if (!checked.valid) return { ok: false, error: describeValidationErrors(checked.errors, 'Current commitments') }
  const incoming = validateCommitments(imported)
  if (!incoming.valid) return { ok: false, error: describeValidationErrors(incoming.errors, 'Imported commitments') }

  if (mode === 'replace') {
    const edges = validateRelationships(incoming.records, relationships)
    if (!edges.valid) return { ok: false, error: describeValidationErrors(edges.errors, 'Imported relationships') }
    return { ok: true, records: incoming.records, relationships: edges.records, added: incoming.records.length, skipped: 0, replaced: existing.length }
  }
  if (mode !== 'merge') return { ok: false, error: 'Choose merge or replace.' }
  if (!['keep_existing', 'import_new', 'skip'].includes(conflictStrategy)) return { ok: false, error: 'Choose a valid conflict option.' }

  const records = [...checked.records]
  const existingById = new Set(records.map((item) => item.id))
  let added = 0
  let skipped = 0
  for (const record of incoming.records) {
    const idConflict = existingById.has(record.id)
    const matchingRecord = records.find((item) => isLikelyDuplicate(item, record))
    if (!idConflict && !matchingRecord) {
      records.push(record)
      existingById.add(record.id)
      added++
      continue
    }
    if (conflictStrategy === 'import_new') {
      const copy = regenerateRecordIds(record)
      records.push(copy)
      existingById.add(copy.id)
      added++
    } else {
      skipped++
    }
  }
  const itemIds = collectItemIds(records)
  const applicable = [...currentRelationships, ...relationships.filter((edge) => itemIds.has(itemKey(edge.prerequisite)) && itemIds.has(itemKey(edge.dependent))).map((edge) => ({ ...edge, id: currentRelationships.some((current) => current.id === edge.id) ? createId('rel') : edge.id }))]
  const edges = validateRelationships(records, applicable)
  return { ok: true, records, relationships: edges.valid ? edges.records : checkedRelationshipsForMerge(records, relationships), added, skipped, replaced: 0 }
}

export function applyImportToStorage(currentRecords, imported, options) {
  const source = readCurrentRecords(currentRecords)
  if (!source.ok) return source
  const applied = applyImport(source.data, imported, { ...options, currentRelationships: source.relationships })
  if (!applied.ok) return applied
  const written = writeValidated(applied.records, applied.relationships)
  return written.ok ? { ...applied, data: written.data } : written
}

function migrateLegacyArray(records) {
  const validation = validateCommitments(records)
  if (!validation.valid) {
    return { ok: false, missing: false, data: [], error: describeValidationErrors(validation.errors, 'Legacy saved data') }
  }
  const migrated = writeValidated(validation.records)
  if (!migrated.ok) {
    return { ok: true, missing: false, data: validation.records, warning: `${migrated.error} The original legacy value remains intact.` }
  }
  return { ok: true, missing: false, data: validation.records, migrated: true }
}

function readCurrentRecords(fallback) {
  const latest = readCommitments()
  if (latest.ok) return { ok: true, data: latest.data, relationships: latest.relationships ?? [] }
  if (latest.missing) return { ok: true, data: fallback, relationships: [] }
  return { ok: false, error: latest.error }
}

function writeValidated(records, relationships = []) {
  try {
    if (typeof localStorage === 'undefined') return { ok: false, error: 'Browser storage is unavailable, so this change was not saved.' }
    const serialized = JSON.stringify({ schemaVersion: SCHEMA_VERSION, application: APPLICATION_ID, commitments: records, relationships })
    localStorage.setItem(STORAGE_KEY, serialized)
    return { ok: true, data: records, relationships }
  } catch (error) {
    const full = typeof DOMException !== 'undefined' && error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22)
    return { ok: false, error: full ? 'Browser storage is full, so this change was not saved.' : 'This change could not be saved in browser storage.' }
  }
}

export function validateRelationships(commitments, relationships) {
  const available = collectItemIds(commitments)
  const ids = new Set()
  const errors = []
  const records = []
  if (!Array.isArray(relationships)) return { valid: false, errors: [{ errors: ['Relationships must be a list.'] }], records: [] }
  relationships.forEach((edge, index) => {
    const validItem = (item) => item && ['commitment', 'action'].includes(item.type) && typeof item.id === 'string' && available.has(itemKey(item))
    if (!edge || typeof edge.id !== 'string' || ids.has(edge.id) || !validItem(edge.prerequisite) || !validItem(edge.dependent) || itemKey(edge.prerequisite) === itemKey(edge.dependent)) {
      errors.push({ index, errors: ['Relationship has an invalid or missing endpoint, duplicate ID, or self-reference.'] })
      return
    }
    const target = itemKey(edge.prerequisite)
    const start = itemKey(edge.dependent)
    const outgoing = new Map()
    records.forEach((existing) => outgoing.set(itemKey(existing.prerequisite), [...(outgoing.get(itemKey(existing.prerequisite)) ?? []), itemKey(existing.dependent)]))
    const pending = [start]
    const visited = new Set()
    let cycle = false
    while (pending.length) {
      const current = pending.pop()
      if (current === target) { cycle = true; break }
      if (visited.has(current)) continue
      visited.add(current)
      pending.push(...(outgoing.get(current) ?? []))
    }
    if (cycle) { errors.push({ index, errors: ['Relationship creates a dependency cycle.'] }); return }
    ids.add(edge.id)
    records.push({ id: edge.id, prerequisite: edge.prerequisite, dependent: edge.dependent, createdAt: edge.createdAt ?? new Date().toISOString() })
  })
  return { valid: errors.length === 0, errors, records }
}

function itemKey(item) { return `${item.type}:${item.id}` }
function collectItemIds(records) {
  return new Set(records.flatMap((record) => [{ type: 'commitment', id: record.id }, ...(record.actions ?? []).map((action) => ({ type: 'action', id: action.id }))].map(itemKey)))
}

function checkedRelationshipsForMerge(records, relationships) {
  const available = collectItemIds(records)
  return validateRelationships(records, relationships.filter((edge) => available.has(itemKey(edge.prerequisite)) && available.has(itemKey(edge.dependent)))).records
}

function regenerateRecordIds(record) {
  const actionIds = new Map((record.actions ?? []).map((action) => [action.id, createId('act')]))
  const dateIds = new Map((record.importantDates ?? []).map((date) => [date.id, createId('date')]))
  return {
    ...record,
    id: createId('cmt'),
    actions: (record.actions ?? []).map((action) => ({ ...action, id: actionIds.get(action.id) })),
    importantDates: (record.importantDates ?? []).map((date) => ({ ...date, id: dateIds.get(date.id) })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function isLikelyDuplicate(first, second) {
  const normalize = (value) => String(value ?? '').trim().toLocaleLowerCase()
  if (normalize(first.title) !== normalize(second.title) || first.category !== second.category) return false
  const firstMerchant = normalize(first.merchant)
  const secondMerchant = normalize(second.merchant)
  if (!firstMerchant || firstMerchant !== secondMerchant || first.commitmentDate !== second.commitmentDate) return false
  const firstReference = normalize(first.referenceId)
  const secondReference = normalize(second.referenceId)
  return firstReference === secondReference
}

function describeValidationErrors(errors, label) {
  const first = errors[0]
  if (!first) return `${label} are invalid.`
  const location = first.index === undefined ? '' : ` Record ${first.index + 1}:`
  return `${label} could not be saved safely.${location} ${(first.errors ?? []).join(' ')}`
}
