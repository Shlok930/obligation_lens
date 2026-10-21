import { useState } from 'react'
import { AppShell } from './components/layout/AppShell.jsx'
import { useCommitments } from './context/CommitmentContext.jsx'
import { AddCommitmentPage } from './pages/AddCommitmentPage.jsx'
import { ObligationsPage } from './pages/ObligationsPage.jsx'
import { Overview } from './pages/Overview.jsx'
import { PlaceholderPage } from './pages/PlaceholderPage.jsx'

export default function App() {
  const [currentPage, setCurrentPage] = useState('overview')
  const [editingId, setEditingId] = useState(null)
  const { commitments } = useCommitments()

  function handleNavigate(page) {
    if (page !== 'add') setEditingId(null)
    setCurrentPage(page)
  }

  function handleEdit(id) {
    setEditingId(id)
    setCurrentPage('add')
  }

  const editingCommitment = editingId
    ? commitments.find((c) => c.id === editingId) ?? null
    : null

  return (
    <AppShell currentPage={currentPage} onNavigate={handleNavigate}>
      {currentPage === 'overview' && (
        <Overview onNavigate={handleNavigate} onEdit={handleEdit} />
      )}
      {currentPage === 'obligations' && (
        <ObligationsPage onNavigate={handleNavigate} onEdit={handleEdit} />
      )}
      {currentPage === 'add' && (
        <AddCommitmentPage
          existing={editingCommitment}
          onNavigate={handleNavigate}
        />
      )}
      {currentPage === 'settings' && (
        <PlaceholderPage pageId="settings" onNavigate={handleNavigate} />
      )}
    </AppShell>
  )
}
