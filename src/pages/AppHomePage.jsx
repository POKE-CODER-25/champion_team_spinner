import { LogOut, Trophy } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { getAuthErrorMessage } from '../utils/authErrors'

export default function AppHomePage() {
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState('')

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    setError('')
    try {
      await logout()
    } catch (authError) {
      setError(getAuthErrorMessage(authError))
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-950">
      <header className="border-b border-slate-700 bg-navy-900 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Trophy className="size-6 text-brand-yellow" aria-hidden="true" />
            <span className="font-bold">Champion Team Spinner</span>
          </div>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <span className="min-w-0 truncate text-sm text-slate-300">{user?.email}</span>
            <button onClick={handleLogout} disabled={loggingOut}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-500 px-3 py-2 text-sm font-medium outline-none hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-brand-yellow disabled:opacity-60">
              <LogOut className="size-4" aria-hidden="true" />
              {loggingOut ? 'Signing out…' : 'Logout'}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-red-800" role="alert">{error}</p>}
        <section className="rounded-2xl bg-slate-50 p-6 shadow-lg sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-blue">Welcome</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Your team workspace is ready.</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">Authentication is working. Your M-B roster setup will be added next.</p>
        </section>
      </main>
    </div>
  )
}
