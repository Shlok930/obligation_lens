export const CATEGORIES = [
  { value: 'purchase', label: 'Purchase' },
  { value: 'booking_travel', label: 'Booking or Travel' },
  { value: 'subscription_trial', label: 'Subscription or Free Trial' },
  { value: 'refund_return', label: 'Refund or Return' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'rental_deposit', label: 'Rental or Deposit' },
  { value: 'other', label: 'Other' },
]

export const CHANNELS = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'other', label: 'Other' },
]

export const CURRENCIES = [
  { value: 'INR', label: 'INR (₹)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
]

export const DATE_TYPES = [
  { value: 'return_deadline', label: 'Return deadline' },
  { value: 'cancellation_deadline', label: 'Cancellation deadline' },
  { value: 'renewal_date', label: 'Subscription renewal date' },
  { value: 'trial_expiration', label: 'Trial expiration date' },
  { value: 'warranty_expiration', label: 'Warranty expiration date' },
  { value: 'expected_refund', label: 'Expected refund date' },
  { value: 'custom', label: 'Custom deadline' },
]

export const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

export const SUGGESTED_DATE_TYPES = {
  purchase: ['return_deadline', 'warranty_expiration'],
  booking_travel: ['cancellation_deadline'],
  subscription_trial: ['renewal_date', 'trial_expiration'],
  refund_return: ['expected_refund', 'return_deadline'],
  warranty: ['warranty_expiration'],
  rental_deposit: ['custom', 'cancellation_deadline'],
  other: ['custom'],
}

export function categoryLabel(value) {
  return CATEGORIES.find((item) => item.value === value)?.label ?? value
}

export function dateTypeLabel(value) {
  return DATE_TYPES.find((item) => item.value === value)?.label ?? value
}

export function channelLabel(value) {
  return CHANNELS.find((item) => item.value === value)?.label ?? value
}

export function statusLabel(value) {
  return STATUSES.find((item) => item.value === value)?.label ?? value
}
