export function FormSection({ eyebrow, title, description, children }) {
  return (
    <section className="surface-card p-5 sm:p-6">
      <header className="mb-5 max-w-2xl">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-lg font-semibold text-ink">{title}</h2>
        {description ? (
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  )
}
