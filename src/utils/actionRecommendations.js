/**
 * Deterministic recommendation engine.
 * Returns suggested action titles for a given commitment + date event.
 * Never auto-adds actions. Caller must get user consent before saving.
 */

const RULES = {
  purchase: {
    return_deadline: [
      'Review the return conditions',
      'Keep the invoice and product evidence',
    ],
    warranty_expiration: [
      'Check the warranty terms',
      'Preserve the invoice and relevant service records',
    ],
  },
  booking_travel: {
    cancellation_deadline: [
      'Review the cancellation terms',
      'Confirm whether the booking is still needed',
    ],
  },
  subscription_trial: {
    renewal_date: [
      'Review the renewal conditions',
      'Decide whether to continue before the renewal date',
    ],
    trial_expiration: [
      'Review the trial terms',
      'Decide whether to subscribe before the trial ends',
    ],
  },
  refund_return: {
    expected_refund: [
      'Check the refund status',
      "Review the provider's stated refund timeline",
    ],
    return_deadline: [
      'Confirm the return eligibility with the provider',
      'Keep the original packaging and invoice',
    ],
  },
  warranty: {
    warranty_expiration: [
      'Check the warranty terms',
      'Preserve the invoice and relevant service records',
    ],
  },
  rental_deposit: {
    cancellation_deadline: [
      'Review the cancellation or exit terms',
      'Confirm the deposit refund conditions',
    ],
    custom: [
      'Review the rental agreement for any required actions',
    ],
  },
  other: {
    custom: [
      'Review the original terms and take any required action before this date',
    ],
  },
}

/**
 * Returns an array of suggested action title strings for a timeline event.
 * Filters out titles that already exist as actions on the commitment.
 *
 * @param {object} commitment - The parent commitment record
 * @param {string} dateType   - The important-date type (e.g. 'return_deadline')
 * @returns {string[]}
 */
export function getRecommendations(commitment, dateType) {
  const categoryRules = RULES[commitment.category] ?? RULES.other
  const suggestions = categoryRules[dateType] ?? categoryRules.custom ?? []

  const existingTitles = new Set(
    (commitment.actions ?? []).map((a) => normalizeTitle(a.title)),
  )

  return suggestions.filter(
    (suggestion) => !existingTitles.has(normalizeTitle(suggestion)),
  )
}

function normalizeTitle(title) {
  return String(title ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}
