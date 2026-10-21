import { CalendarClock } from 'lucide-react'
import {
  formatDate,
  formatDay,
  formatMoney,
  formatMonthShort,
  relativeDueLabel,
} from '../../utils/format.js'
import { SAMPLE_AS_OF } from '../../data/mockData.js'
import { StatusBadge } from './StatusBadge.jsx'

export function CommitmentPreview({ commitment, variant = 'card' }) {
  const due = commitment.nextAction.dueOn
  const compact = variant === 'timeline'

  return (
    <article className={compact ? 'flex gap-4 py-3' : 'surface-card p-5'}>
      {compact ? (
        <div className="flex w-16 shrink-0 flex-col pt-0.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            {formatMonthShort(due)}
          </span>
          <span className="font-display text-xl leading-none text-ink">
            {formatDay(due)}
          </span>
        </div>
      ) : null}

      <div className={compact ? 'min-w-0 flex-1 border-l border-line pl-4' : ''}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-ink">{commitment.title}</h3>
          <StatusBadge status={commitment.status} />
        </div>
        <p className="mt-1 text-sm text-muted">
          {commitment.merchant} · {commitment.category}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink/90">
          {compact ? commitment.nextAction.label : commitment.summary}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            {relativeDueLabel(due, SAMPLE_AS_OF)} · {formatDate(due)}
          </span>
          <span>At stake {formatMoney(commitment.nextAction.moneyAtRisk)}</span>
        </div>
      </div>
    </article>
  )
}
