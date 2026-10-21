import { NAV_ITEMS } from '../../data/navigation.js'

export function Sidebar({ currentPage, onNavigate }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
      <div className="px-5 pt-6 pb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          Obligation
        </p>
        <p className="font-display text-2xl font-medium tracking-tight text-ink">
          Lens
        </p>
        <p className="mt-2 text-sm leading-snug text-muted">
          Personal commitment intelligence
        </p>
      </div>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = currentPage === item.id
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                active
                  ? 'bg-accent-soft text-accent'
                  : 'text-muted hover:bg-canvas hover:text-ink'
              }`}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {item.label}
            </button>
          )
        })}
      </nav>
      <p className="px-5 py-5 text-xs leading-relaxed text-muted">
        Data in this build is sample content. Future entries will stay in this
        browser.
      </p>
    </aside>
  )
}
