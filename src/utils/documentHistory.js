import { createId } from './ids.js'

export const DOCUMENT_HISTORY_KEY = 'obligation-lens-document-history'

export function readDocumentHistory() {
  try {
    const raw = localStorage.getItem(DOCUMENT_HISTORY_KEY)
    if (raw === null) return { ok: true, entries: [] }
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.schemaVersion !== 1 || parsed.application !== 'Obligation Lens' || !Array.isArray(parsed.entries)) {
      return { ok: false, entries: [], error: 'Document history has an unsupported format. Its stored value was preserved.' }
    }
    return { ok: true, entries: parsed.entries.filter(isHistoryEntry) }
  } catch {
    return { ok: false, entries: [], error: 'Document history could not be read. Its stored value was preserved.' }
  }
}

export function addHistoryEntry(entry) {
  const current = readDocumentHistory()
  if (!current.ok) return current
  const next = [{
    sessionId: entry.sessionId ?? createId('doc-session'),
    documentTitle: String(entry.documentTitle ?? 'Untitled document').slice(0, 160),
    documentType: String(entry.documentType ?? 'other'),
    analyzedAt: entry.analyzedAt ?? new Date().toISOString(),
    findingCount: Number(entry.findingCount) || 0,
    acceptedCount: Number(entry.acceptedCount) || 0,
    relatedCommitmentId: entry.relatedCommitmentId ?? null,
  }, ...current.entries.filter((item) => item.sessionId !== entry.sessionId)]
  return writeHistory(next)
}

export function updateHistoryEntry(sessionId, changes) {
  const current = readDocumentHistory()
  if (!current.ok) return current
  if (!current.entries.some((entry) => entry.sessionId === sessionId)) return { ok: false, error: 'That analysis history item could not be found.' }
  return writeHistory(current.entries.map((entry) => entry.sessionId === sessionId
    ? { ...entry, acceptedCount: Math.max(0, Number(changes.acceptedCount) || 0), relatedCommitmentId: changes.relatedCommitmentId ?? entry.relatedCommitmentId }
    : entry))
}

export function removeHistoryEntry(sessionId) {
  const current = readDocumentHistory()
  if (!current.ok) return current
  return writeHistory(current.entries.filter((entry) => entry.sessionId !== sessionId))
}

export function clearDocumentHistory() {
  return writeHistory([])
}

function writeHistory(entries) {
  try {
    localStorage.setItem(DOCUMENT_HISTORY_KEY, JSON.stringify({ schemaVersion: 1, application: 'Obligation Lens', entries }))
    return { ok: true, entries }
  } catch {
    return { ok: false, error: 'Document history could not be saved in this browser.' }
  }
}

function isHistoryEntry(entry) {
  return entry && typeof entry.sessionId === 'string' && typeof entry.documentTitle === 'string' &&
    typeof entry.documentType === 'string' && typeof entry.analyzedAt === 'string' &&
    Number.isFinite(entry.findingCount) && Number.isFinite(entry.acceptedCount) &&
    (entry.relatedCommitmentId === null || typeof entry.relatedCommitmentId === 'string') &&
    !Object.hasOwn(entry, 'sourceText') && !Object.hasOwn(entry, 'documentText')
}
