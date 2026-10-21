import { ArrowLeft } from 'lucide-react'
import { CommitmentForm } from '../components/commitment/CommitmentForm.jsx'
import { Button } from '../components/ui/Button.jsx'
import { useCommitments } from '../context/CommitmentContext.jsx'

export function AddCommitmentPage({ existing, onNavigate }) {
  const { createCommitment, updateCommitment } = useCommitments()

  async function handleSave(record) {
    const result = existing
      ? updateCommitment(record)
      : createCommitment(record)
    if (result?.ok) {
      onNavigate('obligations')
    }
    return result
  }

  return (
    <div className="page-wrap space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => onNavigate(existing ? 'obligations' : 'overview')} className="px-2">
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Button>
        <div>
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            {existing ? 'Edit commitment' : 'Add a commitment'}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {existing
              ? 'Update the details below and save your changes.'
              : 'Capture a purchase, booking, subscription, or any obligation with future consequences.'}
          </p>
        </div>
      </div>
      <CommitmentForm
        existing={existing}
        onCancel={() => onNavigate(existing ? 'obligations' : 'overview')}
        onSave={handleSave}
      />
    </div>
  )
}
