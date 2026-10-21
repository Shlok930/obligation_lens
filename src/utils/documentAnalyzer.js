import { createId } from './ids.js'
import { isValidIsoDate } from './format.js'

const MONTHS = new Map([
  ['january', 1], ['jan', 1], ['february', 2], ['feb', 2], ['march', 3], ['mar', 3],
  ['april', 4], ['apr', 4], ['may', 5], ['june', 6], ['jun', 6], ['july', 7], ['jul', 7],
  ['august', 8], ['aug', 8], ['september', 9], ['sep', 9], ['sept', 9], ['october', 10],
  ['oct', 10], ['november', 11], ['nov', 11], ['december', 12], ['dec', 12],
])

const DATE_PATTERN = /\b(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{4}|(?:January|Jan\.?|February|Feb\.?|March|Mar\.?|April|Apr\.?|May|June|Jun\.?|July|Jul\.?|August|Aug\.?|September|Sept?\.?|October|Oct\.?|November|Nov\.?|December|Dec\.?)\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+(?:January|Jan\.?|February|Feb\.?|March|Mar\.?|April|Apr\.?|May|June|Jun\.?|July|Jul\.?|August|Aug\.?|September|Sept?\.?|October|Oct\.?|November|Nov\.?|December|Dec\.?)\s+\d{4})\b/gi
const MONEY_PATTERN = /(?:₹|\u20b9|\bRs\.?\s*|\bINR\s*|\$\s*|\bUSD\s*|€\s*|\bEUR\s*|£\s*|\bGBP\s*)(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/gi

export const DOCUMENT_TYPES = [
  { value: 'purchase', label: 'Purchase confirmation or invoice' },
  { value: 'return_policy', label: 'Return or refund policy' },
  { value: 'booking', label: 'Booking or cancellation confirmation' },
  { value: 'subscription', label: 'Subscription or free-trial terms' },
  { value: 'warranty', label: 'Warranty document' },
  { value: 'refund_message', label: 'Refund communication' },
  { value: 'other', label: 'Other' },
]

export function analyzeDocument(inputText, { documentType = 'other', documentTitle = '', purchaseDate = null } = {}) {
  const text = String(inputText ?? '')
  const sentences = splitSentences(text)
  const referenceDates = extractReferenceDates(sentences, purchaseDate)
  const candidates = []

  for (const sentence of sentences) {
    const lower = sentence.text.toLowerCase()
    const dates = extractDates(sentence)
    const dateType = inferDateType(lower, documentType)
    const deadlineContext = isDeadlineContext(lower, documentType)
    if (deadlineContext && dates.length) {
      for (const date of dates) {
        const warnings = []
        if (date.ambiguous) warnings.push('The date format is ambiguous. Confirm the intended calendar date before saving it.')
        const time = extractTime(sentence.text)
        if (time) warnings.push(`The document includes a ${time} cutoff; the timeline stores calendar dates, so preserve the time in the note.`)
        candidates.push(makeFinding({
          type: 'deadline',
          categoryKey: 'deadlines',
          title: dateTitle(dateType),
          description: `The supplied text ${date.ambiguous ? 'contains a date that could use more than one numeric convention' : 'states a date associated with this obligation'}.`,
          extractedValue: date.iso ?? date.raw,
          valueType: 'date',
          dateType,
          requiredAction: extractDeadlineAction(sentence.text),
          actionDirect: Boolean(extractDeadlineAction(sentence.text)),
          possibleConsequence: 'Check the source terms to confirm what happens on or after this date.',
          confidence: date.ambiguous ? 'low' : 'high',
          warnings,
          evidence: evidenceFor(sentence),
          timeOfDay: time,
          sourceDocumentTitle: documentTitle,
        }))
      }
    }

    const relative = extractRelativeDeadline(sentence, documentType, referenceDates)
    if (relative) candidates.push(makeFinding({ ...relative, evidence: evidenceFor(sentence), sourceDocumentTitle: documentTitle }))

    const moneyFindings = extractMoneyFindings(sentence, documentType, documentTitle)
    candidates.push(...moneyFindings)

    const condition = detectCondition(sentence)
    if (condition) candidates.push(makeFinding({ ...condition, evidence: evidenceFor(sentence), sourceDocumentTitle: documentTitle }))

    const action = detectRequiredAction(sentence)
    if (action && !isDuplicateActionOfDeadline(action, candidates, sentence)) {
      candidates.push(makeFinding({
        type: 'action',
        categoryKey: 'actions',
        title: 'Required action',
        description: 'The supplied text explicitly describes an action or required document.',
        extractedValue: action,
        valueType: 'action',
        dateType: null,
        amount: null,
        currency: null,
        financialKind: null,
        requiredAction: action,
        possibleConsequence: null,
        confidence: /\bmust|required|please|within\b/i.test(sentence.text) ? 'high' : 'medium',
        warnings: [],
        evidence: evidenceFor(sentence),
        sourceDocumentTitle: documentTitle,
      }))
    }
  }

  const findings = deduplicateFindings(candidates)
  markConflictingDates(findings)
  return {
    findings,
    stats: {
      total: findings.length,
      requiringReview: findings.length,
      deadlines: findings.filter((item) => item.categoryKey === 'deadlines').length,
      actions: findings.filter((item) => item.categoryKey === 'actions').length,
      financial: findings.filter((item) => item.categoryKey === 'financial').length,
    },
    warnings: findings.length ? [] : ['No reliable deadlines, amounts, or required actions were found in the supplied text.'],
  }
}

export function splitSentences(text) {
  const output = []
  const pattern = /[.!?]+(?=\s+(?:[A-Z“"']|$))|\n+/g
  let cursor = 0
  for (const match of text.matchAll(pattern)) {
    const end = match.index + match[0].length
    pushSentence(output, text, cursor, end)
    cursor = end
  }
  pushSentence(output, text, cursor, text.length)
  return output
}

function pushSentence(output, text, startOffset, endOffset) {
  const raw = text.slice(startOffset, endOffset)
  const leading = raw.search(/\S/)
  if (leading < 0) return
  const sentence = raw.trim()
  const start = startOffset + leading
  output.push({ text: sentence, start, end: start + sentence.length })
}

export function extractDates(sentence) {
  const dates = []
  for (const match of sentence.text.matchAll(DATE_PATTERN)) {
    const raw = match[0]
    const parsed = parseWrittenDate(raw)
    if (!parsed) continue
    dates.push({ ...parsed, raw, start: sentence.start + match.index, end: sentence.start + match.index + raw.length })
  }
  return dates
}

function parseWrittenDate(raw) {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw)
  if (iso) {
    const value = `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
    return isValidIsoDate(value) ? { iso: value, ambiguous: false } : null
  }
  const numeric = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(raw)
  if (numeric) {
    const first = Number(numeric[1])
    const second = Number(numeric[2])
    const year = numeric[3]
    if (first > 12 && second <= 12) return dateResult(year, second, first, false)
    if (second > 12 && first <= 12) return dateResult(year, first, second, false)
    if (first === second && first <= 12) return dateResult(year, first, second, true)
    return { iso: null, ambiguous: true }
  }
  const monthFirst = /^(\p{L}+)\.?\s+(\d{1,2}),?\s+(\d{4})$/u.exec(raw)
  if (monthFirst) return dateResult(monthFirst[3], MONTHS.get(monthFirst[1].toLowerCase()), Number(monthFirst[2]), false)
  const dayFirst = /^(\d{1,2})\s+(\p{L}+)\.?\s+(\d{4})$/u.exec(raw)
  if (dayFirst) return dateResult(dayFirst[3], MONTHS.get(dayFirst[2].toLowerCase()), Number(dayFirst[1]), false)
  return null
}

function dateResult(year, month, day, ambiguous) {
  if (!month) return null
  const value = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return isValidIsoDate(value) ? { iso: value, ambiguous } : null
}

function extractReferenceDates(sentences, purchaseDate) {
  const references = { delivery: null, purchase: isValidIsoDate(purchaseDate) ? purchaseDate : null, arrival: null, pickup: null }
  for (const sentence of sentences) {
    const lower = sentence.text.toLowerCase()
    const dates = extractDates(sentence).filter((item) => item.iso && !item.ambiguous)
    if (!dates.length) continue
    if (/deliver(?:ed|y)/.test(lower)) references.delivery ??= dates[0].iso
    if (/purchas(?:ed|e)|order date/.test(lower)) references.purchase ??= dates[0].iso
    if (/arrival|check[- ]?in/.test(lower)) references.arrival ??= dates[0].iso
    if (/pickup|pick-up/.test(lower)) references.pickup ??= dates[0].iso
  }
  return references
}

function extractRelativeDeadline(sentence, documentType, references) {
  const expression = /\bwithin\s+(\d{1,2})(?:\s*[–-]\s*(\d{1,2}))?\s+(business|working|calendar)?\s*(days?|hours?)\s+(?:of|after|from)\s+(delivery|purchase|pickup|pick-up|arrival)\b/i.exec(sentence.text)
  if (expression && /return|refund|process|ship|deliver/i.test(sentence.text)) {
    const reference = expression[5].toLowerCase().replace('-', '')
    const referenceDate = references[reference]
    const businessDays = /business|working/i.test(expression[3] ?? '')
    const warnings = []
    let value = expression[0]
    if (businessDays) warnings.push('Business days are not calculated by this prototype; resolve the date with the provider’s stated counting rule.')
    else if (!referenceDate) warnings.push(`The reference date (${reference}) is missing. Add or confirm it before saving an exact deadline.`)
    else if (expression[2]) warnings.push('A range of days is stated; its precise end date requires review.')
    else if (expression[4].toLowerCase().startsWith('hour')) warnings.push('An exact time for the reference event is not available; the date cannot be safely resolved.')
    else value = addCalendarDays(referenceDate, Number(expression[1])) ?? value
    return {
      type: 'deadline', categoryKey: 'deadlines', title: dateTitle(inferDateType(sentence.text.toLowerCase(), documentType)),
      description: `The text states a relative period: “${expression[0]}”.`, extractedValue: value,
      valueType: value === expression[0] ? 'relative_date' : 'date', dateType: inferDateType(sentence.text.toLowerCase(), documentType),
      requiredAction: null, actionDirect: false,
      possibleConsequence: 'Check the original terms and reference date before acting.',
      confidence: warnings.length ? 'medium' : 'medium', warnings: warnings.length ? warnings : ['Calculated from a stated reference date using calendar days; verify the provider’s counting convention.'],
    }
  }

  const before = /\b(?:at least\s+)?(\d{1,3})\s+hours?\s+before\s+(arrival|check[- ]?in)\b/i.exec(sentence.text)
  if (before && /cancel|cancellation/i.test(sentence.text)) {
    const referenceDate = references.arrival
    const warnings = [referenceDate ? 'The source gives a time interval before arrival, but not the arrival time; the exact cutoff cannot be resolved to a date.' : 'The arrival date and time are missing; the exact cutoff cannot be resolved.']
    return {
      type: 'deadline', categoryKey: 'deadlines', title: 'Cancellation notice period', description: 'The text states a notice period before arrival.',
      extractedValue: before[0], valueType: 'relative_date', dateType: 'cancellation_deadline', requiredAction: null,
      possibleConsequence: 'Check the cancellation terms for the applicable cutoff.', confidence: 'medium', warnings,
    }
  }

  const range = /\bwithin\s+(\d{1,2})\s*[–-]\s*(\d{1,2})\s+(business|working|calendar)?\s*days?\s+(?:after|from)\s+(pickup|pick-up|delivery)\b/i.exec(sentence.text)
  if (range && /refund|process/i.test(sentence.text)) {
    return {
      type: 'deadline', categoryKey: 'deadlines', title: 'Expected refund timeline', description: 'The document states a refund processing range.',
      extractedValue: range[0], valueType: 'relative_date', dateType: 'expected_refund', requiredAction: 'Check the refund status if the stated period passes.',
      possibleConsequence: null, confidence: 'medium', warnings: ['The range is relative; business-day deadlines are not calculated. Confirm the reference date and provider counting rules.'],
    }
  }
  return null
}

function extractMoneyFindings(sentence, documentType, documentTitle) {
  const findings = []
  for (const match of sentence.text.matchAll(MONEY_PATTERN)) {
    const raw = match[0]
    const amount = Number(match[1].replace(/,/g, ''))
    if (!Number.isFinite(amount)) continue
    const currency = currencyFor(raw)
    const kind = inferFinancialKind(sentence.text, documentType)
    const warning = currency ? [] : ['Currency could not be identified from the supplied text.']
    findings.push(makeFinding({
      type: 'financial', categoryKey: 'financial', title: financialTitle(kind),
      description: `The text explicitly mentions ${raw}; classification depends on the surrounding wording.`,
      extractedValue: raw, valueType: 'money', amount, currency, financialKind: kind,
      dateType: null, requiredAction: null, possibleConsequence: null,
      confidence: currency && kind !== 'unclassified' ? 'high' : 'medium', warnings: warning,
      evidence: evidenceFor(sentence), sourceDocumentTitle: documentTitle,
    }))
  }
  return findings
}

function detectCondition(sentence) {
  const lower = sentence.text.toLowerCase()
  let type = null
  let title = null
  let categoryKey = 'other'
  let requiredAction = null
  if (/invoice|proof of purchase|receipt/.test(lower) && /required|must|provide|submit|keep|retain/.test(lower)) {
    type = 'requirement'; categoryKey = 'actions'; title = 'Proof of purchase requirement'; requiredAction = /provide|submit/i.test(sentence.text) ? 'Provide the original invoice or proof of purchase' : 'Keep the invoice or proof of purchase'
  } else if (/items? must be unused|unused condition|original packaging/.test(lower)) {
    type = 'condition'; categoryKey = 'other'; title = 'Return condition';
  } else if (/refunds? (?:are )?subject to inspection|inspection required/.test(lower)) {
    type = 'condition'; categoryKey = 'other'; title = 'Inspection condition';
  } else if (/return shipping is non-refundable|shipping cost.{0,30}non-refundable/.test(lower)) {
    type = 'condition'; categoryKey = 'financial'; title = 'Return shipping cost condition';
  } else if (/accidental damage.{0,30}(?:excluded|not covered)|(?:excluded|not covered).{0,30}accidental damage/.test(lower)) {
    type = 'condition'; categoryKey = 'other'; title = 'Warranty exclusion';
  } else if (/cancellations? after.{0,50}(?:fee|charge|incur)|may incur a fee|fee may apply/.test(lower)) {
    type = 'condition'; categoryKey = 'financial'; title = 'Possible cancellation fee';
  } else if (/deposit is required|deposit required/.test(lower)) {
    type = 'condition'; categoryKey = 'financial'; title = 'Deposit requirement';
  }
  if (!type) return null
  const warnings = categoryKey === 'financial' && /fee|charge/i.test(title) && !MONEY_PATTERN.test(sentence.text)
    ? ['The text mentions a fee but does not specify its amount.']
    : []
  MONEY_PATTERN.lastIndex = 0
  return {
    type, categoryKey, title,
    description: `The supplied text states: ${sentence.text}`,
    extractedValue: sentence.text,
    valueType: 'text', dateType: null, amount: null, currency: null, financialKind: null,
    requiredAction, actionDirect: Boolean(requiredAction), possibleConsequence: null,
    confidence: 'high', warnings,
  }
}

function detectRequiredAction(sentence) {
  const text = sentence.text.trim().replace(/[.!?]+$/, '')
  if (/\b(?:contact|call|email|cancel|submit|provide|upload|send|keep|save|retain|photograph|photograph|request|initiate|confirm|check)\b/i.test(text) && /\b(?:must|required|please|within|by|before|keep|save|retain|submit|provide|upload|contact|call|email|request|initiate|confirm|check)\b/i.test(text)) {
    if (/invoice|proof of purchase|receipt/i.test(text)) return null
    if (/free cancellation|cancellation.{0,30}fee/i.test(text)) return null
    return text
  }
  if (/invoice|proof of purchase|receipt/i.test(text) && /required|must/i.test(text)) return null
  return null
}

function isDuplicateActionOfDeadline(action, candidates, sentence) {
  return candidates.some((finding) => finding.type === 'deadline' && finding.evidence?.quote === sentence.text && finding.requiredAction === action)
}

function inferDateType(text, documentType) {
  if (/cancel|cancellation|check-in|arrival/.test(text)) return 'cancellation_deadline'
  if (/trial/.test(text)) return 'trial_expiration'
  if (/renew|subscription/.test(text)) return 'renewal_date'
  if (/warranty|coverage|covered/.test(text)) return 'warranty_expiration'
  if (/refund|reimburse/.test(text)) return 'expected_refund'
  if (/return|returned/.test(text) || documentType === 'return_policy') return 'return_deadline'
  return 'custom'
}

function isDeadlineContext(text, documentType) {
  return /\b(?:return|refund|cancel|cancellation|trial|renewal|renews|warranty|deadline|due|expires?|expiration|submit(?:ted)?|no later than|by\s+\w+|until|through)\b/.test(text) ||
    (documentType === 'subscription' && /\bends?\b/.test(text))
}

function extractDeadlineAction(text) {
  if (/return requests? must be (?:submitted|made|sent)/i.test(text)) return 'Submit the return request'
  if (/cancell?ation must be (?:made|submitted)|must cancel/i.test(text)) return 'Submit the cancellation request'
  if (/must (?:contact|call|email|submit|provide|upload|send|request|initiate|keep|save|retain)/i.test(text)) {
    const action = /must\s+((?:contact|call|email|submit|provide|upload|send|request|initiate|keep|save|retain)[^,.!?]*)/i.exec(text)
    return action?.[1]?.trim() ?? null
  }
  return null
}

function inferFinancialKind(text, documentType) {
  const lower = text.toLowerCase()
  if (/deposit/.test(lower)) return 'deposit'
  if (/refund|reimburse/.test(lower)) return 'expected_refund'
  if (/cancellation fee|fee|penalty|charge after/.test(lower)) return 'fee'
  if (/per month|monthly|per year|annually|subscription renew/.test(lower)) return 'recurring_charge'
  if (/amount paid|paid|purchase price|total order|order total/.test(lower) && documentType === 'purchase') return 'amount_paid'
  return 'unclassified'
}

function currencyFor(raw) {
  if (/₹|\u20b9|\bRs\.?|\bINR\b/i.test(raw)) return 'INR'
  if (/\$|\bUSD\b/i.test(raw)) return 'USD'
  if (/€|\bEUR\b/i.test(raw)) return 'EUR'
  if (/£|\bGBP\b/i.test(raw)) return 'GBP'
  return null
}

function financialTitle(kind) {
  return ({ deposit: 'Deposit', expected_refund: 'Expected refund amount', fee: 'Possible fee or charge', recurring_charge: 'Recurring charge', amount_paid: 'Amount paid', unclassified: 'Amount requiring review' })[kind] ?? 'Amount requiring review'
}

function dateTitle(type) {
  return ({ return_deadline: 'Return deadline', cancellation_deadline: 'Cancellation deadline', renewal_date: 'Renewal date', trial_expiration: 'Trial expiration', warranty_expiration: 'Warranty date', expected_refund: 'Expected refund date', custom: 'Important date' })[type] ?? 'Important date'
}

function evidenceFor(sentence) {
  return { quote: sentence.text, startOffset: sentence.start, endOffset: sentence.end }
}

function makeFinding(fields) {
  return {
    id: createId('finding'),
    type: fields.type,
    categoryKey: fields.categoryKey ?? 'other',
    title: fields.title,
    description: fields.description ?? '',
    extractedValue: fields.extractedValue ?? '',
    valueType: fields.valueType ?? 'text',
    dateType: fields.dateType ?? null,
    amount: fields.amount ?? null,
    currency: fields.currency ?? null,
    financialKind: fields.financialKind ?? null,
    requiredAction: fields.requiredAction ?? null,
    actionDirect: Boolean(fields.actionDirect),
    possibleConsequence: fields.possibleConsequence ?? null,
    evidence: fields.evidence,
    additionalEvidence: [],
    confidence: fields.confidence ?? 'medium',
    reviewStatus: 'needs_review',
    warnings: fields.warnings ?? [],
    notes: '',
    manuallyCorrected: false,
    timeOfDay: fields.timeOfDay ?? null,
    sourceDocumentTitle: fields.sourceDocumentTitle ?? '',
  }
}

function deduplicateFindings(findings) {
  const output = []
  const seen = new Map()
  for (const finding of findings) {
    const key = duplicateKey(finding)
    if (key && seen.has(key)) {
      const existing = seen.get(key)
      existing.additionalEvidence.push(finding.evidence)
      if (!existing.warnings.includes('This same obligation appears more than once in the text; it is shown as one finding.')) {
        existing.warnings.push('This same obligation appears more than once in the text; it is shown as one finding.')
      }
      continue
    }
    if (key) seen.set(key, finding)
    output.push(finding)
  }
  return output
}

function duplicateKey(finding) {
  if (finding.type === 'deadline') return finding.valueType === 'date' ? `date:${finding.dateType}:${finding.extractedValue}` : `relative:${finding.dateType}:${normalizeText(finding.extractedValue)}`
  if (finding.type === 'financial') return `money:${finding.currency}:${finding.amount}:${finding.financialKind}`
  if (finding.type === 'action') return `action:${normalizeText(finding.requiredAction)}`
  return null
}

function markConflictingDates(findings) {
  const dateFindings = findings.filter((item) => item.type === 'deadline' && item.valueType === 'date' && item.dateType)
  const groups = new Map()
  for (const finding of dateFindings) {
    if (!groups.has(finding.dateType)) groups.set(finding.dateType, [])
    groups.get(finding.dateType).push(finding)
  }
  for (const group of groups.values()) {
    if (new Set(group.map((item) => item.extractedValue)).size < 2) continue
    for (const finding of group) {
      finding.warnings.push('The document contains conflicting dates for this obligation. Compare both excerpts before saving.')
      finding.confidence = 'low'
      finding.additionalEvidence.push(...group.filter((item) => item.id !== finding.id).map((item) => item.evidence))
    }
  }
}

function normalizeText(value) {
  return String(value ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function extractTime(text) {
  return /\b(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\b/i.exec(text)?.[1] ?? null
}

function addCalendarDays(isoDate, days) {
  if (!isValidIsoDate(isoDate)) return null
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
