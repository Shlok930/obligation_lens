import { ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/Button.jsx'

const copy = {
  obligations: {
    heading: 'Your full list comes next.',
    body: 'This screen is a placeholder so navigation stays intact. Later, it will list every local commitment with filters for deadline, money at risk, and status.',
  },
  add: {
    heading: 'Capture is not available yet.',
    body: 'The Add Commitment action is wired only as a destination. A later stage will add a form that stores records in localStorage or IndexedDB. No data is saved in this build.',
  },
  settings: {
    heading: 'Preferences stay in the browser.',
    body: 'There is no account, sign-in, or server in this stage. Future settings — currency, reminder style, data export — will live locally on this device.',
  },
}

export function PlaceholderPage({ pageId, onNavigate }) {
  const content = copy[pageId]

  return (
    <div className="page-wrap">
      <section className="surface-card max-w-2xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          Later stage
        </p>
        <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-ink">
          {content.heading}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted">{content.body}</p>
        <div className="mt-6">
          <Button variant="secondary" onClick={() => onNavigate('overview')}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Overview
          </Button>
        </div>
      </section>
    </div>
  )
}
