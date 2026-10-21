import { useMemo, useState } from 'react'
import { GitBranch, Plus, Trash2 } from 'lucide-react'
import { useCommitments } from '../context/CommitmentContext.jsx'
import { analyzeDependencies, buildDependencyNodes, dependencyKey, wouldCreateDependencyCycle } from '../utils/dependencyGraph.js'
import { createId } from '../utils/ids.js'
import { Button } from '../components/ui/Button.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'

export function DependencyGraphPage() {
  const { commitments, relationships, saveRelationships, storageError } = useCommitments()
  const [prerequisite, setPrerequisite] = useState('')
  const [dependent, setDependent] = useState('')
  const [selected, setSelected] = useState('')
  const [message, setMessage] = useState('')
  const nodes = useMemo(() => buildDependencyNodes(commitments), [commitments])
  const graph = useMemo(() => analyzeDependencies(nodes, relationships), [nodes, relationships])
  const labels = new Map(nodes.map((node) => [dependencyKey(node), node]))

  function addRelationship(event) {
    event.preventDefault()
    const [prerequisiteType, prerequisiteId] = prerequisite.split(':')
    const [dependentType, dependentId] = dependent.split(':')
    const prerequisiteItem = { type: prerequisiteType, id: prerequisiteId }
    const dependentItem = { type: dependentType, id: dependentId }
    if (wouldCreateDependencyCycle(relationships, prerequisiteItem, dependentItem)) {
      setMessage('That link would create a dependency cycle. No change was saved.')
      return
    }
    const result = saveRelationships([...relationships, { id: createId('rel'), prerequisite: prerequisiteItem, dependent: dependentItem, createdAt: new Date().toISOString() }])
    setMessage(result.ok ? 'Dependency saved.' : result.error)
  }

  function removeRelationship(id) {
    const result = saveRelationships(relationships.filter((edge) => edge.id !== id))
    setMessage(result.ok ? 'Dependency removed.' : result.error)
  }

  if (!commitments.length) return <div className="page-wrap"><EmptyState icon={GitBranch} title="No obligations to connect" body="Add a commitment and its actions to build a local dependency graph." /></div>

  return <main className="page-wrap space-y-6">
    <header><p className="text-sm font-semibold uppercase tracking-wide text-accent">Obligation relationships</p><h1 className="mt-1 text-3xl font-bold text-ink">Dependency graph</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">Connect prerequisites to the commitments or actions they unblock. Arrows point from prerequisite to dependent item; relationships stay in this browser.</p></header>
    {storageError && <p role="alert" className="rounded-xl bg-warn-soft p-3 text-sm text-warn">{storageError}</p>}
    {message && <p role="status" className="rounded-xl bg-raised p-3 text-sm text-muted">{message}</p>}
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Graph metrics">
      <Metric label="Items" value={graph.metrics.nodes} /><Metric label="Links" value={graph.metrics.relationships} /><Metric label="Blocked links" value={graph.metrics.blocked} /><Metric label="Longest chain" value={graph.metrics.longestChain} />
    </section>
    <section className="surface-card p-4 sm:p-6"><h2 className="text-lg font-semibold text-ink">Add a dependency</h2><form className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end" onSubmit={addRelationship}>
      <label className="text-sm font-medium text-ink">Prerequisite<select required className="mt-1 w-full rounded-xl border border-line bg-raised p-2.5" value={prerequisite} onChange={(event) => setPrerequisite(event.target.value)}><option value="">Choose item</option>{nodes.map((node) => <option key={dependencyKey(node)} value={dependencyKey(node)}>{node.type === 'action' ? 'Action · ' : 'Commitment · '}{node.label}</option>)}</select></label>
      <span className="hidden pb-3 text-center text-muted sm:block" aria-hidden="true">→</span>
      <label className="text-sm font-medium text-ink">Depends on prerequisite<select required className="mt-1 w-full rounded-xl border border-line bg-raised p-2.5" value={dependent} onChange={(event) => setDependent(event.target.value)}><option value="">Choose item</option>{nodes.map((node) => <option key={dependencyKey(node)} value={dependencyKey(node)}>{node.type === 'action' ? 'Action · ' : 'Commitment · '}{node.label}</option>)}</select></label>
      <Button type="submit" disabled={!prerequisite || !dependent}><Plus className="size-4" aria-hidden="true" />Connect</Button>
    </form><p className="mt-2 text-xs text-muted">Cycles and self-links are prevented. Completed prerequisites no longer count as blockers.</p></section>
    <section className="surface-card p-4 sm:p-6"><h2 className="text-lg font-semibold text-ink">Connected graph</h2>
      {graph.edges.length ? <ul className="mt-4 space-y-3">{graph.edges.map((edge) => <li key={edge.id} className="rounded-xl border border-line p-3 sm:p-4"><div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
        <NodeButton node={labels.get(dependencyKey(edge.prerequisite))} selected={selected === dependencyKey(edge.prerequisite)} onClick={() => setSelected(dependencyKey(edge.prerequisite))} />
        <span className="text-center font-semibold text-accent" aria-label="leads to">→</span>
        <NodeButton node={labels.get(dependencyKey(edge.dependent))} selected={selected === dependencyKey(edge.dependent)} onClick={() => setSelected(dependencyKey(edge.dependent))} />
        <button type="button" onClick={() => removeRelationship(edge.id)} className="inline-flex items-center justify-center rounded-lg p-2 text-muted hover:bg-warn-soft hover:text-warn" aria-label="Remove dependency"><Trash2 className="size-4" /></button>
      </div></li>)}</ul> : <p className="mt-3 text-sm text-muted">No dependencies yet. Add one above to map prerequisite chains.</p>}
      <h3 className="mt-6 text-sm font-semibold text-ink">All graph items</h3><ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{nodes.map((node) => <li key={dependencyKey(node)}><NodeButton node={node} selected={selected === dependencyKey(node)} onClick={() => setSelected(dependencyKey(node))} /></li>)}</ul>
      {selected && labels.has(selected) && <aside className="mt-5 rounded-xl bg-raised p-4" aria-live="polite"><h3 className="font-semibold text-ink">{labels.get(selected).label}</h3><p className="mt-1 text-sm text-muted">{labels.get(selected).type === 'action' ? 'Action' : 'Commitment'} · {labels.get(selected).completed ? 'Completed' : 'Open'}</p><p className="mt-2 text-sm text-muted">Prerequisites: {graph.prerequisitesFor(labels.get(selected)).map((item) => item.label).join(', ') || 'None'}</p><p className="mt-1 text-sm text-muted">Dependents: {graph.dependentsFor(labels.get(selected)).map((item) => item.label).join(', ') || 'None'}</p></aside>}
    </section>
  </main>
}

function Metric({ label, value }) { return <div className="surface-card p-4"><p className="text-xs font-medium text-muted">{label}</p><p className="mt-1 text-2xl font-bold text-ink">{value}</p></div> }
function NodeButton({ node, selected, onClick }) { return <button type="button" onClick={onClick} className={`w-full rounded-lg border p-3 text-left ${selected ? 'border-accent bg-accent-soft' : 'border-line bg-raised'}`}><span className="block truncate text-sm font-semibold text-ink">{node?.label ?? 'Unavailable item'}</span><span className="mt-1 block text-xs text-muted">{node?.type === 'action' ? 'Action' : 'Commitment'}{node?.dueDate ? ` · Due ${node.dueDate}` : ''}{node?.completed ? ' · Complete' : ''}</span></button> }
