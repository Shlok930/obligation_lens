import { ArrowRight, Banknote, ClipboardList, ListTodo, PlusCircle } from 'lucide-react'
import { useState } from 'react'
import { CommitmentCard } from '../components/ui/CommitmentCard.jsx'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { SummaryCard } from '../components/ui/SummaryCard.jsx'
import { Button } from '../components/ui/Button.jsx'
import { useCommitments } from '../context/CommitmentContext.jsx'
import { formatDate, formatMoney, todayIso } from '../utils/format.js'
import { selectDashboardMetrics } from '../utils/dashboardMetrics.js'

export function Overview({ onNavigate, onEdit }) {
  const { commitments, deleteCommitment, storageError, toggleActionComplete } = useCommitments()
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const today = todayIso()

  const metrics = selectDashboardMetrics(commitments, today)
  const events = metrics.events
  const attentionItems = events.filter((event) => !event.completed && !event.resolved && ['overdue', 'due_today', 'due_soon'].includes(event.status)).slice(0, 4)
  const attentionIds = new Set(attentionItems.map((event) => event.id))
  const comingUp = events.filter((event) => !event.completed && !event.resolved && !attentionIds.has(event.id) && ['upcoming', 'due_soon'].includes(event.status)).slice(0, 6)

  const pendingTarget = pendingDeleteId
    ? commitments.find((c) => c.id === pendingDeleteId)
    : null

  function confirmDelete() {
    if (pendingDeleteId) {
      deleteCommitment(pendingDeleteId)
      setPendingDeleteId(null)
    }
  }

  const hasSampleOnly =
    commitments.length > 0 && commitments.every((c) => c.source === 'sample')

  return (
    <div className="page-wrap space-y-8">
      {storageError && (
        <p className="rounded-2xl border border-warn/20 bg-warn-soft px-4 py-3 text-sm text-warn" role="alert">
          {storageError}
        </p>
      )}

      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            Your commitments, in focus.
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
            Obligation Lens helps you see the actions, deadlines, money, and
            records that follow a purchase, booking, or subscription — before a
            missed step becomes expensive.
          </p>
        </div>
        {hasSampleOnly && (
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted" role="note">
            Sample data — add your own commitments below
          </p>
        )}
      </section>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={ClipboardList}
          label="Active commitments"
          value={metrics.activeCount}
          hint="Open commitments in this browser"
          onClick={() => onNavigate('obligations')}
        />
        <SummaryCard
          icon={ListTodo}
          label="Upcoming important dates"
          value={metrics.upcomingDates}
          hint="Unresolved dates today or later"
          onClick={() => onNavigate('timeline')}
        />
        <SummaryCard
          icon={ListTodo}
          label="Overdue actions"
          value={metrics.overdueActions}
          hint="Incomplete actions past their due date"
          onClick={() => onNavigate('timeline')}
        />
        <SummaryCard
          icon={Banknote}
          label="Recorded exposure"
          value={metrics.exposureByCurrency.length ? metrics.exposureByCurrency.map(([currency, amount]) => <span key={currency} className="block text-xl">{formatMoney(amount, currency)}</span>) : '—'}
          hint="Refundable amounts + potential charges, grouped by currency"
        />
        <SummaryCard
          icon={ListTodo}
          label="Completed actions"
          value={metrics.completedActions}
          hint="Marked complete across all commitments"
          onClick={() => onNavigate('obligations')}
        />
        <SummaryCard
          icon={ClipboardList}
          label="Completed commitments"
          value={metrics.completedCommitments}
          hint="Records marked completed"
          onClick={() => onNavigate('obligations')}
        />
      </section>

      {commitments.length === 0 ? (
        <EmptyState
          icon={PlusCircle}
          title="No commitments yet"
          body="Add your first commitment — a purchase, booking, subscription, or any obligation with future consequences."
          actionLabel="Add Commitment"
          onAction={() => onNavigate('add')}
        />
      ) : (
        <>
          {attentionItems.length > 0 && (
            <section aria-labelledby="attention-heading" className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h3 id="attention-heading" className="text-lg font-semibold text-ink">
                    Needs your attention
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    Recorded dates and actions that may need attention.
                  </p>
                </div>
                <Button variant="secondary" onClick={() => onNavigate('obligations')} className="shrink-0 text-xs">
                  View all
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {attentionItems.map((event) => <TimelinePreview key={event.id} event={event} onEdit={onEdit} onToggle={() => toggleActionComplete(event.commitmentId, event.sourceId)} />)}
              </div>
            </section>
          )}

          {comingUp.length > 0 && (
            <section aria-labelledby="coming-up-heading" className="space-y-4">
              <h3 id="coming-up-heading" className="text-lg font-semibold text-ink">
                Coming up
              </h3>
              <div className="surface-card divide-y divide-line px-5">
                {comingUp.map((event) => <TimelinePreview key={event.id} event={event} onEdit={onEdit} onToggle={() => toggleActionComplete(event.commitmentId, event.sourceId)} compact />)}
              </div>
            </section>
          )}

          {attentionItems.length === 0 && (
            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-ink">All commitments</h3>
              <div className="grid gap-4 lg:grid-cols-2">
                {commitments.map((c) => (
                  <CommitmentCard
                    key={c.id}
                    commitment={c}
                    onEdit={onEdit}
                    onDelete={(id) => setPendingDeleteId(id)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="surface-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">
            Track a new commitment
          </h3>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
            Capture a purchase, booking, subscription, or any obligation with
            future deadlines, money, or required actions.
          </p>
        </div>
        <Button onClick={() => onNavigate('add')}>
          Add Commitment
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </section>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this commitment?"
        body={
          pendingTarget
            ? `"${pendingTarget.title}" will be permanently removed from this browser. This cannot be undone.`
            : 'This commitment will be permanently removed. This cannot be undone.'
        }
        confirmLabel="Delete"
        cancelLabel="Keep it"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  )
}

function TimelinePreview({ event, onEdit, onToggle, compact = false }) {
  const action = event.eventType === 'action'
  return (
    <div className={`surface-card flex items-start gap-3 p-4 ${compact ? 'border-0 border-b rounded-none shadow-none last:border-b-0' : ''}`}>
      {action && <input type="checkbox" checked={event.completed} onChange={onToggle} aria-label={`${event.completed ? 'Reopen' : 'Complete'} ${event.title}`} className="mt-1 size-4 accent-accent" />}
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold text-ink">{event.title}</p>
        <p className="mt-0.5 break-words text-sm text-muted">{event.commitmentTitle}{event.merchant ? ` · ${event.merchant}` : ''}</p>
        <p className="mt-1 text-xs text-muted">{formatDate(event.date)} · {event.status.replaceAll('_', ' ')}</p>
      </div>
      <Button variant="ghost" className="shrink-0 px-2 text-xs" onClick={() => onEdit(event.commitmentId)}>Open</Button>
    </div>
  )
}
