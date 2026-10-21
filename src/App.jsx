import { useState } from 'react'
import { AppShell } from './components/layout/AppShell.jsx'
import { Overview } from './pages/Overview.jsx'
import { PlaceholderPage } from './pages/PlaceholderPage.jsx'

export default function App() {
  const [currentPage, setCurrentPage] = useState('overview')

  return (
    <AppShell currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'overview' ? (
        <Overview onNavigate={setCurrentPage} />
      ) : (
        <PlaceholderPage pageId={currentPage} onNavigate={setCurrentPage} />
      )}
    </AppShell>
  )
}
