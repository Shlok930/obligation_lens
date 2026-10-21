import { NAV_ITEMS } from '../../data/navigation.js'

export function MobileNav({ currentPage, onNavigate }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = currentPage === item.id
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
                className={`flex w-full flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium ${
                  active ? 'text-accent' : 'text-muted'
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
