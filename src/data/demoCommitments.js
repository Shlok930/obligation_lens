import { offsetDate } from '../utils/obligationEngine.js'
import { todayIso } from '../utils/format.js'

export const DEMO_COMMITMENT_IDS = [
  'demo-laptop-purchase', 'demo-smartphone-purchase', 'demo-domain-renewal', 'demo-online-course', 'demo-electricity-bill',
  'demo-flight-booking', 'demo-gym-membership', 'demo-headphones-purchase', 'demo-internet-plan', 'demo-college-fee',
]

export function createDemoData(today = todayIso()) {
  const date = (days) => offsetDate(today, days)
  const timestamp = new Date(`${today}T12:00:00`).toISOString()
  const makeActions = (prefix, actions) => actions.map(([slug, title, dueOffset, completed]) => ({ id: `${prefix}-${slug}`, title, dueDate: dueOffset === null ? null : date(dueOffset), note: '', completed }))
  const makeDates = (prefix, dates) => dates.map(([slug, type, offset, note]) => ({ id: `${prefix}-${slug}`, type, date: date(offset), note, resolved: false }))
  const make = ({ id, title, category, merchant, amount, offset, ref, description, actions, importantDates = [], status = 'active', channel = 'online' }) => ({
    id: `demo-${id}`, title, category, amount, currency: 'INR', commitmentDate: date(offset), merchant, referenceId: ref, channel, description,
    actions: makeActions(`demo-${id}`, actions), importantDates: makeDates(`demo-${id}`, importantDates), documentEvidence: [],
    financialExposure: { refundableAmount: null, depositAmount: null, expectedRefundAmount: null, potentialCharge: null, notes: '' },
    status, source: 'sample', createdAt: timestamp, updatedAt: timestamp,
  })
  const commitments = [
    make({ id: 'laptop-purchase', title: 'Laptop Purchase', category: 'purchase', merchant: 'TechWorld Electronics', amount: 65000, offset: -90, ref: 'DEMO-LAP-001', description: 'Laptop purchased for college and development work. Fictional demonstration record.', actions: [['save-invoice', 'Save invoice', -89, true], ['register-warranty', 'Register warranty', -75, false], ['verify-warranty', 'Verify warranty confirmation', null, false]], importantDates: [['warranty-registration', 'custom', -75, 'Synthetic sample: warranty registration deadline, 15 days after purchase.'], ['return-window', 'return_deadline', -83, 'Synthetic sample: return window ends 7 days after purchase.']] }),
    make({ id: 'smartphone-purchase', title: 'Smartphone Purchase', category: 'purchase', merchant: 'Mobile Hub', amount: 22999, offset: -20, ref: 'DEMO-PHN-002', description: 'Smartphone purchased for daily personal use. Fictional demonstration record.', actions: [['save-invoice', 'Save invoice', -19, true], ['check-warranty', 'Check warranty details', -18, true]], importantDates: [['return-window', 'return_deadline', -10, 'Synthetic sample return-window end.'], ['warranty-expiry', 'warranty_expiration', 345, 'Synthetic one-year warranty expiry from purchase.']], status: 'completed' }),
    make({ id: 'domain-renewal', title: 'Annual Domain Renewal', category: 'subscription_trial', merchant: 'Example Domains', amount: 899, offset: 45, ref: 'DEMO-DOM-003', description: 'Annual domain renewal reminder. Automatic renewal is not established by this sample.', actions: [['verify-price', 'Verify renewal price', 45, false], ['decide-renewal', 'Decide whether to renew', 45, false]], importantDates: [['renewal-date', 'renewal_date', 45, 'Recorded demo renewal date; automatic renewal is not assumed.']] }),
    make({ id: 'online-course', title: 'Online Course', category: 'other', merchant: 'LearnNow Academy', amount: 4999, offset: -14, ref: 'DEMO-EDU-004', description: 'Course purchased; retrieve the certificate if eligible. Fictional demonstration record.', actions: [['download-certificate', 'Download course certificate', null, false], ['verify-completion', 'Verify course completion', null, false]], importantDates: [['access-review', 'custom', 16, 'Synthetic course access review date, 30 days after purchase.']] }),
    make({ id: 'electricity-bill', title: 'Electricity Bill', category: 'other', merchant: 'Demo Electricity Provider', amount: 1450, offset: -5, ref: 'DEMO-UTL-005', description: 'Monthly electricity bill awaiting payment in this fictional sample.', actions: [['pay-bill', 'Pay bill', -5, false], ['save-receipt', 'Save payment receipt', null, false]], importantDates: [['payment-due', 'custom', -5, 'Synthetic payment due date. A due date does not establish payment.']], channel: 'other' }),
    make({ id: 'flight-booking', title: 'Flight Booking', category: 'booking_travel', merchant: 'Demo Travel Agency', amount: 7200, offset: 21, ref: 'DEMO-TRV-006', description: 'Upcoming domestic flight. All details are fictional demo data.', actions: [['verify-passenger', 'Verify passenger details', 19, true], ['online-check-in', 'Complete online check-in', 19, false]], importantDates: [['departure', 'custom', 21, 'Synthetic departure date.'], ['check-in-reminder', 'custom', 19, 'Synthetic check-in reminder, two days before departure.']] }),
    make({ id: 'gym-membership', title: 'Gym Membership', category: 'other', merchant: 'FitLife Gym', amount: 6000, offset: -60, ref: 'DEMO-GYM-007', description: 'Six-month gym membership. No exact expiry date or cancellation terms are asserted.', actions: [['review-usage', 'Review membership usage', null, true], ['decide-renewal', 'Decide whether to renew', null, false]], channel: 'offline' }),
    make({ id: 'headphones-purchase', title: 'Headphones Purchase', category: 'purchase', merchant: 'Audio Store', amount: 3499, offset: -12, ref: 'DEMO-AUD-008', description: 'Wireless headphones purchased online. Fictional demonstration record.', actions: [['save-invoice', 'Save invoice', -11, true], ['check-condition', 'Check product condition', -10, true]], importantDates: [['return-window', 'return_deadline', -5, 'Synthetic sample return-window end.'], ['warranty-expiry', 'warranty_expiration', 353, 'Synthetic one-year warranty expiry from purchase.']], status: 'completed' }),
    make({ id: 'internet-plan', title: 'Internet Plan', category: 'other', merchant: 'Demo Broadband Provider', amount: 999, offset: 3, ref: 'DEMO-NET-009', description: 'Monthly broadband plan. Automatic payment is not assumed.', actions: [['check-charge', 'Check upcoming plan charge', 3, false], ['verify-payment', 'Verify payment status', null, false]], importantDates: [['renewal-date', 'renewal_date', 3, 'Synthetic renewal date; automatic payment is not established.']], channel: 'other' }),
    make({ id: 'college-fee', title: 'College Fee Installment', category: 'other', merchant: 'Demo College Accounts', amount: 18000, offset: 10, ref: 'DEMO-COL-010', description: 'Upcoming college fee installment. Fictional demonstration record.', actions: [['verify-amount', 'Verify amount due', 10, true], ['pay-installment', 'Pay installment', 10, false], ['save-receipt', 'Save receipt', null, false]], importantDates: [['installment-due', 'custom', 10, 'Synthetic fee installment due date.']] }),
  ]
  const relationships = [
    relation('laptop-invoice-to-registration', 'demo-laptop-purchase-save-invoice', 'demo-laptop-purchase-register-warranty'),
    relation('laptop-registration-to-verification', 'demo-laptop-purchase-register-warranty', 'demo-laptop-purchase-verify-warranty'),
    relation('electricity-payment-to-receipt', 'demo-electricity-bill-pay-bill', 'demo-electricity-bill-save-receipt'),
    relation('flight-verification-to-checkin', 'demo-flight-booking-verify-passenger', 'demo-flight-booking-online-check-in'),
    relation('college-verification-to-payment', 'demo-college-fee-verify-amount', 'demo-college-fee-pay-installment'),
    relation('college-payment-to-receipt', 'demo-college-fee-pay-installment', 'demo-college-fee-save-receipt'),
    relation('domain-price-to-decision', 'demo-domain-renewal-verify-price', 'demo-domain-renewal-decide-renewal'),
    relation('internet-check-to-verification', 'demo-internet-plan-check-charge', 'demo-internet-plan-verify-payment'),
  ]
  return { commitments, relationships, documentSample: createDemoDocumentSample(date(-90)) }
}

export function createDemoDocumentSample(purchaseDate = offsetDate(todayIso(), -90)) {
  return {
    type: 'purchase',
    title: 'DEMO DOCUMENT — synthetic laptop terms (not a real invoice or warranty)',
    text: `DEMO DOCUMENT — NOT A REAL INVOICE OR WARRANTY. Laptop purchased on ${purchaseDate} for INR 65000. The fictional sample return period is 7 days from purchase. The fictional sample warranty registration period is 15 days from purchase. These terms are included only for testing extraction.`,
  }
}

function relation(id, prerequisiteId, dependentId) {
  return { id: `demo-${id}`, prerequisite: { type: 'action', id: prerequisiteId }, dependent: { type: 'action', id: dependentId }, createdAt: new Date().toISOString() }
}
