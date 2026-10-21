import { analyzeDependencies, buildDependencyNodes, dependencyKey } from './dependencyGraph.js'
import { daysBetween, classifyDate, classifyDeadline, offsetDate } from './obligationEngine.js'
import { getAcceptedEvidence } from './obligationExplorer.js'
import { todayIso } from './format.js'


export function answerObligationQuestion(question, commitments = [], relationships = [], today = todayIso()) {
  const text = String(question ?? '').trim()
  const base = { queryType: 'unsupported', question: text, answerSummary: '', items: [], calculations: [], evidence: [], recommendations: [], limitations: [], confidence: 'low' }
  if (!text) return { ...base, answerSummary: 'Enter a question about your saved obligations.' }
  if (text.length > 500) return { ...base, answerSummary: 'Please shorten your question to 500 characters or fewer.' }

  const records = commitments.filter((record) => record && typeof record.title === 'string')
  const nodes = buildDependencyNodes(records)
  const graph = analyzeDependencies(nodes, relationships)
  const has = (...patterns) => patterns.some((pattern) => pattern.test(text))
  const nameMatches = findRecords(text, records)
  const ambiguous = nameMatches.length > 1
  const withName = (result) => {
    if (ambiguous) return { ...base, queryType: 'clarification', answerSummary: `Which commitment did you mean: ${nameMatches.map((record) => `“${record.title}”`).join(', ')}?`, confidence: 'low' }
    return result
  }

  if (has(/\b(payment|payments|paid|pay|verification|verified|unverified|confirm(?:ation)?)\b/i) || /how much.*pending|pending amount/i.test(text)) {
    return { ...base, queryType: 'payment_information', answerSummary: 'Payment verification cannot be determined from the saved records.', limitations: ['The current data model does not store payment transactions or confirmation/verification status. A purchase amount is not evidence that payment was made, and missing confirmation does not mean payment failed.'], recommendations: ['Record a payment and its verification status in a future supported payment workflow.'], confidence: 'high' }
  }

  if (has(/\b(outstanding|remaining balance|balance due|owed|financial|amount|cost|largest|highest)\b/i) && !/\b(missing|without|no)\b.*\b(financial|amount)\b/i.test(text)) {
    const exposureItems = records.flatMap((record) => Object.entries(record.financialExposure ?? {})
      .filter(([key, value]) => key !== 'notes' && typeof value === 'number')
      .map(([kind, amount]) => ({ id: record.id, commitmentId: record.id, type: 'commitment', title: record.title, amount, currency: record.currency, financialKind: kind, reason: `${humanize(kind)} is explicitly recorded; this is not an inferred balance.` })))
      .sort((a, b) => b.amount - a.amount)
    const outstanding = /outstanding|remaining balance|balance due|owed/i.test(text)
    return { ...base, queryType: outstanding ? 'outstanding_amount' : 'recorded_financial_exposure', answerSummary: outstanding ? 'A reliable outstanding balance is unavailable in the saved data.' : exposureItems.length ? `Found ${exposureItems.length} explicitly recorded financial exposure amount${exposureItems.length === 1 ? '' : 's'}. Different currencies are kept separate.` : 'No financial exposure amounts are recorded.', items: outstanding ? [] : exposureItems, limitations: outstanding ? ['The model stores purchase price and selected exposure fields, but no verified remaining-balance calculation or payment ledger. Purchase price is not treated as outstanding balance.'] : ['These are recorded exposure fields, not a verified amount owed. Purchase amounts are not added to exposure amounts.'], confidence: 'high' }
  }

  if (has(/\b(block(?:ed|ing)?|depend(?:s|ent|ency|encies)?|dependency|chain)\b/i)) {
    const actionNodes = nodes.filter((node) => node.type === 'action')
    let items = []
    if (/which actions are blocked|blocked actions|actions blocked/i.test(text)) {
      items = graph.blocked.map((edge) => {
        const target = nodes.find((node) => dependencyKey(node) === dependencyKey(edge.dependent))
        const source = nodes.find((node) => dependencyKey(node) === dependencyKey(edge.prerequisite))
        return target && !target.completed ? { ...target, reason: `Blocked by unfinished prerequisite “${source?.label}”.`, prerequisite: source?.label } : null
      }).filter(Boolean)
    } else if (nameMatches.length === 1) {
      const record = nameMatches[0]
      const matchedNodes = nodes.filter((node) => node.commitmentId === record.id)
      const selected = matchedNodes.filter((node) => text.toLocaleLowerCase().includes(node.label.toLocaleLowerCase()))
      const anchors = selected.length ? selected : matchedNodes
      const related = [...new Map(anchors.flatMap((node) => [...graph.prerequisitesFor(node).map((item) => [dependencyKey(item), { ...item, reason: 'Recorded prerequisite in the dependency graph.' }]), ...graph.dependentsFor(node).map((item) => [dependencyKey(item), { ...item, reason: 'This saved item is connected as a prerequisite to the dependent item.' }])])).values()]
      items = related
    } else if (/what depends|depend(?:s|ent|ency|encies)? on/i.test(text)) {
      items = actionNodes.flatMap((node) => graph.dependentsFor(node).map((item) => ({ ...item, reason: `Depends on recorded item “${node.label}”.` })))
    }
    if (!nameMatches.length && /chain/i.test(text) && graph.edges.length) return { ...base, queryType: 'clarification', answerSummary: `Which commitment should I trace? Saved commitments: ${records.map((record) => `“${record.title}”`).join(', ')}.`, confidence: 'medium' }
    return withName({ ...base, queryType: 'dependencies', answerSummary: items.length ? `${items.length} recorded dependency result${items.length === 1 ? '' : 's'} found.` : graph.edges.length ? 'No matching recorded dependency was found for that question.' : 'No dependency relationships have been recorded. This does not establish whether real-world dependencies exist.', items, recommendations: items.length ? [] : ['Add or review links in the Dependency Graph if these relationships apply.'], confidence: 'high' })
  }

  if (has(/\b(evidence|source text|quote|document findings?|findings?|why was|supports?)\b/i)) {
    if (/missing.*evidence|evidence.*missing/i.test(text)) {
      const items = records.filter((record) => getAcceptedEvidence(record).length === 0).map((record) => ({ id: record.id, commitmentId: record.id, type: 'commitment', title: record.title, reason: 'No accepted document excerpt or retained source quote is saved with this commitment.' }))
      return withName({ ...base, queryType: 'missing_evidence', answerSummary: `${items.length} commitment${items.length === 1 ? '' : 's'} have no retained evidence excerpt.`, items, limitations: ['Evidence is optional; this reports only whether a source excerpt is currently saved, not whether the commitment is valid.'], confidence: 'high' })
    }
    const evidence = records.flatMap((record) => getAcceptedEvidence(record).map((item) => ({ ...item, commitmentId: record.id, commitmentTitle: record.title, confirmed: !(item.confidence?.toLowerCase().includes('unconfirmed')) })))
    const terms = text.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 3 && !['evidence', 'supports', 'source', 'document', 'findings', 'deadline', 'commitment', 'amount', 'show', 'which', 'what', 'this'].includes(word))
    const matchedEvidence = evidence.filter((item) => (!nameMatches.length || nameMatches.some((record) => record.id === item.commitmentId)) && (!terms.length || terms.some((word) => `${item.title} ${item.extractedValue} ${item.quote} ${item.sourceDocumentTitle}`.toLocaleLowerCase().includes(word))))
    const details = /unconfirmed|not accepted|pending review|need(?:s)? verification|needs? review|verify|verification/i.test(text)
    return withName({ ...base, queryType: details ? 'unconfirmed_evidence' : 'document_evidence', answerSummary: details ? 'Unconfirmed review drafts are not retained with saved commitments. Accepted excerpts are available through evidence questions.' : matchedEvidence.length ? `Found ${matchedEvidence.length} saved evidence excerpt${matchedEvidence.length === 1 ? '' : 's'}.` : 'No retained evidence excerpt matches this question.', items: details ? [] : matchedEvidence.map((item) => ({ id: item.id, commitmentId: item.commitmentId, title: item.title, commitmentTitle: item.commitmentTitle, extractedValue: item.extractedValue, sourceDocumentTitle: item.sourceDocumentTitle, confidence: item.confidence, quote: item.quote, reason: item.legacy ? 'Recovered from a saved note on this record.' : 'Accepted document evidence saved with this commitment.' })), evidence: details ? [] : matchedEvidence.map((item) => ({ quote: item.quote, source: item.sourceDocumentTitle, commitmentTitle: item.commitmentTitle })), limitations: details ? ['Document Intelligence review drafts are temporary and not stored as commitment findings unless accepted.'] : matchedEvidence.length ? [] : ['The document source text may not have been retained, so an excerpt cannot be shown.'], confidence: matchedEvidence.length ? 'high' : 'medium' })
  }

  if (has(/\b(missing|without|no deadline|no due date|no next action|next action|verification|incomplete information)\b/i)) {
    if (/deadline|due date/i.test(text)) {
      const items = records.filter((record) => !(record.actions ?? []).some((action) => !action.completed && action.dueDate) && !(record.importantDates ?? []).some((date) => !date.resolved && date.date)).map((record) => ({ id: record.id, commitmentId: record.id, type: 'commitment', title: record.title, reason: 'No incomplete action or unresolved important date has a recorded deadline.' }))
      return withName({ ...base, queryType: 'missing_deadline', answerSummary: `${items.length} commitment${items.length === 1 ? '' : 's'} have no recorded open deadline.`, items, confidence: 'high' })
    }
    if (/next action|action/i.test(text)) {
      const items = records.filter((record) => !(record.actions ?? []).some((action) => !action.completed)).map((record) => ({ id: record.id, commitmentId: record.id, type: 'commitment', title: record.title, reason: (record.actions ?? []).length ? 'All recorded actions are complete.' : 'No next action is recorded.' }))
      return withName({ ...base, queryType: 'missing_action', answerSummary: `${items.length} commitment${items.length === 1 ? '' : 's'} have no incomplete recorded next action.`, items, confidence: 'high' })
    }
    if (/financial|amount|payment/i.test(text)) {
      const items = records.filter((record) => !record.amount && !Object.values(record.financialExposure ?? {}).some((value) => typeof value === 'number')).map((record) => ({ id: record.id, commitmentId: record.id, type: 'commitment', title: record.title, reason: 'No purchase amount or numeric financial exposure is recorded.' }))
      return withName({ ...base, queryType: 'missing_financial_information', answerSummary: `${items.length} commitment${items.length === 1 ? '' : 's'} have no recorded purchase amount or numeric exposure.`, items, limitations: ['A missing amount is not assumed to be zero.'], confidence: 'high' })
    }
    return { ...base, queryType: 'unconfirmed_evidence', answerSummary: 'Unconfirmed document findings are not retained in the saved commitment data.', limitations: ['Only findings explicitly accepted into a commitment remain available here.'] }
  }

  if (has(/\b(overdue|past (?:the )?deadline|past due)\b/i)) {
    const prerequisiteKeys = /prerequisite/i.test(text) ? new Set(relationships.map((edge) => dependencyKey(edge.prerequisite))) : null
    const items = records.flatMap((record) => (record.actions ?? []).filter((action) => !action.completed && classifyDate(action.dueDate, today) === 'overdue' && (!prerequisiteKeys || prerequisiteKeys.has(dependencyKey({ type: 'action', id: action.id })))).map((action) => ({ id: action.id, commitmentId: record.id, type: 'action', title: action.title, commitmentTitle: record.title, dueDate: action.dueDate, status: 'Overdue', reason: `Its saved deadline passed; the action is still incomplete.${prerequisiteKeys ? ' It is also recorded as a prerequisite in the dependency graph.' : ''}` })))
    return { ...base, queryType: prerequisiteKeys ? 'overdue_prerequisites' : 'overdue_actions', answerSummary: items.length ? `${items.length} incomplete action${items.length === 1 ? ' has' : 's have'} a recorded deadline in the past${prerequisiteKeys ? ' and is linked as a prerequisite' : ''}.` : prerequisiteKeys ? 'No overdue actions recorded as prerequisites were found.' : 'No incomplete actions with past recorded deadlines were found.', items, confidence: 'high' }
  }

  if (has(/\b(prioriti[sz]e|urgent|what should i do|most urgent|unblock)\b/i)) {
    const items = records.flatMap((record) => (record.actions ?? []).filter((action) => !action.completed).map((action) => {
      const status = classifyDate(action.dueDate, today)
      const node = { type: 'action', id: action.id }
      const dependentCount = graph.dependentsFor(node).filter((item) => !item.completed).length
      const overdue = status === 'overdue'
      const days = action.dueDate ? daysBetween(today, action.dueDate) : Infinity
      const reason = overdue ? `Ranked highly because its recorded deadline (${action.dueDate}) passed and it is incomplete.` : dependentCount ? `${dependentCount} recorded item${dependentCount === 1 ? '' : 's'} depend${dependentCount === 1 ? 's' : ''} on it.` : Number.isFinite(days) ? `Its recorded deadline is ${days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}.` : 'It is an incomplete recorded action; no deadline is available to assess urgency.'
      return { id: action.id, commitmentId: record.id, type: 'action', title: action.title, commitmentTitle: record.title, dueDate: action.dueDate, status: action.dueDate ? status : 'No date', dependentCount, priority: (overdue ? 100000 : 0) + (Number.isFinite(days) ? 10000 - Math.max(-1000, Math.min(days, 10000)) : 0) + dependentCount * 100, reason }
    })).sort((a, b) => b.priority - a.priority).slice(0, 10)
    return { ...base, queryType: 'priority', answerSummary: items.length ? 'Suggested priorities, ranked by recorded urgency and dependencies:' : 'No incomplete actions are recorded to prioritize.', items, calculations: ['Order: overdue actions first; then nearer recorded deadlines; then actions with more incomplete dependents. Actions without due dates are listed after dated work unless they unblock other work.'], confidence: 'high' }
  }

  const period = parsePeriod(text, today)
  if (period && has(/\b(due|deadline|deadlines|tomorrow|week|month|days?|upcoming|complete|today)\b/i)) {
    const items = records.flatMap((record) => [
      ...(record.actions ?? []).filter((action) => !action.completed && inRange(action.dueDate, period)).map((action) => ({ id: action.id, commitmentId: record.id, type: 'action', title: action.title, commitmentTitle: record.title, dueDate: action.dueDate, status: classifyDate(action.dueDate, today), reason: `Incomplete action with recorded date in ${period.label}.` })),
      ...(record.importantDates ?? []).filter((date) => !date.resolved && inRange(date.date, period)).map((date) => ({ id: date.id, commitmentId: record.id, type: 'important_date', title: humanize(date.type), commitmentTitle: record.title, dueDate: date.date, status: classifyDeadline(date.date, today), reason: `Unresolved ${humanize(date.type)} recorded for this commitment.` })),
    ]).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    return { ...base, queryType: 'upcoming_deadlines', answerSummary: items.length ? `${items.length} saved obligation${items.length === 1 ? '' : 's'} fall ${period.label}.` : `No saved deadlines or dates fall ${period.label}.`, items, calculations: [`Date window: ${period.start} through ${period.end}, using local calendar dates.`], confidence: 'high' }
  }

  if (nameMatches.length === 1 && has(/what do i need|what should i|details|for my|tell me about/i)) {
    const record = nameMatches[0]
    const items = [
      ...(record.actions ?? []).map((action) => ({ id: action.id, commitmentId: record.id, type: 'action', title: action.title, commitmentTitle: record.title, status: action.completed ? 'Completed' : action.dueDate ? classifyDate(action.dueDate, today) : 'Open · no date', dueDate: action.dueDate, reason: action.completed ? 'This action is marked complete in the saved record.' : 'This action remains open in the saved record.' })),
      ...(record.importantDates ?? []).filter((date) => !date.resolved).map((date) => ({ id: date.id, commitmentId: record.id, type: 'important_date', title: humanize(date.type), commitmentTitle: record.title, status: classifyDeadline(date.date, today), dueDate: date.date, reason: date.note || 'Unresolved date saved with this commitment.' })),
    ]
    return { ...base, queryType: 'commitment_details', answerSummary: `${record.title}: ${record.amount} ${record.currency} recorded. ${items.length} saved actions or unresolved dates are shown below.`, items, limitations: ['The purchase amount is not an outstanding balance or proof of payment.'], confidence: 'high' }
  }
  if (nameMatches.length) {
    const items = nameMatches.map((record) => ({ id: record.id, commitmentId: record.id, type: 'commitment', title: record.title, merchant: record.merchant, status: record.status, amount: record.amount, currency: record.currency, reason: 'Matched the saved commitment title or merchant.' }))
    return withName({ ...base, queryType: 'commitment_lookup', answerSummary: `${items.length} saved commitment${items.length === 1 ? '' : 's'} matched.`, items, confidence: 'high' })
  }

  return { ...base, answerSummary: 'I could not map that question to a supported local query. Try asking about deadlines, overdue actions, priorities, dependencies, evidence, missing information, saved commitments, or recorded financial exposure.', limitations: ['This is a deterministic, browser-only query engine; it does not use an AI service or external information.'], confidence: 'low' }
}

function parsePeriod(text, today) {
  if (/\btoday\b/i.test(text)) return { start: today, end: today, label: 'today' }
  const tomorrow = /\btomorrow\b/i.test(text)
  const week = /\b(this week|next week|next seven days|coming week)\b/i.test(text)
  const month = /\b(this month)\b/i.test(text)
  const count = /\b(?:next|within|coming)\s+(\d{1,2})\s+days?\b/i.exec(text)
  let days = tomorrow ? 1 : week ? 7 : count ? Math.min(31, Number(count[1])) : 0
  let end
  if (month) {
    const [year, monthIndex] = today.split('-').map(Number)
    end = `${year}-${String(monthIndex).padStart(2, '0')}-${String(new Date(year, monthIndex, 0).getDate()).padStart(2, '0')}`
    days = daysBetween(today, end)
  } else if (days) end = offsetDate(today, days)
  else if (/\b(due|deadlines?|upcoming|complete)\b/i.test(text)) { days = 7; end = offsetDate(today, days) }
  else return null
  if (tomorrow) return { start: end, end, label: 'tomorrow' }
  return { start: today, end, label: month ? 'this month' : `in the next ${days} day${days === 1 ? '' : 's'}` }
}

function inRange(date, period) { return typeof date === 'string' && date >= period.start && date <= period.end }
function humanize(value) { return String(value ?? '').replaceAll('_', ' ') }

function findRecords(text, commitments) {
  const normalized = text.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ')
  const ignored = new Set(['what', 'which', 'where', 'when', 'show', 'find', 'tell', 'about', 'have', 'with', 'from', 'that', 'this', 'your', 'mine', 'need', 'next', 'week', 'month', 'today', 'tomorrow', 'action', 'actions', 'deadline', 'deadlines', 'commitment', 'commitments', 'obligation', 'obligations', 'evidence', 'supports', 'source', 'text', 'please', 'status', 'payment', 'payments', 'amount', 'outstanding', 'recorded', 'unconfirmed', 'should', 'prioritize', 'blocked', 'blocking', 'depend', 'depends', 'dependency', 'chain'])
  const terms = normalized.split(/\s+/).filter((word) => word.length > 2 && !ignored.has(word))
  return commitments.filter((record) => [record.title, record.merchant].some((value) => {
    if (!value) return false
    const normalizedValue = value.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ')
    return normalized.includes(normalizedValue) || terms.some((word) => normalizedValue.split(/\s+/).includes(word))
  }))
}
