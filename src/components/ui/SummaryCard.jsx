export function SummaryCard({ icon: Icon, label, value, hint, onClick }) {
  const content = <>
    <span className="flex items-start justify-between gap-3">
      <span className="text-sm font-medium text-muted">{label}</span>
      <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon className="size-4" aria-hidden="true" />
      </span>
    </span>
    <span className="mt-4 block break-words font-display text-3xl font-medium tracking-tight text-ink">
      {value}
    </span>
    <span className="mt-2 block text-sm text-muted">{hint}</span>
  </>
  return (
    onClick
      ? <button type="button" onClick={onClick} className="surface-card block w-full p-5 text-left transition-colors hover:border-accent/40 focus-visible:border-accent">{content}</button>
      : <article className="surface-card p-5">{content}</article>
  )
}
