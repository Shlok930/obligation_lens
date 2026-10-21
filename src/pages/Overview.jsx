import { ArrowRight, Banknote, ClipboardList, ListTodo } from 'lucide-react'
import { Button } from '../components/ui/Button.jsx'
import { CommitmentPreview } from '../components/ui/CommitmentPreview.jsx'
import { SampleDataNotice } from '../components/ui/SampleDataNotice.jsx'
import { SummaryCard } from '../components/ui/SummaryCard.jsx'
import {
  SAMPLE_AS_OF,
  attentionIds,
  comingUp,
  commitments,
  summary,
} from '../data/mockData.js'
import { formatDate, formatMoney } from '../utils/format.js'

export function Overview({ onNavigate }) {
  const attention = commitments.filter((item) => attentionIds.includes(item.id))

  return (
    <div className="page-wrap space-y-8">
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
        <SampleDataNotice />
      </section>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={ClipboardList}
          label="Active commitments"
          value={summary.activeCommitments}
          hint="Open sample commitments in this preview"
        />
        <SummaryCard
          icon={ListTodo}
          label="Upcoming actions"
          value={summary.upcomingActions}
          hint={`Relative to ${formatDate(SAMPLE_AS_OF)}`}
        />
        <SummaryCard
          icon={Banknote}
          label="Money at risk"
          value={formatMoney(summary.moneyAtRisk)}
          hint="If sample deadlines are missed"
        />
      </section>

      <section aria-labelledby="attention-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 id="attention-heading" className="text-lg font-semibold text-ink">
              Needs your attention
            </h3>
            <p className="mt-1 text-sm text-muted">
              The nearest sample decisions, with money and records at stake.
            </p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {attention.map((commitment) => (
            <div key={commitment.id} className="space-y-3">
              <CommitmentPreview commitment={commitment} />
              <p className="px-1 text-sm leading-relaxed text-muted">
                {commitment.nextAction.consequence} Preserve{' '}
                {commitment.preserve.join(', ').toLowerCase()}.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="coming-up-heading" className="space-y-4">
        <h3 id="coming-up-heading" className="text-lg font-semibold text-ink">
          Coming up
        </h3>
        <div className="surface-card divide-y divide-line px-5">
          {comingUp.map((commitment) => (
            <CommitmentPreview
              key={commitment.id}
              commitment={commitment}
              variant="timeline"
            />
          ))}
        </div>
      </section>

      <section className="surface-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">
            Add the first real commitment
          </h3>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
            Capture is not wired yet. The next stage will store entries locally
            in this browser. Nothing here is saved, analysed, or notified.
          </p>
        </div>
        <Button onClick={() => onNavigate('add')}>
          Add Commitment
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </section>
    </div>
  )
}
