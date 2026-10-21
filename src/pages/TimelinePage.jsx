import { useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, Check, CheckCircle2, Clock3, ListTodo, Plus, Search, X } from 'lucide-react'
import { Button } from '../components/ui/Button.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { CATEGORIES } from '../data/catalog.js'
import { useCommitments } from '../context/CommitmentContext.jsx'
import { createId } from '../utils/ids.js'
import { formatDate, formatMoney, todayIso } from '../utils/format.js'
import { getRecommendations } from '../utils/actionRecommendations.js'
import { buildTimeline, computeTimelineSummary, filterEvents, GROUP_LABELS, GROUP_ORDER, groupEventsByPeriod, statusLabel } from '../utils/obligationEngine.js'

const STATUS_OPTIONS = [
  ['all', 'All commitments'], ['overdue', 'Overdue'], ['due_today', 'Due today'],
  ['due_soon', 'Due soon'], ['upcoming', 'Upcoming'],
  ['completed', 'Completed'], ['historical', 'Historical deadlines'],
]

export function TimelinePage({ onNavigate, onEdit }) {
  const { commitments, toggleActionComplete, toggleDateResolved, addActionToCommitment, storageError } = useCommitments()
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [timeRange, setTimeRange] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const today = todayIso()
  const events = useMemo(() => buildTimeline(commitments, today), [commitments, today])
  const summary = computeTimelineSummary(events, commitments)
  const filtered = filterEvents(events, { statusFilter, categoryFilter, timeRange, search })
  const groups = groupEventsByPeriod(filtered, today)
  const selected = events.find((event) => event.id === selectedId)
  const selectedCommitment = selected && commitments.find((item) => item.id === selected.commitmentId)
  const hasFilters = statusFilter !== 'all' || categoryFilter !== 'all' || timeRange !== 'all' || search.trim()
  const hasDatedRecords = events.length > 0

  function clearFilters() {
    setStatusFilter('all')
    setCategoryFilter('all')
    setTimeRange('all')
    setSearch('')
  }

  function acceptRecommendation(title) {
    if (!selected || !selectedCommitment) return
    addActionToCommitment(selected.commitmentId, {
      id: createId('act'),
      title,
      dueDate: selected.date >= todayIso() ? selected.date : todayIso(),
      completed: false,
    })
  }

  return (
    <div className="page-wrap space-y-7">
      {storageError && <p role="alert" className="rounded-2xl border border-warn/20 bg-warn-soft px-4 py-3 text-sm text-warn">{storageError}</p>}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">Your obligations, mapped out.</h2>
          <p className="mt-3 text-base leading-relaxed text-muted">A chronological view of the dates and actions you have recorded, with context for what may need attention.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => onNavigate('obligations')}>My Obligations</Button>
          <Button onClick={() => onNavigate('add')}><Plus className="size-4" aria-hidden="true" />Add commitment</Button>
        </div>
      </header>

      <section aria-label="Timeline summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Summary icon={AlertCircle} label="Overdue actions" value={summary.overdue} />
        <Summary icon={Clock3} label="Actions due today" value={summary.dueToday} />
        <Summary icon={CalendarDays} label="Due in 7 days" value={summary.dueSoon} />
        <Summary icon={ListTodo} label="Unresolved commitments" value={summary.unresolved} />
      </section>

      <section className="space-y-4" aria-label="Timeline filters">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by event status">
          {STATUS_OPTIONS.map(([value, label]) => (
            <button key={value} type="button" onClick={() => setStatusFilter(value)} aria-pressed={statusFilter === value}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${statusFilter === value ? 'border-accent bg-accent text-white' : 'border-line bg-raised text-ink hover:bg-surface'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr_auto]">
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} aria-label="Filter by date range" className="rounded-xl border border-line bg-raised px-3 py-2.5 text-sm text-ink">
            <option value="all">All dates</option><option value="7d">Next 7 days</option><option value="30d">Next 30 days</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by category" className="rounded-xl border border-line bg-raised px-3 py-2.5 text-sm text-ink">
            <option value="all">All categories</option>{CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events, commitments, merchants…" aria-label="Search timeline" className="w-full rounded-xl border border-line bg-raised py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-muted/70" />
          </label>
          {hasFilters && <Button variant="ghost" onClick={clearFilters} className="px-3"><X className="size-4" aria-hidden="true" />Clear filters</Button>}
        </div>
      </section>

      {!commitments.length ? (
        <EmptyState icon={CalendarDays} title="Your timeline starts with a commitment" body="Add a purchase, booking, subscription, or other commitment to start tracking its dates and actions." actionLabel="Add commitment" onAction={() => onNavigate('add')} />
      ) : !hasDatedRecords ? (
        <EmptyState icon={CalendarDays} title="No dated obligations yet" body="Add important dates or give actions a due date to build your timeline." actionLabel="Add dates or actions" onAction={() => onNavigate('obligations')} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No events match these filters" body="Try a different status, category, date range, or search term." actionLabel="Clear filters" onAction={clearFilters} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
          <div className="space-y-7">
            {GROUP_ORDER.map((group) => groups[group].length > 0 && (
              <section key={group} aria-labelledby={`group-${group}`}>
                <h3 id={`group-${group}`} className="mb-3 flex items-center gap-2 text-base font-semibold text-ink"><span className="size-2 rounded-full bg-accent" aria-hidden="true" />{GROUP_LABELS[group]}<span className="text-sm font-normal text-muted">{groups[group].length}</span></h3>
                <ol className="space-y-3 border-l border-line pl-4 sm:pl-5">
                  {groups[group].map((event) => <TimelineEvent key={event.id} event={event} selected={event.id === selectedId} onSelect={() => setSelectedId(event.id)} onToggle={() => toggleActionComplete(event.commitmentId, event.sourceId)} />)}
                </ol>
              </section>
            ))}
          </div>
          {selected && selectedCommitment && <EventDetails event={selected} commitment={selectedCommitment} onClose={() => setSelectedId(null)} onEdit={() => onEdit(selected.commitmentId)} onToggleAction={() => toggleActionComplete(selected.commitmentId, selected.sourceId)} onResolve={() => toggleDateResolved(selected.commitmentId, selected.sourceId)} onAdd={acceptRecommendation} />}
        </div>
      )}
    </div>
  )
}

function Summary({ icon: Icon, label, value }) {
  return <div className="surface-card flex items-start gap-3 p-4"><span className="rounded-xl bg-accent-soft p-2 text-accent"><Icon className="size-4" aria-hidden="true" /></span><div><p className="text-2xl font-semibold leading-none text-ink">{value}</p><p className="mt-1 text-xs text-muted sm:text-sm">{label}</p></div></div>
}

function TimelineEvent({ event, selected, onSelect, onToggle }) {
  const isAction = event.eventType === 'action'
  return <li className={`relative rounded-2xl border bg-raised p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04)] ${selected ? 'border-accent' : 'border-line'}`}>
    <span className="absolute -left-[22px] top-5 size-3 rounded-full border-2 border-canvas bg-accent" aria-hidden="true" />
    <div className="flex items-start gap-3">
      {isAction && <input type="checkbox" checked={event.completed} onChange={onToggle} aria-label={`${event.completed ? 'Reopen' : 'Complete'} ${event.title}`} className="mt-1 size-4 accent-accent" />}
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-center gap-2"><span className={`text-sm font-semibold ${event.completed ? 'text-muted line-through' : 'text-ink'}`}>{event.title}</span><StatusTag status={event.status} /></span>
        <span className="mt-1 block text-sm text-muted">{event.commitmentTitle}{event.merchant ? ` · ${event.merchant}` : ''}</span>
        <span className="mt-2 block text-xs text-muted">{event.date ? formatDate(event.date) : 'No date'} · {isAction ? 'Action' : 'Important date'}</span>
      </button>
    </div>
  </li>
}

function StatusTag({ status }) {
  const tone = ['overdue', 'deadline_passed', 'follow_up'].includes(status) ? 'bg-warn-soft text-warn' : status === 'completed' || status === 'resolved' || status === 'date_passed' ? 'bg-calm-soft text-calm' : status === 'due_soon' || status === 'due_today' ? 'bg-warn-soft text-warn' : 'bg-surface text-muted'
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{status === 'completed' ? <Check className="mr-1 size-3" aria-hidden="true" /> : null}{statusLabel(status)}</span>
}

function EventDetails({ event, commitment, onClose, onEdit, onToggleAction, onResolve, onAdd }) {
  const recommendations = event.eventType === 'important_date' ? getRecommendations(commitment, event.dateType) : []
  const explanation = event.resolved
    ? 'You marked this important date obligation as resolved.'
    : event.status === 'follow_up'
    ? 'The expected refund date you entered has passed. This does not confirm a delay; check with the provider if the refund has not arrived.'
    : event.status === 'deadline_passed'
      ? 'This date has passed. It does not confirm that an option is unavailable; check the original terms or provider.'
      : event.status === 'date_passed'
        ? 'This date has passed. Check the original warranty terms or provider for current coverage.'
        : event.eventType === 'important_date'
          ? 'This date came from information you entered. Check the original terms to confirm what happens on or after it.'
          : event.completed ? 'You marked this action complete.' : event.status === 'overdue' ? 'This action’s due date has passed and it is still marked incomplete.' : 'This action is recorded as part of this commitment.'
  return <aside className="surface-card h-fit p-5 lg:sticky lg:top-5" aria-label="Event details">
    <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-semibold text-ink">Event details</h3><button type="button" onClick={onClose} aria-label="Close event details" className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink"><X className="size-5" aria-hidden="true" /></button></div>
    <h4 className="mt-4 break-words text-base font-semibold text-ink">{event.title}</h4>
    <p className="mt-1 break-words text-sm text-muted">{commitment.title}{commitment.merchant ? ` · ${commitment.merchant}` : ''}</p>
    <dl className="mt-4 space-y-3 border-t border-line pt-4 text-sm">
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted">Date</dt><dd className="mt-0.5 text-ink">{formatDate(event.date)}</dd></div>
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted">Status</dt><dd className="mt-1"><StatusTag status={event.status} /></dd></div>
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted">What this means</dt><dd className="mt-0.5 leading-relaxed text-ink">{explanation}</dd></div>
      {event.note && <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted">Your note</dt><dd className="mt-0.5 break-words leading-relaxed text-ink">{event.note}</dd></div>}
      {event.eventType === 'important_date' && <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted">Source</dt><dd className="mt-0.5 text-ink">{event.title} entered for {commitment.title}</dd></div>}
      {event.financialAmount != null && <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted">Recorded amount</dt><dd className="mt-0.5 text-ink">{formatMoney(event.financialAmount, event.currency)}</dd></div>}
    </dl>
    {event.eventType === 'action' ? <Button variant="secondary" className="mt-4 w-full" onClick={onToggleAction}><CheckCircle2 className="size-4" aria-hidden="true" />{event.completed ? 'Reopen action' : 'Mark complete'}</Button> : <Button variant="secondary" className="mt-4 w-full" onClick={onResolve}>{event.resolved ? 'Reopen obligation' : 'Mark obligation resolved'}</Button>}
    {recommendations.length > 0 && <div className="mt-5 border-t border-line pt-4"><h5 className="text-sm font-semibold text-ink">Suggested next steps</h5><p className="mt-1 text-xs leading-relaxed text-muted">Suggestions are based on the category and date you entered. They are not policy verification.</p><ul className="mt-3 space-y-2">{recommendations.map((title) => <li key={title} className="flex items-start justify-between gap-2 rounded-xl bg-surface p-3"><span className="text-sm leading-snug text-ink">{title}</span><button type="button" onClick={() => onAdd(title)} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-accent hover:bg-accent-soft" aria-label={`Add action: ${title}`}><Plus className="size-3.5" aria-hidden="true" />Add</button></li>)}</ul></div>}
    <Button className="mt-4 w-full" onClick={onEdit}>Open commitment</Button>
  </aside>
}
