import { useMemo, useState } from 'react'
import { AlertTriangle, Check, ChevronDown, ChevronUp, FileText, Trash2 } from 'lucide-react'
import { Button } from '../components/ui/Button.jsx'
import { useCommitments } from '../context/CommitmentContext.jsx'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx'
import { CATEGORIES, DATE_TYPES } from '../data/catalog.js'
import { analyzeDocument, DOCUMENT_TYPES } from '../utils/documentAnalyzer.js'
import { addHistoryEntry, clearDocumentHistory, readDocumentHistory, removeHistoryEntry, updateHistoryEntry } from '../utils/documentHistory.js'
import { buildFindingSavePlan } from '../utils/documentFindingPlan.js'
import { buildCommitmentRecord, emptyCommitmentForm } from '../utils/commitmentModel.js'
import { createId } from '../utils/ids.js'
import { isValidIsoDate, todayIso } from '../utils/format.js'
import { createDemoData } from '../data/demoCommitments.js'

const SAMPLES = [
  { type: 'purchase', title: 'Sample purchase confirmation', text: 'Order delivered on October 2, 2026. Returns must be requested by October 16, 2026. Please keep your invoice as proof of purchase. The purchase price was INR 4,500.' },
  { type: 'subscription', title: 'Sample subscription terms', text: 'Your free trial ends on November 12, 2026. Your plan renews on November 13, 2026 at $9.99 per month unless you cancel before renewal.' },
  { type: 'booking', title: 'Sample booking confirmation', text: 'Free cancellation is available until December 5, 2026. A deposit of EUR 120 is required. Cancellation after this date may incur a fee.' },
]

export function DocumentIntelligencePage() {
  const { commitments, createCommitment, updateCommitment } = useCommitments()
  const [text, setText] = useState('')
  const [documentType, setDocumentType] = useState('other')
  const [title, setTitle] = useState('')
  const [merchant, setMerchant] = useState('')
  const [referenceId, setReferenceId] = useState('')
  const [session, setSession] = useState(null)
  const [history, setHistory] = useState(() => readDocumentHistory())
  const [targetId, setTargetId] = useState('')
  const [newRecord, setNewRecord] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('purchase')
  const [saveDecisions, setSaveDecisions] = useState({})
  const [error, setError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [confirmSave, setConfirmSave] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [expanded, setExpanded] = useState({})
  const demoDocumentSample = useMemo(() => createDemoData(todayIso()).documentSample, [])
  const samples = useMemo(() => [...SAMPLES, demoDocumentSample], [demoDocumentSample])

  const accepted = useMemo(() => session?.result.findings.filter((item) => item.reviewStatus === 'accepted' && !item.saved) ?? [], [session])
  const target = commitments.find((item) => item.id === targetId)
  const possibleDuplicateCommitments = useMemo(() => {
    const normalizedMerchant = merchant.trim().toLocaleLowerCase()
    const normalizedReference = referenceId.trim().toLocaleLowerCase()
    const normalizedTitle = newTitle.trim().toLocaleLowerCase()
    if (!newRecord || !normalizedMerchant) return []
    return commitments.filter((item) => item.merchant.trim().toLocaleLowerCase() === normalizedMerchant && (
      normalizedReference && item.referenceId.trim().toLocaleLowerCase() === normalizedReference ||
      normalizedTitle && item.title.trim().toLocaleLowerCase() === normalizedTitle
    ))
  }, [commitments, merchant, newRecord, newTitle, referenceId])
  const preview = target && accepted.length ? buildFindingSavePlan(target, accepted, saveDecisions) : null

  function persistHistory(entry) {
    const result = addHistoryEntry(entry)
    setHistory(result.ok ? { ok: true, entries: result.entries } : result)
    if (!result.ok) setError(result.error)
  }

  function analyze() {
    if (!text.trim()) { setError('Paste document text or choose a sample before analyzing.'); return }
    const result = analyzeDocument(text, { documentType, documentTitle: title })
    const current = { id: createId('doc-session'), result, sourceText: text, createdAt: new Date().toISOString() }
    setSession(current)
    setError('')
    setSavedMessage('')
    setSaveDecisions({})
    persistHistory({ sessionId: current.id, documentTitle: title || 'Untitled document', documentType, analyzedAt: current.createdAt, findingCount: result.findings.length, acceptedCount: 0, relatedCommitmentId: null })
  }

  function updateFinding(id, changes) {
    setSession((current) => ({ ...current, result: { ...current.result, findings: current.result.findings.map((item) => {
      if (item.id !== id) return item
      const correctedDate = changes.extractedValue && item.type === 'deadline' && isValidIsoDate(changes.extractedValue)
      return { ...item, ...changes, ...(correctedDate ? { warnings: item.warnings.filter((warning) => !warning.toLowerCase().includes('ambiguous')), confidence: 'medium' } : {}), manuallyCorrected: true }
    }) } }))
  }

  function setStatus(id, reviewStatus) {
    if (!session) return
    const findings = session.result.findings.map((item) => item.id === id ? { ...item, reviewStatus } : item)
    setSession({ ...session, result: { ...session.result, findings } })
    updateHistoryEntry(session.id, { acceptedCount: findings.filter((item) => item.reviewStatus === 'accepted').length, relatedCommitmentId: targetId || null })
    setHistory(readDocumentHistory())
  }

  function saveAccepted() {
    if (!accepted.length) { setError('Accept at least one finding before saving.'); return }
    if (!target && !newRecord) { setError('Choose an existing commitment or create a new one.'); return }
    if (!target && !newTitle.trim()) { setError('Enter a title for the new commitment.'); return }
    if (preview?.collisions.some((item) => item.choices?.length && saveDecisions[item.id] === undefined)) { setError('Choose how to handle each conflict before saving.'); return }
    const destination = target ?? buildCommitmentRecord({ ...emptyCommitmentForm(), title: newTitle.trim(), category: newCategory, amount: '0', currency: 'INR', commitmentDate: todayIso(), merchant, referenceId })
    const plan = buildFindingSavePlan(destination, accepted, saveDecisions)
    const outcome = target ? updateCommitment(plan.record, target.updatedAt) : createCommitment(plan.record)
    if (!outcome?.ok) { setError(outcome?.error ?? 'Could not save findings. Your review is still available.'); return }
    const savedIds = new Set(accepted.map((item) => item.id))
    setSession((current) => ({ ...current, result: { ...current.result, findings: current.result.findings.map((item) => savedIds.has(item.id) ? { ...item, saved: true } : item) } }))
    updateHistoryEntry(session.id, { acceptedCount: session.result.findings.filter((item) => item.reviewStatus === 'accepted').length, relatedCommitmentId: destination.id })
    setHistory(readDocumentHistory())
    setConfirmSave(false)
    setError('')
    setSavedMessage(`${plan.added} item${plan.added === 1 ? '' : 's'} saved. Existing purchase amount was not changed.`)
  }

  function clearHistory() {
    const result = clearDocumentHistory()
    setHistory(result.ok ? { ok: true, entries: [] } : result)
    if (!result.ok) setError(result.error)
    setClearConfirm(false)
  }

  function selectSample(sample) {
    setDocumentType(sample.type); setTitle(sample.title); setText(sample.text); setError('')
  }

  const segments = session ? sourceSegments(session.sourceText, session.result.findings) : []

  return <div className="page-wrap space-y-6">
    <header><h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">Turn documents into clear next steps.</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">Review dates, actions, and financial terms against the exact text before adding anything to your obligations.</p></header>
    <div className="rounded-2xl border border-accent/20 bg-accent-soft p-4 text-sm text-ink"><strong>Private by design:</strong> analysis runs locally in this browser using transparent text-matching rules. No document text is uploaded or retained in analysis history. This is not legal advice; confirm important interpretations against the original terms.</div>
    <section className="rounded-2xl border border-line bg-raised p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-ink">Document details</h3><div className="flex flex-wrap gap-2">{samples.map((sample) => <Button key={sample.title} variant="secondary" onClick={() => selectSample(sample)}>{sample.title.startsWith('DEMO DOCUMENT') ? 'DEMO laptop terms' : sample.title.replace('Sample ', '')}</Button>)}</div></div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-ink">Document type<select className={inputClass} value={documentType} onChange={(event) => setDocumentType(event.target.value)}>{DOCUMENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="text-sm font-medium text-ink">Document title<input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Store return policy" /></label><label className="text-sm font-medium text-ink">Merchant (optional)<input className={inputClass} value={merchant} onChange={(event) => setMerchant(event.target.value)} /></label><label className="text-sm font-medium text-ink">Reference ID (optional)<input className={inputClass} value={referenceId} onChange={(event) => setReferenceId(event.target.value)} /></label></div>
      <label className="block text-sm font-medium text-ink">Paste document text<textarea className={`${inputClass} min-h-48`} maxLength={30000} value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste only the relevant terms or confirmation text…"/><span className="mt-1 block text-right text-xs text-muted">{text.length.toLocaleString()} / 30,000 characters</span></label>
      {title.startsWith('DEMO DOCUMENT') && <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">Synthetic demo text only. The analyzer can surface the explicit purchase amount, but does not resolve “7 days from purchase” or “15 days from purchase” into calendar deadlines. Review all findings; none are accepted or saved automatically.</p>}
      <Button onClick={analyze} disabled={!text.trim()}>Analyze text locally</Button>
    </section>
    {error && <p role="alert" className="rounded-xl border border-warn/30 bg-warn/5 p-3 text-sm text-warn">{error}</p>}{savedMessage && <p role="status" className="rounded-xl border border-line bg-raised p-3 text-sm text-ink">{savedMessage}</p>}
    {session && <>
      <section className="rounded-2xl border border-line bg-raised p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-ink">Review findings</h3><p className="text-sm text-muted">{session.result.stats.total} found · {session.result.stats.deadlines} dates · {session.result.stats.actions} actions · {session.result.stats.financial} amounts</p></div><Button variant="secondary" onClick={() => { setSession(null); setText(''); setSavedMessage('') }}>Start new analysis</Button></div>
        <div className="rounded-xl bg-surface p-4 text-sm leading-7 text-ink whitespace-pre-wrap">{segments.map((segment, index) => segment.finding ? <mark key={index} className="rounded bg-yellow-200 px-0.5" title={segment.finding.title}>{segment.text}</mark> : <span key={index}>{segment.text}</span>)}</div>
        {!session.result.findings.length && <p className="rounded-xl bg-surface p-4 text-sm text-muted">No reliable findings detected. You can review the source text, try another document type, or enter the obligation manually.</p>}
        {groupFindings(session.result.findings).map(([group, findings]) => <div key={group} className="space-y-3"><h4 className="pt-2 text-sm font-semibold text-muted">{group}</h4>{findings.map((finding) => <FindingCard key={finding.id} finding={finding} expanded={expanded[finding.id]} onExpand={() => setExpanded((current) => ({ ...current, [finding.id]: !current[finding.id] }))} onUpdate={(changes) => updateFinding(finding.id, changes)} onStatus={(status) => setStatus(finding.id, status)} />)}</div>)}
      </section>
      {session.result.findings.length > 0 && <section className="rounded-2xl border border-line bg-raised p-5 shadow-sm space-y-4"><h3 className="font-semibold text-ink">Save accepted findings</h3><p className="text-sm text-muted">Nothing is saved automatically. Only findings you accept are included. Source excerpts are kept with their date/action or notes.</p>
        <label className="text-sm font-medium text-ink">Destination<select className={inputClass} value={newRecord ? '__new' : targetId} onChange={(event) => { setNewRecord(event.target.value === '__new'); setTargetId(event.target.value === '__new' ? '' : event.target.value) }}><option value="">Choose a commitment</option>{commitments.map((item) => <option key={item.id} value={item.id}>{item.title}{item.merchant ? ` — ${item.merchant}` : ''}</option>)}<option value="__new">Create a new commitment…</option></select></label>
        {targetId && !target && <p className="text-sm text-warn">The selected commitment is no longer available. Choose another destination.</p>}
        {newRecord && <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-ink">New commitment title<input className={inputClass} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} /></label><label className="text-sm font-medium text-ink">Category<select className={inputClass} value={newCategory} onChange={(event) => setNewCategory(event.target.value)}>{CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><p className="sm:col-span-2 text-xs text-muted">A new record starts with amount 0 INR and today’s date. Change those details later if needed; extracted amounts are never treated as the purchase amount.</p></div>}
        {newRecord && possibleDuplicateCommitments.length > 0 && <div className="rounded-xl border border-warn/20 bg-warn/5 p-3 text-sm"><p className="font-semibold text-ink">A commitment with the same merchant and reference or title may already exist:</p>{possibleDuplicateCommitments.map((item) => <Button key={item.id} variant="secondary" className="mt-2 mr-2" onClick={() => { setTargetId(item.id); setNewRecord(false) }}>{item.title} — Use this commitment</Button>)}</div>}
        {target && preview?.collisions.map((collision) => <div key={collision.id} className="rounded-xl border border-warn/20 bg-warn/5 p-3 text-sm"><p>{collision.label}</p>{collision.choices && <div className="mt-2 flex gap-2">{collision.choices.map((choice) => <Button key={choice} variant={saveDecisions[collision.id] === choice ? 'primary' : 'secondary'} onClick={() => setSaveDecisions((current) => ({ ...current, [collision.id]: choice }))}>{choice === 'keep' ? 'Keep existing' : choice === 'add' ? 'Add both' : 'Replace existing'}</Button>)}</div>}</div>)}
        {target && accepted.length > 0 && <ul className="list-inside list-disc text-sm text-muted">{accepted.map((item) => <li key={item.id}>{item.title}: {item.extractedValue}</li>)}</ul>}
        <Button disabled={!accepted.length || (!target && !newRecord)} onClick={() => setConfirmSave(true)}>Review and save accepted findings</Button>
      </section>}
    </>}
    <HistoryPanel state={history} onReload={() => setHistory(readDocumentHistory())} onClear={() => setClearConfirm(true)} />
    <ConfirmDialog open={confirmSave} title="Confirm selected findings" body={`Save ${accepted.length} accepted finding(s) to ${target?.title ?? newTitle}? Rejected and unreviewed findings remain untouched.`} confirmLabel="Confirm save" onConfirm={saveAccepted} onCancel={() => setConfirmSave(false)} />
    <ConfirmDialog open={clearConfirm} title="Clear analysis history?" body="This clears metadata only. Document text is not stored in analysis history." confirmLabel="Clear history" danger onConfirm={clearHistory} onCancel={() => setClearConfirm(false)} />
  </div>
}

function FindingCard({ finding, expanded, onExpand, onUpdate, onStatus }) {
  const value = finding.extractedValue
  const isoInput = finding.valueType === 'date' && isValidIsoDate(value)
  return <article className="rounded-xl border border-line p-4 space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><FileText className="size-4 text-accent"/><h4 className="font-semibold text-ink">{finding.title}</h4>{finding.manuallyCorrected && <span className="text-xs text-accent">Edited</span>}</div><p className="mt-1 text-sm text-muted">{finding.extractedValue}{finding.amount !== null ? ` · ${finding.currency ?? 'Currency unknown'} ${finding.amount}` : ''} · {finding.confidence} confidence · {finding.saved ? 'Saved' : finding.reviewStatus.replace('_', ' ')}</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={onExpand} aria-expanded={Boolean(expanded)}>{expanded ? <ChevronUp className="size-4"/> : <ChevronDown className="size-4"/>} Details</Button>{!finding.saved && finding.reviewStatus !== 'accepted' && <Button onClick={() => onStatus('accepted')}><Check className="size-4"/>Accept</Button>}{!finding.saved && finding.reviewStatus !== 'rejected' && <Button variant="secondary" onClick={() => onStatus('rejected')}>Reject</Button>}{finding.reviewStatus !== 'needs_review' && !finding.saved && <Button variant="ghost" onClick={() => onStatus('needs_review')}>Review again</Button>}</div></div>
    {finding.warnings.map((warning) => <p key={warning} className="flex gap-2 text-sm text-warn"><AlertTriangle className="size-4 shrink-0"/>{warning}</p>)}
    <blockquote className="border-l-2 border-accent/40 pl-3 text-sm italic text-muted">“{finding.evidence.quote}”</blockquote>
    {expanded && <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
      <label className="text-xs font-semibold text-muted">Finding title<input className={inputClass} value={finding.title} onChange={(e) => onUpdate({ title: e.target.value })}/></label>
      <label className="text-xs font-semibold text-muted">Extracted value<input className={inputClass} type={finding.type === 'deadline' && finding.valueType === 'date' ? 'date' : 'text'} value={finding.type === 'deadline' && finding.valueType === 'date' && !isoInput ? '' : value} onChange={(e) => onUpdate({ extractedValue: e.target.value, ...(finding.type === 'deadline' ? { valueType: 'date' } : {}) })}/></label>
      {finding.type === 'deadline' && <label className="text-xs font-semibold text-muted">Date type<select className={inputClass} value={finding.dateType ?? 'custom'} onChange={(e) => onUpdate({ dateType: e.target.value })}>{DATE_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
      {finding.amount !== null && <><label className="text-xs font-semibold text-muted">Amount<input className={inputClass} type="number" min="0" step="0.01" value={finding.amount} onChange={(e) => onUpdate({ amount: e.target.value === '' ? null : Number(e.target.value) })}/></label><label className="text-xs font-semibold text-muted">Currency<input className={inputClass} value={finding.currency ?? ''} onChange={(e) => onUpdate({ currency: e.target.value.toUpperCase() || null })}/></label></>}
      {(finding.type === 'action' || finding.requiredAction) && <label className="text-xs font-semibold text-muted sm:col-span-2">Required action<input className={inputClass} value={finding.requiredAction ?? ''} onChange={(e) => onUpdate({ requiredAction: e.target.value || null })}/></label>}
      <label className="text-xs font-semibold text-muted sm:col-span-2">Your review note<textarea className={`${inputClass} min-h-16`} value={finding.notes} onChange={(e) => onUpdate({ notes: e.target.value })}/></label>
      {finding.additionalEvidence.map((evidence, index) => <blockquote key={`${index}-${evidence.startOffset}`} className="sm:col-span-2 border-l-2 border-line pl-3 text-xs italic text-muted">“{evidence.quote}”</blockquote>)}
    </div>}
  </article>
}

function HistoryPanel({ state, onReload, onClear }) {
  if (!state.ok) return <section className="rounded-xl border border-warn/30 p-4 text-sm text-warn">{state.error} Existing history was preserved.</section>
  return <section className="rounded-2xl border border-line bg-raised p-5 space-y-3"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">Analysis history</h3><p className="text-xs text-muted">Metadata only. Source text is never retained; paste it again to review.</p></div>{state.entries.length > 0 && <Button variant="secondary" onClick={onClear}><Trash2 className="size-4"/>Clear all…</Button>}</div>{!state.entries.length ? <p className="text-sm text-muted">No analysis history yet.</p> : state.entries.map((entry) => <HistoryItem key={entry.sessionId} entry={entry} onChange={onReload}/>)}</section>
}

function HistoryItem({ entry, onChange }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm"><div><p className="font-medium">{entry.documentTitle}</p><p className="text-xs text-muted">{DOCUMENT_TYPES.find((item) => item.value === entry.documentType)?.label ?? entry.documentType} · {new Date(entry.analyzedAt).toLocaleString()} · {entry.findingCount} findings · {entry.acceptedCount} accepted</p></div><Button variant="ghost" onClick={() => { removeHistoryEntry(entry.sessionId); onChange() }} aria-label={`Remove ${entry.documentTitle} from history`}><Trash2 className="size-4"/></Button></div>
}

function sourceSegments(text, findings) {
  const ranges = findings.map((finding) => ({ start: finding.evidence.startOffset, end: finding.evidence.endOffset, finding })).filter((item) => item.start >= 0 && item.end <= text.length).sort((a, b) => a.start - b.start || b.end - a.end)
  const segments = []; let cursor = 0
  for (const range of ranges) { if (range.start < cursor) continue; if (range.start > cursor) segments.push({ text: text.slice(cursor, range.start) }); segments.push({ text: text.slice(range.start, range.end), finding: range.finding }); cursor = range.end }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) })
  return segments
}

function groupFindings(findings) {
  const labels = { deadlines: 'Dates and deadlines', actions: 'Actions and requirements', financial: 'Financial terms', other: 'Other conditions' }
  const groups = new Map()
  for (const finding of findings) {
    const label = labels[finding.categoryKey] ?? labels.other
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(finding)
  }
  return groups
}

const inputClass = 'mt-1 block w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'
