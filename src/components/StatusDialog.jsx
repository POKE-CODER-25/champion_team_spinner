import { useEffect, useRef } from 'react'

export default function StatusDialog({
  open,
  title,
  message,
  actionLabel,
  busy = false,
  onAction,
  onClose,
}) {
  const primaryButton = useRef(null)
  const previousFocus = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    previousFocus.current = document.activeElement
    primaryButton.current?.focus()
    return () => previousFocus.current?.focus?.()
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, busy, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="status-dialog-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <h2 id="status-dialog-title" className="text-xl font-bold text-slate-950">{title}</h2>
        <p className="mt-3 leading-6 text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          {onAction && (
            <button type="button" onClick={onClose} disabled={busy}
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-60">
              Cancel
            </button>
          )}
          <button ref={primaryButton} type="button" onClick={onAction ?? onClose} disabled={busy}
            className="rounded-lg bg-brand-yellow px-4 py-2 font-semibold text-navy-950 outline-none hover:bg-yellow-300 focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-60">
            {busy ? 'Resetting...' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
