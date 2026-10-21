const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function todayIso(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseIsoDate(isoDate) {
  if (typeof isoDate !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

export function isValidIsoDate(isoDate) {
  return parseIsoDate(isoDate) !== null
}

export function formatDate(isoDate) {
  const date = parseIsoDate(isoDate)
  if (!date) return 'Unknown date'
  return dateFormatter.format(date)
}

export function formatDay(isoDate) {
  const date = parseIsoDate(isoDate)
  return date ? String(date.getDate()) : '—'
}

export function formatMonthShort(isoDate) {
  const date = parseIsoDate(isoDate)
  if (!date) return ''
  return new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(date)
}

export function formatMoney(amount, currency = 'INR') {
  const value = Number(amount)
  if (!Number.isFinite(value)) return '—'
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${currency} ${value}`
  }
}

export function daysUntil(isoDate, asOfIso) {
  const due = parseIsoDate(isoDate)
  const asOf = parseIsoDate(asOfIso)
  if (!due || !asOf) return null
  return Math.round((due.getTime() - asOf.getTime()) / 86_400_000)
}

export function relativeDueLabel(isoDate, asOfIso) {
  const days = daysUntil(isoDate, asOfIso)
  if (days === null) return ''
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days > 1) return `In ${days} days`
  if (days === -1) return '1 day overdue'
  return `${Math.abs(days)} days overdue`
}

export function compareIsoDates(a, b) {
  return a.localeCompare(b)
}
