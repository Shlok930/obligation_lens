import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SAMPLE_COMMITMENTS } from '../data/mockData.js'
import {
  createStoredCommitment,
  applyImportToStorage,
  deleteStoredCommitment,
  readCommitments,
  replaceAllCommitments as replaceStoredCommitments,
  updateStoredCommitment,
  writeRelationships,
  mergeDemoData,
  removeStoredCommitments,
} from '../utils/commitmentStorage.js'

const CommitmentContext = createContext(null)

export function CommitmentProvider({ children }) {
  const [commitments, setCommitments] = useState([])
  const [relationships, setRelationships] = useState([])
  const [storageError, setStorageError] = useState(null)
  const [flash, setFlash] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const result = readCommitments()
    if (!result.ok) {
      setStorageError(result.error)
      setReady(true)
      return
    }
    if (result.missing) {
      setCommitments([])
      setReady(true)
      return
    }
    setCommitments(result.data)
    setRelationships(result.relationships ?? [])
    if (result.warning) setStorageError(result.warning)
    setReady(true)
  }, [])

  useEffect(() => {
    function synchronize(event) {
      if (event.key !== 'obligation-lens-commitments' && event.key !== null) return
      const result = readCommitments()
      if (result.ok) {
        setCommitments(result.data)
        setRelationships(result.relationships ?? [])
        setStorageError(result.warning ?? null)
      } else {
        setStorageError(result.error)
      }
    }
    window.addEventListener('storage', synchronize)
    return () => window.removeEventListener('storage', synchronize)
  }, [])

  useEffect(() => {
    if (!flash) return undefined
    const timer = window.setTimeout(() => setFlash(null), 5000)
    return () => window.clearTimeout(timer)
  }, [flash])

  const persistCreate = useCallback((record) => {
    const written = createStoredCommitment(commitments, record)
    if (!written.ok) {
      setStorageError(written.error)
      return { ok: false, error: written.error }
    }
    setCommitments(written.data)
    setRelationships(written.relationships ?? relationships)
    setStorageError(null)
    setFlash({ type: 'success', message: `"${record.title}" was saved in this browser.` })
    return { ok: true }
  }, [commitments, relationships])

  const persistUpdate = useCallback((record, expectedUpdatedAt) => {
    const written = updateStoredCommitment(commitments, record, expectedUpdatedAt)
    if (!written.ok) {
      setStorageError(written.error)
      return { ok: false, error: written.error }
    }
    setCommitments(written.data)
    setRelationships(written.relationships ?? relationships)
    setStorageError(null)
    setFlash({ type: 'success', message: `"${record.title}" was updated.` })
    return { ok: true }
  }, [commitments, relationships])

  const persistDelete = useCallback((id) => {
    const target = commitments.find((item) => item.id === id)
    const written = deleteStoredCommitment(commitments, id)
    if (!written.ok) {
      setStorageError(written.error)
      return { ok: false, error: written.error }
    }
    setCommitments(written.data)
    setRelationships(written.relationships ?? [])
    setStorageError(null)
    setFlash({
      type: 'success',
      message: target
        ? `"${target.title}" was deleted from this browser.`
        : 'The commitment was deleted.',
    })
    return { ok: true }
  }, [commitments])

  const saveRelationships = useCallback((next) => {
    const written = writeRelationships(commitments, next)
    if (!written.ok) { setStorageError(written.error); return written }
    setRelationships(written.relationships)
    setStorageError(null)
    return { ok: true, relationships: written.relationships }
  }, [commitments])

  const seedDemoData = useCallback((records, links) => {
    const written = mergeDemoData(commitments, records, links)
    if (!written.ok) { setStorageError(written.error); return written }
    setCommitments(written.data)
    setRelationships(written.relationships ?? [])
    setStorageError(null)
    return written
  }, [commitments])

  const removeDemoData = useCallback((ids) => {
    const written = removeStoredCommitments(commitments, ids)
    if (!written.ok) { setStorageError(written.error); return written }
    setCommitments(written.data)
    setRelationships(written.relationships ?? [])
    setStorageError(null)
    return written
  }, [commitments])

  /**
   * Toggle the completed state of a single action within a commitment.
   * Persists the updated commitment and refreshes state.
   */
  const toggleActionComplete = useCallback((commitmentId, actionId) => {
    const latest = readCommitments()
    if (!latest.ok) {
      setStorageError(latest.error)
      return { ok: false, error: latest.error }
    }
    const commitment = latest.ok && latest.data.find((c) => c.id === commitmentId)
    if (!commitment) return { ok: false, error: 'Commitment not found.' }

    const updatedActions = (commitment.actions ?? []).map((a) =>
      a.id === actionId ? { ...a, completed: !a.completed } : a,
    )
    if (!updatedActions.some((action) => action.id === actionId)) return { ok: false, error: 'Action not found.' }
    const updatedCommitment = {
      ...commitment,
      actions: updatedActions,
      updatedAt: new Date().toISOString(),
    }

    const written = updateStoredCommitment(latest.data, updatedCommitment, commitment.updatedAt)
    if (!written.ok) {
      setStorageError(written.error)
      return { ok: false, error: written.error }
    }
    setCommitments(written.data)
    setRelationships(written.relationships ?? [])
    setStorageError(null)
    return { ok: true }
  }, [])

  /**
   * Mark an important date as resolved (or un-resolve it).
   * Adds a `resolved` boolean to the date record.
   */
  const toggleDateResolved = useCallback((commitmentId, dateId) => {
    const latest = readCommitments()
    if (!latest.ok) {
      setStorageError(latest.error)
      return { ok: false, error: latest.error }
    }
    const commitment = latest.ok && latest.data.find((c) => c.id === commitmentId)
    if (!commitment) return { ok: false, error: 'Commitment not found.' }

    const updatedDates = (commitment.importantDates ?? []).map((d) =>
      d.id === dateId ? { ...d, resolved: !d.resolved } : d,
    )
    if (!updatedDates.some((date) => date.id === dateId)) return { ok: false, error: 'Important date not found.' }
    const updatedCommitment = {
      ...commitment,
      importantDates: updatedDates,
      updatedAt: new Date().toISOString(),
    }

    const written = updateStoredCommitment(latest.data, updatedCommitment, commitment.updatedAt)
    if (!written.ok) {
      setStorageError(written.error)
      return { ok: false, error: written.error }
    }
    setCommitments(written.data)
    setRelationships(written.relationships ?? latest.relationships ?? [])
    setStorageError(null)
    return { ok: true }
  }, [])

  /**
   * Add a single action to an existing commitment (for accepted recommendations).
   */
  const addActionToCommitment = useCallback((commitmentId, action) => {
    const latest = readCommitments()
    if (!latest.ok) {
      setStorageError(latest.error)
      return { ok: false, error: latest.error }
    }
    const commitment = latest.ok && latest.data.find((c) => c.id === commitmentId)
    if (!commitment) return { ok: false, error: 'Commitment not found.' }

    const updatedCommitment = {
      ...commitment,
      actions: [...(commitment.actions ?? []), action],
      updatedAt: new Date().toISOString(),
    }

    const written = updateStoredCommitment(latest.data, updatedCommitment, commitment.updatedAt)
    if (!written.ok) {
      setStorageError(written.error)
      return { ok: false, error: written.error }
    }
    setCommitments(written.data)
    setRelationships(written.relationships ?? latest.relationships ?? [])
    setStorageError(null)
    return { ok: true }
  }, [])

  const replaceCommitments = useCallback((records, links = []) => {
    const written = replaceStoredCommitments(records, links)
    if (!written.ok) {
      setStorageError(written.error)
      return written
    }
    setCommitments(written.data)
    setRelationships(written.relationships ?? [])
    setStorageError(null)
    return { ok: true, data: written.data }
  }, [])

  const applyCommitmentImport = useCallback((records, options) => {
    const imported = applyImportToStorage(commitments, records, options)
    if (!imported.ok) {
      setStorageError(imported.error)
      return imported
    }
    setCommitments(imported.data)
    setRelationships(imported.relationships ?? [])
    setStorageError(null)
    return imported
  }, [commitments])

  const loadSampleData = useCallback(() => {
    const latest = readCommitments()
    if (!latest.ok) {
      setStorageError(latest.error)
      return { ok: false, error: latest.error }
    }
    if (latest.data.length) return { ok: false, error: 'Sample data can only be loaded when there are no saved commitments.' }
    const written = replaceStoredCommitments(SAMPLE_COMMITMENTS.map((item) => structuredCloneSafe(item)))
    if (!written.ok) {
      setStorageError(written.error)
      return written
    }
    setCommitments(written.data)
    setRelationships(written.relationships ?? [])
    setStorageError(null)
    return { ok: true, data: written.data }
  }, [])

  const dismissFlash = useCallback(() => setFlash(null), [])

  const value = useMemo(
    () => ({
      commitments,
      relationships,
      storageError,
      flash,
      ready,
      createCommitment: persistCreate,
      updateCommitment: persistUpdate,
      deleteCommitment: persistDelete,
      toggleActionComplete,
      toggleDateResolved,
      addActionToCommitment,
      replaceCommitments,
      applyCommitmentImport,
      loadSampleData,
      saveRelationships,
      seedDemoData,
      removeDemoData,
      dismissFlash,
    }),
    [
      commitments,
      relationships,
      storageError,
      flash,
      ready,
      persistCreate,
      persistUpdate,
      persistDelete,
      toggleActionComplete,
      toggleDateResolved,
      addActionToCommitment,
      replaceCommitments,
      applyCommitmentImport,
      loadSampleData,
      saveRelationships,
      seedDemoData,
      removeDemoData,
      dismissFlash,
    ],
  )

  return (
    <CommitmentContext.Provider value={value}>{children}</CommitmentContext.Provider>
  )
}

export function useCommitments() {
  const value = useContext(CommitmentContext)
  if (!value) {
    throw new Error('useCommitments must be used within CommitmentProvider')
  }
  return value
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value))
}
