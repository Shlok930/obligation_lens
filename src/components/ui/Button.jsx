const variants = {
  primary:
    'bg-accent text-white hover:bg-accent/90 shadow-[0_1px_2px_rgba(28,25,23,0.12)]',
  secondary:
    'bg-raised text-ink border border-line hover:bg-surface',
  ghost: 'text-ink hover:bg-accent-soft',
  danger: 'bg-warn text-white hover:bg-warn/90',
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
