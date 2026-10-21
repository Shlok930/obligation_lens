import { Plus } from 'lucide-react'
import { NAV_ITEMS } from '../../data/navigation.js'
import { profilePlaceholder } from '../../data/mockData.js'
import { Button } from '../ui/Button.jsx'

export function TopBar({ currentPage, onNavigate }) {
  const page = NAV_ITEMS.find((item) => item.id === currentPage)

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-canvas/90 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent lg:hidden">
            Obligation Lens
          </p>
          <h1 className="truncate text-lg font-semibold text-ink sm:text-xl">
            {page?.title ?? 'Page not found'}
          </h1>
          <p className="hidden truncate text-sm text-muted sm:block">
            {page?.subtitle ?? 'Choose a section from the navigation.'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Button onClick={() => onNavigate('add')} aria-label="Add commitment">
            <Plus className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Add Commitment</span>
          </Button>
          <div
            className="flex size-9 items-center justify-center rounded-full border border-line bg-raised text-xs font-semibold text-ink"
            title="Profile placeholder — sign-in is not part of this build"
            aria-label="Profile placeholder"
          >
            {profilePlaceholder.initials}
          </div>
        </div>
      </div>
    </header>
  )
}
