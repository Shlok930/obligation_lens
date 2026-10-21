import { useState } from 'react'
import { AppShell } from './components/layout/AppShell.jsx'
import { useCommitments } from './context/CommitmentContext.jsx'
import { AddCommitmentPage } from './pages/AddCommitmentPage.jsx'
import { ObligationsPage } from './pages/ObligationsPage.jsx'
import { Overview } from './pages/Overview.jsx'
import { TimelinePage } from './pages/TimelinePage.jsx'
import { SettingsPage } from './pages/SettingsPage.jsx'
import { DocumentIntelligencePage } from './pages/DocumentIntelligencePage.jsx'
import { NAV_ITEMS } from './data/navigation.js'
import { ObligationExplorerPage } from './pages/ObligationExplorerPage.jsx'
import { DependencyGraphPage } from './pages/DependencyGraphPage.jsx'
import { AskObligationsPage } from './pages/AskObligationsPage.jsx'

export default function App() {
  return <AppRouter />
}

function AppRouter() {
  const [currentPage, setCurrentPage] = useState('overview')
  const [editingId, setEditingId] = useState(null)
  const { commitments, ready } = useCommitments()

  function handleNavigate(page) {
    if (page !== 'add') setEditingId(null)
    setCurrentPage(page)
  }

  function handleEdit(id) {
    setEditingId(id)
    setCurrentPage('add')
  }

  const editingCommitment = editingId
    ? (commitments.find((c) => c.id === editingId) ?? null)
    : null

  const validPage = NAV_ITEMS.some((item) => item.id === currentPage)

  return (
    <AppShell currentPage={currentPage} onNavigate={handleNavigate}>
      {!ready ? <div className="page-wrap" role="status">Loading locally saved commitments…</div> : !validPage ? (
        <div className="page-wrap"><section className="surface-card p-6"><h2 className="text-xl font-semibold text-ink">Page not found</h2><p className="mt-2 text-sm text-muted">This section is not available. Your saved commitments are unchanged.</p><button type="button" className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white" onClick={() => handleNavigate('overview')}>Return to overview</button></section></div>
      ) : currentPage === 'overview' ? <Overview onNavigate={handleNavigate} onEdit={handleEdit} />
        : currentPage === 'obligations' ? <ObligationsPage onNavigate={handleNavigate} onEdit={handleEdit} />
          : currentPage === 'timeline' ? <TimelinePage onNavigate={handleNavigate} onEdit={handleEdit} />
            : currentPage === 'explorer' ? <ObligationExplorerPage onNavigate={handleNavigate} />
            : currentPage === 'documents' ? <DocumentIntelligencePage />
              : currentPage === 'dependencies' ? <DependencyGraphPage />
              : currentPage === 'ask' ? <AskObligationsPage onNavigate={handleNavigate} onEdit={handleEdit} />
              : currentPage === 'add' ? <AddCommitmentPage existing={editingCommitment} onNavigate={handleNavigate} />
                : currentPage === 'settings' ? <SettingsPage /> : null}
    </AppShell>
  )
}
