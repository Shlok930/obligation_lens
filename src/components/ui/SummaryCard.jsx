export function SummaryCard({ icon: Icon, label, value, hint }) {
  return (
    <article className="surface-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 font-display text-3xl font-medium tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-2 text-sm text-muted">{hint}</p>
    </article>
  )
}
