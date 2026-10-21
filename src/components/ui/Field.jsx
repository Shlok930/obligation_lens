import { Children, cloneElement, isValidElement } from 'react'

export function Field({
  id,
  label,
  required = false,
  hint,
  error,
  warning,
  children,
}) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const warningId = warning ? `${id}-warning` : undefined
  const describedBy = [errorId, warningId, hintId].filter(Boolean).join(' ') || undefined
  const control = isValidElement(children)
    ? cloneElement(Children.only(children), {
        id,
        invalid: Boolean(error),
        describedBy,
      })
    : children

  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
          {required ? (
            <span className="text-warn" aria-hidden="true">
              {' '}
              *
            </span>
          ) : null}
          {required ? <span className="sr-only"> required</span> : null}
        </label>
      ) : null}
      {control}
      {hint && !error ? (
        <p id={hintId} className="text-xs leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}
      {warning && !error ? (
        <p id={warningId} className="text-xs leading-relaxed text-warn" role="status">
          {warning}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs leading-relaxed text-warn" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-line bg-raised px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 transition-colors disabled:bg-surface'

export function TextInput({ id, invalid, describedBy, className = '', ...props }) {
  return (
    <input
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={`${inputClass} ${invalid ? 'border-warn' : ''} ${className}`}
      {...props}
    />
  )
}

export function SelectInput({ id, invalid, describedBy, children, className = '', ...props }) {
  return (
    <select
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={`${inputClass} ${invalid ? 'border-warn' : ''} ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

export function TextArea({ id, invalid, describedBy, className = '', ...props }) {
  return (
    <textarea
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={`${inputClass} min-h-24 resize-y ${invalid ? 'border-warn' : ''} ${className}`}
      {...props}
    />
  )
}
