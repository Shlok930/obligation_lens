/**
 * Sample records used only when local storage has never been initialized.
 * They are marked source: "sample" and are never written over existing user data.
 */
export const SAMPLE_AS_OF = '2026-10-21'

export const profilePlaceholder = {
  initials: 'AL',
  displayName: 'Alex',
}

export const SAMPLE_COMMITMENTS = [
  {
    id: 'cmt-sample-laptop',
    source: 'sample',
    title: 'Laptop purchase',
    category: 'purchase',
    amount: 84990,
    currency: 'INR',
    commitmentDate: '2026-10-08',
    merchant: 'Aether Electronics',
    referenceId: 'AE-88421',
    channel: 'online',
    description: 'Return eligibility needs checking before the window closes.',
    importantDates: [
      {
        id: 'date-sample-laptop-return',
        type: 'return_deadline',
        date: '2026-10-22',
        note: 'Advertised 14-day return period.',
      },
      {
        id: 'date-sample-laptop-warranty',
        type: 'warranty_expiration',
        date: '2027-10-08',
        note: 'Manufacturer warranty on the device.',
      },
    ],
    financialExposure: {
      refundableAmount: 84990,
      depositAmount: null,
      expectedRefundAmount: null,
      potentialCharge: null,
      notes: 'Full purchase price may be lost if the return window closes.',
    },
    actions: [
      {
        id: 'act-sample-laptop-invoice',
        title: 'Keep the invoice',
        dueDate: null,
        completed: false,
      },
      {
        id: 'act-sample-laptop-return',
        title: 'Verify the return policy',
        dueDate: '2026-10-22',
        completed: false,
      },
    ],
    status: 'active',
    createdAt: '2026-10-08T10:00:00.000Z',
    updatedAt: '2026-10-08T10:00:00.000Z',
  },
  {
    id: 'cmt-sample-hotel',
    source: 'sample',
    title: 'Hotel booking',
    category: 'booking_travel',
    amount: 18600,
    currency: 'INR',
    commitmentDate: '2026-10-12',
    merchant: 'Harbour & Pine Inn',
    referenceId: 'HPI-1044',
    channel: 'online',
    description: 'Three-night stay with a free-cancellation deadline approaching.',
    importantDates: [
      {
        id: 'date-sample-hotel-cancel',
        type: 'cancellation_deadline',
        date: '2026-10-31',
        note: 'Free cancellation listed through this date.',
      },
    ],
    financialExposure: {
      refundableAmount: 18600,
      depositAmount: null,
      expectedRefundAmount: null,
      potentialCharge: 18600,
      notes: 'Missing the deadline may forfeit the booking amount.',
    },
    actions: [
      {
        id: 'act-sample-hotel-confirm',
        title: 'Save the booking confirmation',
        dueDate: null,
        completed: false,
      },
      {
        id: 'act-sample-hotel-cancel',
        title: 'Check cancellation conditions',
        dueDate: '2026-10-31',
        completed: false,
      },
    ],
    status: 'active',
    createdAt: '2026-10-12T09:30:00.000Z',
    updatedAt: '2026-10-12T09:30:00.000Z',
  },
  {
    id: 'cmt-sample-subscription',
    source: 'sample',
    title: 'Annual subscription',
    category: 'subscription_trial',
    amount: 9999,
    currency: 'INR',
    commitmentDate: '2025-11-05',
    merchant: 'Northline Pro',
    referenceId: 'NL-PRO-551',
    channel: 'online',
    description: 'Renewal date approaching for another billed year.',
    importantDates: [
      {
        id: 'date-sample-sub-renew',
        type: 'renewal_date',
        date: '2026-11-05',
        note: 'Plan renews unless cancelled.',
      },
    ],
    financialExposure: {
      refundableAmount: null,
      depositAmount: null,
      expectedRefundAmount: null,
      potentialCharge: 9999,
      notes: 'Another year will be billed at the current rate if unchanged.',
    },
    actions: [
      {
        id: 'act-sample-sub-decide',
        title: 'Decide whether to renew',
        dueDate: '2026-11-05',
        completed: false,
      },
    ],
    status: 'active',
    createdAt: '2025-11-05T08:00:00.000Z',
    updatedAt: '2025-11-05T08:00:00.000Z',
  },
]
