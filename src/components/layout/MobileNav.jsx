import { NAV_ITEMS } from '../../data/navigation.js'

export function MobileNav({ currentPage, onNavigate }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 overflow-x-auto border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
    >
      <ul className="flex w-max min-w-full justify-between">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = currentPage === item.id
          return (
            <li key={item.id} className="w-[4.5rem] shrink-0">
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
                onClick={() => onNavigate(item.id)}
                  className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 px-0.5 py-2 text-[9px] leading-tight font-medium sm:text-[11px] ${
                  active ? 'text-accent' : 'text-muted'
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="line-clamp-2 text-center">{{ 'Overview': 'Home', 'My Obligations': 'Obligations', 'Obligation Explorer': 'Explore', 'Document Intelligence': 'Documents', 'Add Commitment': 'Add' }[item.label] ?? item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
