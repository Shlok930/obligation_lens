import { ListChecks, PlusCircle, Search, X } from 'lucide-react'
import { useState } from 'react'
import { CommitmentCard } from '../components/ui/CommitmentCard.jsx'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Button } from '../components/ui/Button.jsx'
import { CATEGORIES, STATUSES } from '../data/catalog.js'
import { useCommitments } from '../context/CommitmentContext.jsx'

export function ObligationsPage({ onNavigate, onEdit }) {
  const { commitments, deleteCommitment, storageError } = useCommitments()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  const query = search.trim().toLowerCase()

  const filtered = commitments.filter((c) => {
    if (query) {
      const inTitle = c.title.toLowerCase().includes(query)
      const inMerchant = (c.merchant ?? '').toLowerCase().includes(query)
      if (!inTitle && !inMerchant) return false
    }
    if (categoryFilter && c.category !== categoryFilter) return false
    if (statusFilter && c.status !== statusFilter) return false
    return true
  })

  const pendingTarget = pendingDeleteId
    ? commitments.find((c) => c.id === pendingDeleteId)
    : null

  function confirmDelete() {
    if (pendingDeleteId) {
      deleteCommitment(pendingDeleteId)
      setPendingDeleteId(null)
    }
  }

  const hasFilters = query || categoryFilter || statusFilter

  function clearFilters() {
    setSearch('')
    setCategoryFilter('')
    setStatusFilter('')
  }

  return (
    <div className="page-wrap space-y-6">
      {storageError && (
        <p className="rounded-2xl border border-warn/20 bg-warn-soft px-4 py-3 text-sm text-warn" role="alert">
          {storageError}
        </p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            My Obligations
          </h2>
          <p className="mt-1 text-sm text-muted">
            {commitments.length === 0
              ? 'No commitments saved yet.'
              : `${commitments.length} commitment${commitments.length !== 1 ? 's' : ''} saved in this browser.`}
          </p>
        </div>
        <Button onClick={() => onNavigate('add')} className="shrink-0">
          <PlusCircle className="size-4" aria-hidden="true" />
          Add Commitment
        </Button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or merchant…"
            className="w-full rounded-xl border border-line bg-raised py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-muted/70 transition-colors"
            aria-label="Search commitments"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-line bg-raised px-3 py-2.5 text-sm text-ink transition-colors"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-line bg-raised px-3 py-2.5 text-sm text-ink transition-colors"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="shrink-0 gap-1.5 px-3" aria-label="Clear filters">
            <X className="size-4" aria-hidden="true" />
            Clear
          </Button>
        )}
      </div>

      {commitments.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No commitments yet"
          body="Add your first commitment — a purchase, booking, subscription, or any obligation with future deadlines, money, or required actions."
          actionLabel="Add Commitment"
          onAction={() => onNavigate('add')}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No results"
          body="No commitments match your current search or filters. Try adjusting them."
          actionLabel="Clear filters"
          onAction={clearFilters}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((c) => (
            <CommitmentCard
              key={c.id}
              commitment={c}
              onEdit={onEdit}
              onDelete={(id) => setPendingDeleteId(id)}
            />
          ))}
        </div>
      )}

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
