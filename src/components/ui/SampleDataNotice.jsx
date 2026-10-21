import { Info } from 'lucide-react'

export function SampleDataNotice() {
  return (
    <p
      className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted"
      role="note"
    >
      <Info className="size-3.5" aria-hidden="true" />
      Sample data for this preview
    </p>
  )
}
