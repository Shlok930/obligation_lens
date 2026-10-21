import { CheckCircle2, CircleAlert, X } from 'lucide-react'

export function FlashBanner({ flash, onDismiss }) {
  if (!flash) return null
  const success = flash.type === 'success'
  return (
    <div
      role="status"
      className={`mx-4 mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 sm:mx-6 lg:mx-8 ${
        success
          ? 'border-calm/20 bg-calm-soft text-calm'
          : 'border-warn/20 bg-warn-soft text-warn'
      }`}
    >
      {success ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      ) : (
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <p className="flex-1 text-sm leading-relaxed">{flash.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg p-1 hover:bg-raised/60"
        aria-label="Dismiss message"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
