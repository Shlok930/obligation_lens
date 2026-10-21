import { MobileNav } from './MobileNav.jsx'
import { Sidebar } from './Sidebar.jsx'
import { TopBar } from './TopBar.jsx'

export function AppShell({ currentPage, onNavigate, children }) {
  return (
    <div className="flex min-h-svh bg-canvas">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-raised focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
        <TopBar currentPage={currentPage} onNavigate={onNavigate} />
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </div>
      <MobileNav currentPage={currentPage} onNavigate={onNavigate} />
    </div>
  )
}
