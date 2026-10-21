export const STORAGE_KEY = 'obligation-lens-commitments'

export function readCommitments() {
  try {
    if (typeof localStorage === 'undefined') {
      return {
        ok: false,
        missing: true,
        data: [],
        error: 'Browser storage is not available, so commitments cannot be saved on this device.',
      }
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      return { ok: true, missing: true, data: [] }
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return {
        ok: false,
        missing: false,
        data: [],
        error: 'Saved commitments could not be read because the stored data is not a list.',
      }
    }
    return { ok: true, missing: false, data: clone(parsed) }
  } catch {
    return {
      ok: false,
      missing: false,
      data: [],
      error: 'Saved commitments could not be read. Existing records were left unchanged.',
    }
  }
}

export function writeCommitments(commitments) {
  try {
    if (typeof localStorage === 'undefined') {
      return {
        ok: false,
        error: 'Browser storage is not available, so this change was not saved.',
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(commitments))
    return { ok: true }
  } catch (error) {
    const full =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.code === 22)
    return {
      ok: false,
      error: full
        ? 'This browser is out of storage space, so the commitment was not saved.'
        : 'The commitment could not be saved in this browser.',
    }
  }
}

export function createStoredCommitment(commitments, record) {
  return writeCommitments([...commitments, clone(record)])
}

export function updateStoredCommitment(commitments, record) {
  const next = commitments.map((item) => (item.id === record.id ? clone(record) : item))
  if (!next.some((item) => item.id === record.id)) {
    return { ok: false, error: 'That commitment could not be found, so nothing was changed.' }
  }
  return writeCommitments(next)
}

export function deleteStoredCommitment(commitments, id) {
  const next = commitments.filter((item) => item.id !== id)
  if (next.length === commitments.length) {
    return { ok: false, error: 'That commitment could not be found, so nothing was deleted.' }
  }
  return writeCommitments(next)
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}
