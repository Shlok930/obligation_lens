import { useEffect, useId, useRef } from 'react'
import { Button } from './Button.jsx'

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const node = dialogRef.current
    if (!node) return
    if (open && !node.open) node.showModal()
    if (!open && node.open) node.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-line bg-raised p-0 shadow-lg backdrop:bg-ink/30"
      onClose={onCancel}
      aria-labelledby={titleId}
    >
      <form method="dialog" className="p-6" onSubmit={(event) => event.preventDefault()}>
        <h2 id={titleId} className="text-lg font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
