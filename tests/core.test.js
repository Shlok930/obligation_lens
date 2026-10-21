import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeDocument } from '../src/utils/documentAnalyzer.js'
import { buildFindingSavePlan } from '../src/utils/documentFindingPlan.js'
import { selectDashboardMetrics } from '../src/utils/dashboardMetrics.js'
import { buildCommitmentRecord, emptyCommitmentForm, formFromCommitment } from '../src/utils/commitmentModel.js'
import { normalizeCommitment } from '../src/utils/commitmentValidation.js'
import { applyImport, createStoredCommitment, deleteStoredCommitment, exportCommitments, mergeDemoData, previewImportCommitments, readCommitments, removeStoredCommitments, updateStoredCommitment, writeRelationships } from '../src/utils/commitmentStorage.js'
import { buildTimeline } from '../src/utils/obligationEngine.js'
import { getAcceptedEvidence, getCommitmentHealth, getCommitmentRecommendations, simulateActionCompletion, simulateActionDate } from '../src/utils/obligationExplorer.js'
import { analyzeDependencies, buildDependencyNodes, wouldCreateDependencyCycle } from '../src/utils/dependencyGraph.js'
import { answerObligationQuestion } from '../src/utils/obligationQueryEngine.js'
import { createDemoData, DEMO_COMMITMENT_IDS } from '../src/data/demoCommitments.js'

class MemoryStorage {
  values = new Map()
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, String(value)) }
  removeItem(key) { this.values.delete(key) }
}

function record(overrides = {}) {
  return buildCommitmentRecord({
    ...emptyCommitmentForm(new Date(2026, 0, 1)),
    title: 'Camera purchase', amount: '400', currency: 'INR', merchant: 'Example Store',
    ...overrides,
  })
}

test('document evidence offsets exactly match the input and ambiguous dates stay unresolved', () => {
  const text = 'Return requests must be submitted by 03/04/2027. Keep the invoice.'
  const result = analyzeDocument(text, { documentType: 'return_policy' })
  const deadline = result.findings.find((finding) => finding.type === 'deadline')
  assert.ok(deadline)
  assert.equal(text.slice(deadline.evidence.startOffset, deadline.evidence.endOffset), deadline.evidence.quote)
  assert.equal(deadline.confidence, 'low')
  assert.equal(deadline.extractedValue, '03/04/2027')
  assert.ok(deadline.warnings.some((warning) => warning.includes('ambiguous')))
})

test('dependency graph computes prerequisite chains, blockers, and prevents cycles', () => {
  const first = record({ title: 'First' })
  const second = record({ title: 'Second', actions: [{ id: 'act-second', title: 'Submit claim', completed: false }] })
  const third = record({ title: 'Third' })
  const nodes = buildDependencyNodes([first, second, third])
  const links = [
    { id: 'one', prerequisite: { type: 'commitment', id: first.id }, dependent: { type: 'action', id: 'act-second' } },
    { id: 'two', prerequisite: { type: 'action', id: 'act-second' }, dependent: { type: 'commitment', id: third.id } },
  ]
  const graph = analyzeDependencies(nodes, links)
  assert.equal(graph.metrics.longestChain, 2)
  assert.equal(graph.metrics.blocked, 2)
  assert.deepEqual(graph.prerequisitesFor({ type: 'commitment', id: third.id }).map((node) => node.id).sort(), [first.id, 'act-second'].sort())
  assert.equal(wouldCreateDependencyCycle(links, { type: 'commitment', id: third.id }, { type: 'commitment', id: first.id }), true)
  assert.equal(wouldCreateDependencyCycle(links, { type: 'commitment', id: first.id }, { type: 'commitment', id: first.id }), true)
})

test('obligation queries use saved dates, status, evidence, dependencies, and honest limitations', () => {
  const camera = record({ title: 'Camera purchase', actions: [
    { id: 'due-action', title: 'Return camera', dueDate: '2026-01-04', completed: false },
    { id: 'done-action', title: 'Read manual', dueDate: '2026-01-01', completed: true },
    { id: 'next-action', title: 'Register warranty', dueDate: '2026-01-08', completed: false },
  ], documentEvidence: [{ id: 'evidence-1', title: 'Warranty deadline', type: 'deadline', extractedValue: '2026-01-08', quote: 'Register within seven days.', confidence: 'high', acceptedAt: '2026-01-01T00:00:00Z', sourceDocumentTitle: 'Warranty terms' }] })
  const next = record({ title: 'Service plan', actions: [{ id: 'dependent-action', title: 'Activate service', dueDate: null, completed: false }] })
  const links = [{ id: 'link-1', prerequisite: { type: 'action', id: 'next-action' }, dependent: { type: 'action', id: 'dependent-action' } }]
  const due = answerObligationQuestion('Which obligations are due in the next 7 days?', [camera, next], links, '2026-01-01')
  assert.deepEqual(due.items.map((item) => item.id), ['due-action', 'next-action'])
  const overdue = answerObligationQuestion('What is overdue?', [camera], [], '2026-01-05')
  assert.deepEqual(overdue.items.map((item) => item.id), ['due-action'])
  const evidence = answerObligationQuestion('What evidence supports the warranty deadline?', [camera], [], '2026-01-01')
  assert.equal(evidence.items[0].quote, 'Register within seven days.')
  const blocked = answerObligationQuestion('Which actions are blocked by unfinished prerequisites?', [camera, next], links, '2026-01-01')
  assert.equal(blocked.items[0].id, 'dependent-action')
  const payment = answerObligationQuestion('Which payments are awaiting verification?', [camera], [], '2026-01-01')
  assert.match(payment.answerSummary, /cannot be determined/i)
  const balance = answerObligationQuestion('What is my outstanding amount?', [camera], [], '2026-01-01')
  assert.equal(balance.items.length, 0)
  assert.match(balance.limitations[0], /no verified remaining-balance/i)
  const unsupported = answerObligationQuestion('What is the weather?', [], [], '2026-01-01')
  assert.match(unsupported.answerSummary, /could not map/i)
  const ambiguous = answerObligationQuestion('Show camera', [camera, record({ title: 'Camera bag' })], [], '2026-01-01')
  assert.equal(ambiguous.queryType, 'clarification')
  const missingAction = answerObligationQuestion('Which obligations have no recorded next action?', [record({ title: 'No actions', actions: [] })], [], '2026-01-01')
  assert.equal(missingAction.items[0].title, 'No actions')
  const unclearChain = answerObligationQuestion('Show the dependency chain for a commitment.', [camera, next], links, '2026-01-01')
  assert.equal(unclearChain.queryType, 'clarification')
  const todayItems = answerObligationQuestion('What do I need to do today?', [camera], [], '2026-01-04')
  assert.equal(todayItems.items[0].id, 'due-action')
  const laptopDetails = answerObligationQuestion('What do I need to do for my camera?', [camera], [], '2026-01-01')
  assert.equal(laptopDetails.queryType, 'commitment_details')
  const pending = answerObligationQuestion('How much is pending?', [camera], [], '2026-01-01')
  assert.match(pending.answerSummary, /cannot be determined/i)
})

test('demo dataset uses relative dates and can be merged and removed without touching user records', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: new MemoryStorage() })
  const userRecord = record({ title: 'My real obligation' })
  const createdUser = createStoredCommitment([], userRecord)
  assert.equal(createdUser.ok, true)
  const demo = createDemoData('2026-10-22')
  assert.equal(demo.commitments.length, 10)
  assert.equal(demo.commitments.reduce((count, item) => count + item.actions.length, 0), 22)
  assert.equal(demo.relationships.length, 8)
  assert.equal(demo.commitments[0].commitmentDate, '2026-07-24')
  assert.equal(demo.documentSample.text.includes('2026-07-24'), true)
  const metrics = selectDashboardMetrics(demo.commitments, '2026-10-22')
  assert.equal(metrics.activeCount, 8)
  assert.equal(metrics.completedCommitments, 2)
  assert.equal(metrics.overdueActions, 2)
  assert.equal(metrics.exposureByCurrency.length, 0)
  const findings = analyzeDocument(demo.documentSample.text, { documentType: demo.documentSample.type, documentTitle: demo.documentSample.title })
  assert.equal(findings.findings.some((finding) => finding.type === 'financial'), true)
  assert.equal(findings.findings.some((finding) => finding.type === 'deadline'), false)
  const merged = mergeDemoData(createdUser.data, demo.commitments, demo.relationships)
  assert.equal(merged.ok, true)
  assert.equal(merged.data.length, 11)
  assert.equal(merged.relationships.length, 8)
  assert.equal(answerObligationQuestion('What do I need to do for my laptop?', demo.commitments, demo.relationships, '2026-10-22').queryType, 'commitment_details')
  assert.equal(answerObligationQuestion('Which actions are blocked?', demo.commitments, demo.relationships, '2026-10-22').items.length, 5)
  assert.equal(answerObligationQuestion('How much is pending?', demo.commitments, demo.relationships, '2026-10-22').queryType, 'payment_information')
  assert.equal(answerObligationQuestion('Which commitments have missing evidence?', demo.commitments, demo.relationships, '2026-10-22').items.length, 10)
  assert.equal(answerObligationQuestion('Show my college fee details.', demo.commitments, demo.relationships, '2026-10-22').queryType, 'commitment_details')
  assert.equal(answerObligationQuestion('What do I need to do today?', demo.commitments, demo.relationships, '2026-10-22').queryType, 'upcoming_deadlines')
  const duplicate = mergeDemoData(merged.data, demo.commitments, demo.relationships)
  assert.equal(duplicate.alreadyLoaded, true)
  const removed = removeStoredCommitments(merged.data, DEMO_COMMITMENT_IDS)
  assert.equal(removed.removed, 10)
  assert.deepEqual(removed.data.map((item) => item.id), [createdUser.data[0].id])
  assert.equal(removed.relationships.length, 0)
})

test('document findings preserve repeated evidence and flag conflicting dates', () => {
  const text = 'Return by October 16, 2027. Return by October 20, 2027.'
  const result = analyzeDocument(text, { documentType: 'return_policy' })
  assert.equal(result.findings.length, 2)
  assert.ok(result.findings.every((finding) => finding.warnings.some((warning) => warning.includes('conflicting dates'))))
  assert.ok(result.findings.every((finding) => text.slice(finding.evidence.startOffset, finding.evidence.endOffset) === finding.evidence.quote))
})

test('document save plan adds only accepted findings and never overwrites purchase amount', () => {
  const commitment = record()
  const extracted = analyzeDocument('Deposit required: INR 250. Total purchase price INR 400.', { documentType: 'purchase' }).findings
  const findings = extracted.map((finding) => ({ ...finding, reviewStatus: finding.title === 'Deposit' ? 'accepted' : 'rejected' }))
  const plan = buildFindingSavePlan(commitment, findings)
  assert.equal(plan.record.amount, 400)
  assert.equal(plan.record.financialExposure.depositAmount, 250)
  assert.equal(plan.added, 1)
  assert.equal(plan.record.documentEvidence.length, 1)
  assert.equal(plan.record.documentEvidence[0].quote, extracted[0].evidence.quote)
  assert.equal(getAcceptedEvidence(plan.record).length, 1)
  assert.equal(normalizeCommitment(plan.record).ok, true)
  const rebuilt = buildCommitmentRecord(formFromCommitment(plan.record), { existing: plan.record })
  assert.deepEqual(rebuilt.documentEvidence, plan.record.documentEvidence)
})

test('explorer health is explainable and hypothetical completion does not mutate the saved record', () => {
  const commitment = record({ actions: [{ key: 'late-action', title: 'Contact merchant', dueDate: '2026-01-01', completed: false }] })
  assert.equal(getCommitmentHealth(commitment, '2026-01-02').status, 'Overdue')
  const simulated = simulateActionCompletion(commitment, commitment.actions[0].id, '2026-01-02')
  assert.equal(simulated.ok, true)
  assert.equal(simulated.commitment.actions[0].completed, true)
  assert.equal(commitment.actions[0].completed, false)
  assert.equal(simulated.after, 'Completed')
})

test('explorer can show saved evidence excerpts from older note-only records', () => {
  const commitment = record({ actions: [{ key: 'legacy-action', title: 'Submit claim', dueDate: '', note: 'Source: “The claim must be filed with the provider.”', completed: false }] })
  const evidence = getAcceptedEvidence(commitment)
  assert.equal(evidence.length, 1)
  assert.equal(evidence[0].quote, 'The claim must be filed with the provider.')
  assert.equal(evidence[0].legacy, true)
})

test('explorer date scenarios recalculate using shared calendar status and do not save changes', () => {
  const commitment = record({ actions: [{ key: 'planned', title: 'Send documents', dueDate: '2026-01-02', completed: false }] })
  const simulated = simulateActionDate(commitment, commitment.actions[0].id, '2026-01-10', '2026-01-01')
  assert.equal(simulated.before, 'Due soon')
  assert.equal(simulated.after, 'Upcoming')
  assert.equal(commitment.actions[0].dueDate, '2026-01-02')
  const noDate = simulateActionDate(commitment, commitment.actions[0].id, '', '2026-01-01')
  assert.equal(noDate.ok, false)
  assert.equal(getCommitmentHealth(record(), '2026-01-01').status, 'Insufficient information')
  assert.ok(getCommitmentRecommendations(record(), '2026-01-01').some((item) => item.title === 'No deadline recorded'))
})

test('timeline and dashboard metrics share status logic and keep currencies separate', () => {
  const first = record({ importantDates: [{ key: 'date-one', type: 'return_deadline', date: '2026-01-03', note: '' }], actions: [{ key: 'action-one', title: 'Contact merchant', dueDate: '2025-12-31', completed: false }], financialExposure: { refundableAmount: '50', potentialCharge: '25', depositAmount: '', expectedRefundAmount: '', notes: '' } })
  const third = record({ title: 'USD purchase', merchant: 'Other Store', currency: 'USD', financialExposure: { refundableAmount: '10', potentialCharge: '0', depositAmount: '', expectedRefundAmount: '', notes: '' } })
  const second = record({ title: 'Other purchase', currency: 'USD', status: 'completed', actions: [{ key: 'done', title: 'Keep receipt', dueDate: '2025-12-30', completed: true }] })
  const events = buildTimeline([first, second], '2026-01-01')
  assert.ok(events.some((event) => event.eventType === 'action' && event.status === 'overdue'))
  assert.ok(events.some((event) => event.commitmentId === second.id && event.status === 'completed'))
  const metrics = selectDashboardMetrics([first, second, third], '2026-01-01')
  assert.equal(metrics.overdueActions, 1)
  assert.equal(metrics.activeCount, 2)
  assert.deepEqual(metrics.exposureByCurrency, [['INR', 75], ['USD', 10]])
  assert.equal(metrics.completedActions, 1)
})

test('local persistence CRUD, malformed import rejection, and backup round-trip are safe', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: new MemoryStorage() })
  const initial = record()
  const created = createStoredCommitment([], initial)
  assert.equal(created.ok, true)
  assert.match(createStoredCommitment(created.data, record()).error, /similar commitment/i)
  const changed = { ...created.data[0], title: 'Updated camera purchase' }
  const updated = updateStoredCommitment(created.data, changed, created.data[0].updatedAt)
  assert.equal(updated.data[0].title, 'Updated camera purchase')
  const withAction = { ...updated.data[0], actions: [{ id: 'action-local', title: 'Submit return', dueDate: '2026-02-01', note: '', completed: false }] }
  const actionUpdate = updateStoredCommitment(updated.data, withAction, updated.data[0].updatedAt)
  const relation = { id: 'relation-local', prerequisite: { type: 'commitment', id: actionUpdate.data[0].id }, dependent: { type: 'action', id: 'action-local' } }
  assert.equal(writeRelationships(actionUpdate.data, [relation]).ok, true)
  assert.equal(previewImportCommitments('{broken').ok, false)
  const backup = exportCommitments(actionUpdate.data)
  const preview = previewImportCommitments(backup.contents)
  assert.equal(preview.valid.length, 1)
  assert.equal(preview.relationships.length, 1)
  assert.equal(applyImport([], preview.valid, { mode: 'merge' }).records.length, 1)
  const likelyDuplicate = { ...updated.data[0], id: 'another-record-id' }
  const duplicateMerge = applyImport(updated.data, [likelyDuplicate], { mode: 'merge' })
  assert.equal(duplicateMerge.skipped, 1)
  const removed = deleteStoredCommitment(updated.data, changed.id)
  assert.equal(removed.data.length, 0)
  assert.equal(readCommitments().data.length, 0)
  assert.equal(readCommitments().relationships.length, 0)
})
