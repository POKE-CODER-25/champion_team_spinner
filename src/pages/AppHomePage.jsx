import { LogOut, Trophy } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { MB_ROSTER, MB_ROSTER_COUNT, MB_ROSTER_ID } from '../data/mbRoster'
import { getAuthErrorMessage } from '../utils/authErrors'
import { validateRosterDataset } from '../utils/validateRoster'

const rosterValidation = validateRosterDataset(MB_ROSTER)
const uniqueRosterIds = new Set(MB_ROSTER.map(({ id }) => id)).size
const uniqueRosterTypes = new Set(MB_ROSTER.flatMap(({ types }) => types)).size
const validRosterIds = new Set(MB_ROSTER.map(({ id }) => id))

if (import.meta.env.DEV && !rosterValidation.valid) {
  console.error('Regulation M-B roster validation failed.', rosterValidation.errors)
}

export default function AppHomePage() {
  const navigate = useNavigate()
  const {
    user,
    logout,
    userProfile,
    profileLoading,
    profileError,
    refreshUserProfile,
  } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState('')
  const validOwnedCount = Array.isArray(userProfile?.ownedPokemonIds)
    ? new Set(userProfile.ownedPokemonIds.filter((id) => validRosterIds.has(id))).size
    : 0

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
          {profileError ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
              <h1 className="text-xl font-bold text-red-900">We could not load your saved team data.</h1>
              <p className="mt-2 text-sm leading-6 text-red-800">
                Check your connection and Firestore setup, then try again.
              </p>
              <button type="button" onClick={() => refreshUserProfile()} disabled={profileLoading}
                className="mt-4 rounded-lg bg-brand-yellow px-4 py-2 font-semibold text-navy-950 outline-none hover:bg-yellow-300 focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:opacity-60">
                {profileLoading ? 'Retrying…' : 'Retry'}
              </button>
            </div>
          ) : profileLoading || !userProfile ? (
            <div className="mt-3" role="status">
              <h1 className="text-2xl font-bold text-slate-950">Preparing your team workspace...</h1>
              <p className="mt-3 text-slate-600">Authentication is working while your saved data is checked.</p>
            </div>
          ) : (
            <>
              <h1 className="mt-2 text-2xl font-bold text-slate-950">Your account database is ready.</h1>
              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <StatusItem label="Authentication status" value="Signed in" />
                <StatusItem label="Signed-in email" value={user?.email ?? ''} />
                <StatusItem label="Firestore profile status" value="Ready" />
                <StatusItem label="Regulation" value={userProfile.regulationId} />
                <StatusItem label="Roster status" value={userProfile.rosterLocked ? 'Locked' : 'Not configured'} />
                <StatusItem label="Owned Pokémon" value={userProfile.ownedPokemonIds?.length ?? 0} />
                <StatusItem label="Cycle" value={userProfile.spinState?.cycleNumber ?? 1} />
                <StatusItem label="Total spins" value={userProfile.spinState?.totalSpins ?? 0} />
              </dl>
              <p className="mt-6 max-w-2xl leading-7 text-slate-600">
                Authentication is working. Your M-B roster setup will be added next.
              </p>
              <Link to="/roster"
                className="mt-5 inline-flex rounded-lg bg-brand-yellow px-4 py-2.5 font-semibold text-navy-950 outline-none hover:bg-yellow-300 focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2">
                {userProfile.rosterLocked ? 'View My Roster' : 'Set Up My Roster'}
              </Link>
              {userProfile.rosterLocked && validOwnedCount >= 6 ? (
                <button type="button" onClick={() => navigate('/spinner')}
                  className="ml-3 mt-5 inline-flex rounded-lg bg-brand-blue px-4 py-2.5 font-semibold text-white outline-none hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2">
                  Open Team Spinner
                </button>
              ) : (
                <p className="mt-4 text-sm font-medium text-amber-800">
                  Set up and lock at least 6 Pokémon to use the team spinner.
                </p>
              )}
              <section className="mt-6 rounded-xl border border-slate-200 bg-slate-100 p-4" aria-labelledby="dataset-heading">
                <h2 id="dataset-heading" className="font-bold text-slate-950">Dataset verification</h2>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <StatusItem label="Regulation" value={MB_ROSTER_ID} />
                  <StatusItem label="Dataset status" value={rosterValidation.valid ? 'Valid' : 'Invalid'} />
                  <StatusItem label="Total roster entries" value={MB_ROSTER_COUNT} />
                  <StatusItem label="Unique IDs" value={uniqueRosterIds} />
                  <StatusItem label="Unique Pokémon types" value={uniqueRosterTypes} />
                </dl>
              </section>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

function StatusItem({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-slate-900">{value}</dd>
    </div>
  )
}
