const styles = {
  active: 'bg-accent-soft text-accent',
  completed: 'bg-calm-soft text-calm',
  sample: 'bg-surface text-muted border border-line',
  overdue: 'bg-warn-soft text-warn',
  soon: 'bg-warn-soft text-warn',
}

const labels = {
  active: 'Active',
  completed: 'Completed',
  sample: 'Sample',
  overdue: 'Overdue',
  soon: 'Needs a decision',
}

export function StatusBadge({ status }) {
  if (!status || !labels[status]) return null
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${styles[status]}`}
    >
      {labels[status]}
    </span>
  )
}
