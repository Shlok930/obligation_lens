import { useMemo, useRef, useState } from 'react'
import { ArrowRight, CircleHelp, RotateCcw, Send } from 'lucide-react'
import { useCommitments } from '../context/CommitmentContext.jsx'
import { Button } from '../components/ui/Button.jsx'
import { answerObligationQuestion } from '../utils/obligationQueryEngine.js'

const SUGGESTIONS = [
  'Which obligations are due in the next seven days?',
  'What is overdue right now?',
  'Which payments are awaiting verification?',
  'What should I prioritize today?',
  'Which actions are blocked by unfinished prerequisites?',
  'Show commitments with missing deadlines.',
  'What evidence supports my warranty deadline?',
  'Which commitments have the highest known outstanding amounts?',
  'Which obligations have no recorded next action?',
  'Show the dependency chain for a commitment.',
]

export function AskObligationsPage({ onNavigate, onEdit }) {
  const { commitments, relationships } = useCommitments()
  const [question, setQuestion] = useState('')
  const [conversation, setConversation] = useState([])
  const [message, setMessage] = useState('')
  const input = useRef(null)
  const currentVersion = useMemo(() => snapshotVersion(commitments, relationships), [commitments, relationships])

  function submit(value = question) {
    const clean = value.trim()
    if (!clean) { setMessage('Enter a question first.'); return }
    if (clean.length > 500) { setMessage('Please shorten your question to 500 characters or fewer.'); return }
    if (conversation.at(-1)?.question.toLocaleLowerCase() === clean.toLocaleLowerCase()) {
      setMessage('That was just answered. Refresh the previous answer or ask another question.')
      return
    }
    const result = answerObligationQuestion(clean, commitments, relationships)
    setConversation((items) => [...items, { id: `${Date.now()}-${items.length}`, question: clean, result, version: currentVersion }])
    setQuestion('')
    setMessage('')
  }

  function rerun(entry) {
    const result = answerObligationQuestion(entry.question, commitments, relationships)
    setConversation((items) => items.map((item) => item.id === entry.id ? { ...item, result, version: currentVersion } : item))
  }

  return <div className="page-wrap space-y-6">
    <header><p className="text-sm font-semibold uppercase tracking-wide text-accent">Local obligation intelligence</p><h1 className="mt-1 text-3xl font-bold text-ink">Ask Your Obligations</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">Ask about your saved commitments, dates, actions, evidence, and dependency links. Answers are calculated in this browser from saved records; no AI service or external information is used.</p></header>
    {!commitments.length && <div className="rounded-2xl border border-line bg-raised p-4 text-sm text-muted">No commitments are saved yet. Add a commitment to get answers based on your records. You can still explore supported question types below.</div>}
    {conversation.length > 0 && <section aria-label="Conversation" className="space-y-4">{conversation.map((entry) => <article key={entry.id} className="space-y-3">
      <div className="ml-auto max-w-3xl rounded-2xl rounded-br-sm bg-accent px-4 py-3 text-sm font-medium text-white">{entry.question}</div>
      <section className="surface-card p-4 sm:p-5" aria-label={`Answer to ${entry.question}`}>
        {entry.version !== currentVersion && <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-warn-soft p-3 text-sm text-warn"><span>Saved records changed since this answer was calculated.</span><Button variant="secondary" onClick={() => rerun(entry)}><RotateCcw className="size-4" />Refresh answer</Button></div>}
        <h2 className="font-semibold leading-relaxed text-ink">{entry.result.answerSummary}</h2>
        {entry.result.items.length > 0 && <ul className="mt-4 space-y-3">{entry.result.items.map((item, index) => <li key={`${item.commitmentId ?? item.id ?? 'result'}:${item.id ?? index}`} className="rounded-xl border border-line bg-raised p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="font-semibold text-ink">{item.title}</h3>{item.commitmentTitle && <p className="mt-0.5 text-xs text-muted">{item.commitmentTitle}</p>}</div>{(item.status || item.type) && <span className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted">{item.status || labelType(item.type)}</span>}</div>
          <div className="mt-2 grid gap-1 text-sm text-muted sm:grid-cols-2">{item.dueDate && <p>Recorded date: <time dateTime={item.dueDate}>{item.dueDate}</time></p>}{item.amount !== undefined && <p>Recorded: {new Intl.NumberFormat(undefined, { style: 'currency', currency: item.currency || 'USD' }).format(item.amount)}{item.financialKind ? ` · ${labelType(item.financialKind)}` : ''}</p>}{item.merchant && <p>Merchant: {item.merchant}</p>}</div>
          {item.reason && <p className="mt-2 text-sm leading-relaxed text-muted">{item.reason}</p>}
          {item.quote && <details className="mt-3 rounded-lg border border-line p-3"><summary className="cursor-pointer text-sm font-semibold text-ink">View saved evidence</summary><blockquote className="mt-2 break-words border-l-2 border-accent pl-3 text-sm leading-relaxed text-muted">“{item.quote}”</blockquote><p className="mt-2 text-xs text-muted">{item.sourceDocumentTitle || 'Source document title not retained'} · {item.confidence}</p></details>}
          <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => onEdit?.(item.commitmentId ?? item.id)}>Open commitment <ArrowRight className="size-3.5" /></Button>{item.type === 'action' && <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => onNavigate?.('timeline')}>Open timeline</Button>}{entry.result.queryType === 'dependencies' && <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => onNavigate?.('dependencies')}>Open dependency graph</Button>}</div>
        </li>)}</ul>}
        {entry.result.calculations.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-ink">How this was calculated</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{entry.result.calculations.map((calculation) => <li key={calculation}>{calculation}</li>)}</ul></details>}
        {entry.result.limitations.length > 0 && <div className="mt-4 rounded-xl bg-warn-soft p-3"><h3 className="text-sm font-semibold text-warn">Limitations</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-warn">{entry.result.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></div>}
        {entry.result.recommendations.length > 0 && <div className="mt-3 rounded-xl bg-accent-soft p-3 text-sm text-ink"><ul className="list-disc space-y-1 pl-5">{entry.result.recommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}</ul></div>}
        <p className="mt-3 text-xs text-muted">Rule-based answer · {entry.result.confidence} confidence</p>
      </section>
    </article>)}</section>}
    <section className="surface-card p-4 sm:p-6"><form onSubmit={(event) => { event.preventDefault(); submit() }}>
      <label htmlFor="obligation-question" className="mb-2 block text-sm font-semibold text-ink">Your question</label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end"><textarea ref={input} id="obligation-question" rows={2} maxLength={500} value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() } }} placeholder="Ask about a deadline, action, payment record, or evidence…" className="min-h-14 w-full resize-y rounded-xl border border-line bg-raised px-3 py-3 text-sm text-ink placeholder:text-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" aria-describedby="question-help" />
        <Button type="submit" disabled={!question.trim()}><Send className="size-4" aria-hidden="true" />Ask</Button>
      </div><p id="question-help" className="mt-2 text-xs text-muted">Press Enter to ask, or Shift+Enter for a new line. Up to 500 characters.</p>
      {message && <p role="status" className="mt-2 text-sm text-muted">{message}</p>}
    </form>
    {conversation.length > 0 && <Button variant="ghost" className="mt-3" onClick={() => { setConversation([]); setMessage('') }}>Start a new conversation</Button>}
    </section>
    <section aria-labelledby="suggestion-heading"><h2 id="suggestion-heading" className="text-lg font-semibold text-ink">Try asking</h2><ul className="mt-3 grid gap-2 sm:grid-cols-2">{SUGGESTIONS.map((suggestion) => <li key={suggestion}><button type="button" onClick={() => submit(suggestion)} className="flex h-full w-full items-start gap-2 rounded-xl border border-line bg-raised p-3 text-left text-sm text-ink hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><CircleHelp className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" /><span>{suggestion}</span></button></li>)}</ul></section>
  </div>
}

function snapshotVersion(commitments, relationships) { return JSON.stringify([commitments.map((item) => [item.id, item.updatedAt, item.status]), relationships.map((edge) => [edge.id, edge.prerequisite, edge.dependent])]) }
function labelType(value) { return String(value ?? '').replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()) }
