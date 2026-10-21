import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, FileSearch2, Info, Lightbulb, ShieldCheck } from 'lucide-react'
import { Button } from '../components/ui/Button.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { StatusBadge } from '../components/ui/StatusBadge.jsx'
import { useCommitments } from '../context/CommitmentContext.jsx'
import { categoryLabel, dateTypeLabel } from '../data/catalog.js'
import { classifyDate, classifyDeadline, statusLabel } from '../utils/obligationEngine.js'
import { formatDate, formatMoney, isValidIsoDate, todayIso } from '../utils/format.js'
import { getAcceptedEvidence, getCommitmentHealth, getCommitmentRecommendations, postponeDateByWeek, simulateActionCompletion, simulateActionDate } from '../utils/obligationExplorer.js'

export function ObligationExplorerPage({ onNavigate }) {
  const { commitments, updateCommitment, toggleActionComplete, storageError } = useCommitments()
  const [selectedId, setSelectedId] = useState('')
  const [actionId, setActionId] = useState('')
  const [scenarioType, setScenarioType] = useState('complete')
  const [scenarioDate, setScenarioDate] = useState('')
  const [message, setMessage] = useState(null)
  const today = todayIso()
  const commitment = commitments.find((item) => item.id === selectedId) ?? commitments[0] ?? null
  const actions = commitment?.actions ?? []
  const selectedAction = actions.find((item) => item.id === actionId && !item.completed) ?? actions.find((item) => !item.completed) ?? null
  const health = useMemo(() => commitment ? getCommitmentHealth(commitment, today) : null, [commitment, today])
  const recommendations = useMemo(() => commitment ? getCommitmentRecommendations(commitment, today) : [], [commitment, today])
  const evidence = useMemo(() => commitment ? getAcceptedEvidence(commitment) : [], [commitment])
  const simulation = useMemo(() => {
    if (!commitment || !selectedAction) return null
    if (scenarioType === 'complete') return simulateActionCompletion(commitment, selectedAction.id, today)
    return simulateActionDate(commitment, selectedAction.id, scenarioDate || selectedAction.dueDate, today)
  }, [commitment, scenarioDate, scenarioType, selectedAction, today])
  const simulatedHealth = simulation?.ok ? getCommitmentHealth(simulation.commitment, today) : null

  function changeCommitment(id) {
    setSelectedId(id)
    const selected = commitments.find((item) => item.id === id)
    const action = selected?.actions?.find((item) => !item.completed) ?? selected?.actions?.[0]
    setActionId(action?.id ?? '')
    setScenarioDate(action?.dueDate ?? '')
    setMessage(null)
  }

  function changeAction(id) {
    const action = actions.find((item) => item.id === id)
    setActionId(id)
    setScenarioDate(action?.dueDate ?? '')
    setMessage(null)
  }

  function saveCompletion() {
    if (!commitment || !selectedAction || selectedAction.completed) return
    const result = toggleActionComplete(commitment.id, selectedAction.id)
    setMessage(result.ok ? { type: 'success', text: `“${selectedAction.title}” is now marked complete in this browser.` } : { type: 'error', text: result.error })
  }

  function saveDateChange() {
    if (!commitment || !selectedAction || !isValidIsoDate(scenarioDate)) return
    const changed = {
      ...commitment,
      actions: commitment.actions.map((item) => item.id === selectedAction.id ? { ...item, dueDate: scenarioDate } : item),
      updatedAt: new Date().toISOString(),
    }
    const result = updateCommitment(changed, commitment.updatedAt)
    setMessage(result.ok ? { type: 'success', text: `The saved due date for “${selectedAction.title}” is now ${formatDate(scenarioDate)}.` } : { type: 'error', text: result.error })
  }

  if (commitments.length === 0) return <div className="page-wrap space-y-5">
    <header><h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">Obligation Explorer</h2><p className="mt-2 text-sm text-muted">Understand the information, responsibilities, and scenarios recorded for a commitment.</p></header>
    <EmptyState icon={CalendarClock} title="No commitments to explore" body="Add a commitment first. This workspace uses saved local data and will not invent missing terms or dates." actionLabel="Add commitment" onAction={() => onNavigate('add')} />
  </div>

  const upcomingDates = [...(commitment.importantDates ?? [])].filter((item) => isValidIsoDate(item.date)).sort((a, b) => a.date.localeCompare(b.date))
  const outstandingActions = actions.filter((item) => !item.completed)
  const completedActions = actions.filter((item) => item.completed)
  const financialFields = [
    ['refundableAmount', 'Recorded refundable amount'],
    ['depositAmount', 'Recorded deposit amount'],
    ['expectedRefundAmount', 'Recorded expected refund'],
    ['potentialCharge', 'Recorded potential charge'],
  ].filter(([key]) => commitment.financialExposure?.[key] !== null && commitment.financialExposure?.[key] !== undefined)

  return <div className="page-wrap space-y-6">
    <header><h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">Obligation Explorer</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">A practical view of one saved commitment: what is recorded, what may need attention, and what would change in a simulation.</p></header>
    {storageError && <p role="alert" className="rounded-xl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">{storageError}</p>}
    {message && <p role={message.type === 'error' ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm ${message.type === 'error' ? 'border-warn/30 bg-warn-soft text-warn' : 'border-calm/30 bg-calm-soft text-calm'}`}>{message.text}</p>}
    <section className="surface-card flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
      <label className="block min-w-0 flex-1 text-sm font-semibold text-ink">Select a saved commitment<select className={inputClass} value={commitment.id} onChange={(event) => changeCommitment(event.target.value)}>{commitments.map((item) => <option key={item.id} value={item.id}>{item.title}{item.merchant ? ` — ${item.merchant}` : ''}</option>)}</select></label>
      <Button variant="secondary" onClick={() => onNavigate('obligations')}>Open obligations list <ArrowRight className="size-4" aria-hidden="true" /></Button>
    </section>

    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
      <article className="surface-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-xl font-semibold text-ink">{commitment.title}</h3><StatusBadge status={commitment.status} /></div><p className="mt-1 text-sm text-muted">{categoryLabel(commitment.category)}{commitment.merchant ? ` · ${commitment.merchant}` : ''}</p></div><span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink"><HealthIcon status={health.status} />{health.status}</span></div>
        <p className="mt-4 rounded-xl bg-surface p-3 text-sm leading-relaxed text-ink"><strong>Why:</strong> {health.reason}</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoCell label="Commitment date" value={formatDate(commitment.commitmentDate)} />
          <InfoCell label="Reference" value={commitment.referenceId || 'Not recorded'} />
          <InfoCell label="Recorded purchase amount" value={formatMoney(commitment.amount, commitment.currency)} detail="An entered record value, not a remaining balance or proof of payment." />
          {commitment.description && <InfoCell label="Commitment note" value={commitment.description} detail="Saved with this record; its source is not separately classified." />}
        </dl>
      </article>
      <article className="surface-card p-5 sm:p-6">
        <h3 className="text-base font-semibold text-ink">What do I need to do next?</h3>
        <p className="mt-1 text-xs text-muted">Recommendations are deterministic and explain which saved data triggered them.</p>
        <ul className="mt-4 space-y-3">{recommendations.map((item, index) => <li key={`${item.sourceId ?? 'general'}-${index}`} className="rounded-xl bg-surface p-3"><p className="flex gap-2 text-sm font-semibold text-ink"><Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />{item.title}</p><p className="mt-1 pl-6 text-xs leading-relaxed text-muted">{item.reason}</p></li>)}</ul>
      </article>
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <article className="surface-card p-5 sm:p-6"><h3 className="text-base font-semibold text-ink">Dates and responsibilities</h3><p className="mt-1 text-xs text-muted">Only saved dates and actions are shown; no deadline is inferred.</p>
        <h4 className="mt-4 text-sm font-semibold text-ink">Important dates</h4>{upcomingDates.length ? <ol className="mt-2 space-y-2">{upcomingDates.map((item) => <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-surface p-3"><div className="min-w-0"><p className="text-sm font-semibold text-ink">{dateTypeLabel(item.type)} {item.resolved && <span className="font-normal text-calm">· Resolved</span>}</p><p className="mt-0.5 text-xs text-muted">{formatDate(item.date)}{item.note ? ` · ${item.note}` : ''}</p></div><span className="text-xs text-muted">{item.resolved ? 'Resolved' : importantDateStatus(item, today)}</span></li>)}</ol> : <p className="mt-2 rounded-xl bg-surface p-3 text-sm text-muted">No important dates have been recorded.</p>}
        <h4 className="mt-5 text-sm font-semibold text-ink">Outstanding actions ({outstandingActions.length})</h4>{outstandingActions.length ? <ul className="mt-2 space-y-2">{outstandingActions.map((action) => <li key={action.id} className="rounded-xl bg-surface p-3"><p className="text-sm font-semibold text-ink">{action.title}</p><p className="mt-1 text-xs text-muted">{action.dueDate ? `Due ${formatDate(action.dueDate)} · ${statusLabel(classifyDate(action.dueDate, today))}` : 'No due date recorded'}</p>{action.note && <p className="mt-2 text-xs leading-relaxed text-muted">{action.note}</p>}</li>)}</ul> : <p className="mt-2 rounded-xl bg-surface p-3 text-sm text-muted">No outstanding actions recorded.</p>}
        {completedActions.length > 0 && <><h4 className="mt-5 text-sm font-semibold text-ink">Completed actions ({completedActions.length})</h4><ul className="mt-2 space-y-2">{completedActions.map((action) => <li key={action.id} className="rounded-xl bg-calm-soft/50 p-3"><p className="flex items-center gap-2 text-sm text-ink"><CheckCircle2 className="size-4 text-calm" aria-hidden="true" />{action.title}</p>{action.dueDate && <p className="mt-1 pl-6 text-xs text-muted">Recorded due date: {formatDate(action.dueDate)}</p>}</li>)}</ul></>}
      </article>

      <article className="surface-card p-5 sm:p-6"><h3 className="text-base font-semibold text-ink">Financial exposure</h3><p className="mt-1 text-xs text-muted">Amounts are shown individually and are not summed, to avoid implying an outstanding balance.</p>
        <div className="mt-4 rounded-xl border border-line bg-surface p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Purchase amount in record</p><p className="mt-1 text-lg font-semibold text-ink">{formatMoney(commitment.amount, commitment.currency)}</p><p className="mt-1 text-xs leading-relaxed text-muted">This is not treated as unpaid or still owed.</p></div>
        {financialFields.length > 0 ? <dl className="mt-3 space-y-2">{financialFields.map(([key, label]) => { const evidenceItem = evidence.find((item) => item.amount === Number(commitment.financialExposure[key]) && item.financialKind && financialKindForField(key, item.financialKind)); return <InfoCell key={key} label={label} value={formatMoney(commitment.financialExposure[key], commitment.currency)} detail={evidenceItem ? `Accepted document finding: ${evidenceItem.title}; inspect its evidence below.` : 'Recorded amount; source provenance is not available for this field.'} /> })}</dl> : <p className="mt-3 rounded-xl bg-surface p-3 text-sm text-muted">No separate financial exposure amounts are recorded.</p>}
        <div className="mt-4 flex gap-2 rounded-xl border border-line p-3 text-sm text-muted"><Info className="mt-0.5 size-4 shrink-0" aria-hidden="true"/><p>Remaining balance and upcoming payment are unknown. This record has no payment ledger, verification status, or payment schedule. No amount is assumed to be owed.</p></div>
      </article>
    </section>

    <section className="surface-card p-5 sm:p-6"><div className="flex items-start gap-3"><span className="rounded-xl bg-accent-soft p-2 text-accent"><ShieldCheck className="size-5" aria-hidden="true" /></span><div><h3 className="text-base font-semibold text-ink">What is recorded and what is unknown?</h3><p className="mt-1 text-xs text-muted">The current model does not independently verify user-entered details.</p></div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><InfoCell label="Recorded commitment information" value={`${commitment.title} · ${categoryLabel(commitment.category)} · ${formatDate(commitment.commitmentDate)}`} detail="Saved in this browser. The record does not label these fields as independently verified."/><InfoCell label="Unknown" value="Current balance, payment verification, and any external terms not saved here." detail="The app has no payment ledger and does not infer policy details."/><InfoCell label="Unconfirmed document findings" value="Not retained with this commitment." detail="Only findings explicitly accepted and saved appear as evidence below. Analysis history keeps metadata only."/><InfoCell label="Recorded amount certainty" value="Source provenance depends on whether an accepted evidence record is linked." detail="A recorded amount alone does not establish a remaining obligation."/></div>
    </section>

    <section className="surface-card p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-semibold text-ink">Evidence trail</h3><p className="mt-1 text-xs text-muted">These are excerpts saved when an analyzed finding was accepted. The full source document is not retained.</p></div><Button variant="secondary" onClick={() => onNavigate('documents')}><FileSearch2 className="size-4" aria-hidden="true"/>Analyze another document</Button></div>
      {evidence.length ? <div className="mt-4 space-y-3">{evidence.map((item) => <details key={item.id} className="rounded-xl border border-line bg-surface p-4"><summary className="cursor-pointer text-sm font-semibold text-ink">{item.title} · {item.extractedValue} · Accepted finding</summary><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><InfoCell label="Document" value={item.sourceDocumentTitle || 'Title not recorded'} /><InfoCell label="Confidence at analysis" value={item.confidence} /><InfoCell label="Verification status" value="Accepted by user before saving; not independently verified" /></dl><blockquote className="mt-3 border-l-2 border-accent/40 pl-3 text-sm leading-relaxed text-ink">“{item.quote}”</blockquote>{item.reviewNote && <p className="mt-2 text-xs text-muted">Review note: {item.reviewNote}</p>}</details>)}</div> : <p className="mt-4 rounded-xl bg-surface p-3 text-sm text-muted">No accepted document excerpts are saved with this commitment. No source text is available to display.</p>}
    </section>

    <ScenarioPanel commitment={commitment} selectedAction={selectedAction} actions={actions} onActionChange={changeAction} scenarioType={scenarioType} onScenarioTypeChange={setScenarioType} scenarioDate={scenarioDate || selectedAction?.dueDate || ''} onDateChange={setScenarioDate} simulation={simulation} simulatedHealth={simulatedHealth} currentRecommendations={recommendations} today={today} onSaveCompletion={saveCompletion} onSaveDate={saveDateChange} />
  </div>
}

function ScenarioPanel({ commitment, selectedAction, actions, onActionChange, scenarioType, onScenarioTypeChange, scenarioDate, onDateChange, simulation, simulatedHealth, currentRecommendations, today, onSaveCompletion, onSaveDate }) {
  const incompleteActions = actions.filter((item) => !item.completed)
  const comparableDate = selectedAction?.dueDate && isValidIsoDate(selectedAction.dueDate)
  const dateScenarioReady = scenarioType === 'move_date' && comparableDate && isValidIsoDate(scenarioDate) && simulation?.ok
  return <section className="surface-card p-5 sm:p-6"><div className="max-w-3xl"><h3 className="text-base font-semibold text-ink">What-if analysis</h3><p className="mt-1 text-xs leading-relaxed text-muted">Simulation only: experimenting here never changes saved data. Save buttons below are explicit real changes. This is not a prediction of provider or legal outcomes.</p></div>
    {!incompleteActions.length ? <p className="mt-4 rounded-xl bg-surface p-3 text-sm text-muted">There are no incomplete actions to simulate. The record does not track payment verification or planned payments, so those scenarios are unavailable.</p> : <>
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-ink">Saved action<select className={inputClass} value={selectedAction?.id ?? ''} onChange={(event) => onActionChange(event.target.value)}>{incompleteActions.map((item) => <option key={item.id} value={item.id}>{item.title}{item.dueDate ? ` — ${formatDate(item.dueDate)}` : ''}</option>)}</select></label><label className="text-sm font-medium text-ink">Scenario<select className={inputClass} value={scenarioType} onChange={(event) => onScenarioTypeChange(event.target.value)}><option value="complete">What if I complete this action today?</option><option value="move_date">What if I move its planned date?</option></select></label></div>
      {scenarioType === 'move_date' && <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-sm font-medium text-ink">Hypothetical due date<input className={inputClass} type="date" value={scenarioDate} onChange={(event) => onDateChange(event.target.value)} disabled={!comparableDate}/></label>{comparableDate && <Button variant="secondary" onClick={() => onDateChange(postponeDateByWeek(selectedAction.dueDate))}>Postpone by 7 days</Button>}{!comparableDate && <p className="text-sm text-muted">This action has no valid planned date to move. No date is invented.</p>}</div>}
      {simulation?.ok && selectedAction && <div className="mt-5 grid gap-3 md:grid-cols-2"><ScenarioState title="Current saved state" action={selectedAction} status={selectedAction.completed ? 'Completed' : statusLabel(classifyDate(selectedAction.dueDate, today))} health={getCommitmentHealth(commitment, today)} recommendations={currentRecommendations}/><ScenarioState title="Hypothetical state" action={simulation.commitment.actions.find((item) => item.id === selectedAction.id)} status={simulation.after} health={simulatedHealth} recommendations={simulation.recommendations}/></div>}
      {simulation?.ok && <RecommendationChanges current={currentRecommendations} hypothetical={simulation.recommendations} />}
      {simulation?.ok && <p className="mt-3 flex gap-2 rounded-xl bg-accent-soft p-3 text-xs leading-relaxed text-ink"><AlertTriangle className="size-4 shrink-0" aria-hidden="true"/>Simulation updates only the selected saved action in a temporary copy. Other deadlines remain unchanged.</p>}
      <div className="mt-4 flex flex-wrap gap-2">{scenarioType === 'complete' ? <Button disabled={!selectedAction || selectedAction.completed || !simulation?.ok} onClick={onSaveCompletion}>Save action as complete</Button> : <Button disabled={!dateScenarioReady || scenarioDate === selectedAction?.dueDate} onClick={onSaveDate}>Save this due date</Button>}</div>
    </>}
  </section>
}

function ScenarioState({ title, action, status, health, recommendations }) {
  return <article className="rounded-xl border border-line bg-surface p-4"><h4 className="text-sm font-semibold text-ink">{title}</h4><dl className="mt-3 space-y-2 text-sm"><div><dt className="text-xs font-semibold text-muted">Action</dt><dd className="mt-0.5 text-ink">{action.title}</dd></div><div><dt className="text-xs font-semibold text-muted">Due date</dt><dd className="mt-0.5 text-ink">{action.dueDate ? formatDate(action.dueDate) : 'No date recorded'}</dd></div><div><dt className="text-xs font-semibold text-muted">Action status</dt><dd className="mt-0.5 text-ink">{status}</dd></div><div><dt className="text-xs font-semibold text-muted">Commitment health</dt><dd className="mt-0.5 text-ink">{health.status} — {health.reason}</dd></div></dl><h5 className="mt-3 text-xs font-semibold text-muted">Recommendations under these conditions</h5><ul className="mt-1 list-inside list-disc text-xs leading-relaxed text-ink">{recommendations.map((item, index) => <li key={`${item.sourceId ?? ''}-${index}`}>{item.title}</li>)}</ul></article>
}

function InfoCell({ label, value, detail }) {
  return <div className="min-w-0 rounded-xl bg-surface p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-ink">{value}</dd>{detail && <p className="mt-1 text-xs leading-relaxed text-muted">{detail}</p>}</div>
}

function HealthIcon({ status }) {
  if (status === 'Overdue') return <AlertTriangle className="size-3.5" aria-hidden="true" />
  if (status === 'Completed' || status === 'On track') return <CheckCircle2 className="size-3.5" aria-hidden="true" />
  return <Info className="size-3.5" aria-hidden="true" />
}

function financialKindForField(field, kind) {
  return ({ refundableAmount: [], depositAmount: ['deposit'], expectedRefundAmount: ['expected_refund'], potentialCharge: ['fee'] })[field]?.includes(kind)
}

function importantDateStatus(item, today) {
  const status = classifyDeadline(item.date, today)
  if (status === 'deadline_passed' && item.type === 'expected_refund') return statusLabel('follow_up')
  if (status === 'deadline_passed' && item.type === 'warranty_expiration') return statusLabel('date_passed')
  return statusLabel(status)
}

function RecommendationChanges({ current, hypothetical }) {
  const key = (item) => `${item.sourceId ?? ''}:${item.title}:${item.reason}`
  const before = new Set(current.map(key))
  const after = new Set(hypothetical.map(key))
  const removed = current.filter((item) => !after.has(key(item))).map((item) => item.title)
  const added = hypothetical.filter((item) => !before.has(key(item))).map((item) => item.title)
  if (!removed.length && !added.length) return <p className="mt-3 rounded-xl bg-surface p-3 text-xs text-muted">No recommendation changes under this scenario.</p>
  return <p className="mt-3 rounded-xl bg-accent-soft p-3 text-xs leading-relaxed text-ink"><strong>Recommendation changes in this simulation:</strong> {removed.length ? `No longer shown: ${removed.join(', ')}. ` : ''}{added.length ? `Would appear: ${added.join(', ')}.` : ''}</p>
}

const inputClass = 'mt-1 block w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'
