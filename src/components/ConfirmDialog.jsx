import { useEffect, useRef } from 'react'

export default function ConfirmDialog({ open, busy, onConfirm, onCancel }) {
  const confirmButton = useRef(null)
  const previousFocus = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    previousFocus.current = document.activeElement
    confirmButton.current?.focus()
    return () => previousFocus.current?.focus?.()
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, busy, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="confirm-title" className="text-xl font-bold text-slate-950">Reset current spin cycle?</h2>
        <p className="mt-3 leading-6 text-slate-600">
          Changing your roster will reset your current spin cycle. Continue?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy}
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-60">
            Cancel
          </button>
          <button ref={confirmButton} type="button" onClick={onConfirm} disabled={busy}
            className="rounded-lg bg-brand-yellow px-4 py-2 font-semibold text-navy-950 outline-none hover:bg-yellow-300 focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-60">
            {busy ? 'Saving roster...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
