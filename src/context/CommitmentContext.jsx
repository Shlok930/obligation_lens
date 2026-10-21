import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SAMPLE_COMMITMENTS } from '../data/mockData.js'
import {
  createStoredCommitment,
  deleteStoredCommitment,
  readCommitments,
  updateStoredCommitment,
  writeCommitments,
} from '../utils/commitmentStorage.js'

const CommitmentContext = createContext(null)

export function CommitmentProvider({ children }) {
  const [commitments, setCommitments] = useState([])
  const [storageError, setStorageError] = useState(null)
  const [flash, setFlash] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const result = readCommitments()
    if (!result.ok && !result.missing) {
      setStorageError(result.error)
      setCommitments([])
      setReady(true)
      return
    }
    if (result.missing) {
      const seeded = SAMPLE_COMMITMENTS.map((item) => structuredCloneSafe(item))
      const written = writeCommitments(seeded)
      if (!written.ok) {
        setStorageError(written.error)
        setCommitments(seeded)
        setReady(true)
        return
      }
      setCommitments(seeded)
      setReady(true)
      return
    }
    setCommitments(result.data)
    setReady(true)
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
    setCommitments((current) => [...current, record])
    setStorageError(null)
    setFlash({ type: 'success', message: `"${record.title}" was saved in this browser.` })
    return { ok: true }
  }, [commitments])

  const persistUpdate = useCallback((record) => {
    const written = updateStoredCommitment(commitments, record)
    if (!written.ok) {
      setStorageError(written.error)
      return { ok: false, error: written.error }
    }
    setCommitments((current) =>
      current.map((item) => (item.id === record.id ? record : item)),
    )
    setStorageError(null)
    setFlash({ type: 'success', message: `"${record.title}" was updated.` })
    return { ok: true }
  }, [commitments])

  const persistDelete = useCallback((id) => {
    const target = commitments.find((item) => item.id === id)
    const written = deleteStoredCommitment(commitments, id)
    if (!written.ok) {
      setStorageError(written.error)
      return { ok: false, error: written.error }
    }
    setCommitments((current) => current.filter((item) => item.id !== id))
    setStorageError(null)
    setFlash({
      type: 'success',
      message: target
        ? `"${target.title}" was deleted from this browser.`
        : 'The commitment was deleted.',
    })
    return { ok: true }
  }, [commitments])

  const dismissFlash = useCallback(() => setFlash(null), [])

  const value = useMemo(
    () => ({
      commitments,
      storageError,
      flash,
      ready,
      createCommitment: persistCreate,
      updateCommitment: persistUpdate,
      deleteCommitment: persistDelete,
      dismissFlash,
    }),
    [
      commitments,
      storageError,
      flash,
      ready,
      persistCreate,
      persistUpdate,
      persistDelete,
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
