import { Button } from './Button.jsx'

export function EmptyState({ icon: Icon, title, body, actionLabel, onAction }) {
  return (
    <div className="surface-card px-6 py-12 text-center">
      {Icon ? (
        <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      ) : null}
      <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{body}</p>
      {actionLabel ? (
        <div className="mt-5">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      ) : null}
    </div>
  )
}
