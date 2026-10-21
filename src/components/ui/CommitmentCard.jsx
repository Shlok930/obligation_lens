import { CalendarClock, ListTodo, Pencil, Trash2 } from 'lucide-react'
import { categoryLabel, dateTypeLabel } from '../../data/catalog.js'
import { getNearestUpcomingDate, incompleteActionCount } from '../../utils/commitmentModel.js'
import { formatDate, formatMoney, relativeDueLabel, todayIso } from '../../utils/format.js'
import { Button } from './Button.jsx'
import { StatusBadge } from './StatusBadge.jsx'

export function CommitmentCard({ commitment, onEdit, onDelete, compact = false }) {
  const today = todayIso()
  const nearest = getNearestUpcomingDate(commitment, today)
  const pendingActions = incompleteActionCount(commitment)

  if (compact) {
    return (
      <article className="flex gap-4 py-3">
        <div className="flex w-16 shrink-0 flex-col pt-0.5">
          {nearest ? (
            <>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                {new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(
                  new Date(nearest.date + 'T00:00:00'),
                )}
              </span>
              <span className="font-display text-xl leading-none text-ink">
                {new Date(nearest.date + 'T00:00:00').getDate()}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted">—</span>
          )}
        </div>
        <div className="min-w-0 flex-1 border-l border-line pl-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-ink">{commitment.title}</h3>
            <StatusBadge status={commitment.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {commitment.merchant ? `${commitment.merchant} · ` : ''}
            {categoryLabel(commitment.category)}
          </p>
          {nearest && (
            <p className="mt-1.5 text-sm text-ink/90">
              {dateTypeLabel(nearest.type)}
              {nearest.note ? ` — ${nearest.note}` : ''}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            {nearest && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="size-3.5" aria-hidden="true" />
                {relativeDueLabel(nearest.date, today)} · {formatDate(nearest.date)}
              </span>
            )}
            <span>{formatMoney(commitment.amount, commitment.currency)}</span>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="surface-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-ink">{commitment.title}</h3>
            <StatusBadge status={commitment.status} />
            {commitment.source === 'sample' && (
              <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs text-muted">
                Sample
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            {commitment.merchant ? `${commitment.merchant} · ` : ''}
            {categoryLabel(commitment.category)} · {formatDate(commitment.commitmentDate)}
          </p>
        </div>
        <p className="shrink-0 font-display text-lg font-medium text-ink">
          {formatMoney(commitment.amount, commitment.currency)}
        </p>
      </div>

      {commitment.description ? (
        <p className="mt-2 text-sm leading-relaxed text-ink/80">{commitment.description}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        {nearest ? (
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            {dateTypeLabel(nearest.type)}: {relativeDueLabel(nearest.date, today)} ·{' '}
            {formatDate(nearest.date)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-muted/60">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            No upcoming dates
          </span>
        )}
        {pendingActions > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <ListTodo className="size-3.5" aria-hidden="true" />
            {pendingActions} action{pendingActions !== 1 ? 's' : ''} pending
          </span>
        )}
      </div>

      {(onEdit || onDelete) && (
        <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
          {onEdit && (
            <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={() => onEdit(commitment.id)}>
              <Pencil className="size-3.5" aria-hidden="true" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" className="gap-1.5 px-3 py-1.5 text-xs text-warn hover:bg-warn-soft" onClick={() => onDelete(commitment.id)}>
              <Trash2 className="size-3.5" aria-hidden="true" />
              Delete
            </Button>
          )}
        </div>
      )}
    </article>
  )
}
