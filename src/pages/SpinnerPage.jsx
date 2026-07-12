import { ArrowLeft, LogOut, RefreshCcw, Trophy } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import StatusDialog from '../components/StatusDialog'
import TeamPokemonCard from '../components/TeamPokemonCard'
import { useAuth } from '../context/useAuth'
import { MB_ROSTER, MB_ROSTER_ID } from '../data/mbRoster'
import { resetSpinCycle, spinRandomTeam } from '../services/spinnerService'
import { getAuthErrorMessage } from '../utils/authErrors'
import { normalizeSpinState } from '../utils/spinState'

const pokemonById = new Map(MB_ROSTER.map((pokemon) => [pokemon.id, pokemon]))
const validRosterIds = new Set(pokemonById.keys())

function getValidOwnedIds(profile) {
  if (!Array.isArray(profile?.ownedPokemonIds)) return []
  const saved = new Set(profile.ownedPokemonIds)
  return MB_ROSTER.filter(({ id }) => saved.has(id)).map(({ id }) => id)
}

function createSpinView(spinState, ownedPokemonIds) {
  const normalized = normalizeSpinState(spinState, ownedPokemonIds)
  return {
    teamIds: normalized.currentTeamIds.length === 6 ? normalized.currentTeamIds : [],
    usedCount: normalized.usedPokemonIds.length,
    remainingCount: normalized.unusedPokemonIds.length,
    cycleNumber: normalized.cycleNumber,
    totalSpins: normalized.totalSpins,
  }
}

export default function SpinnerPage() {
  const {
    user,
    logout,
    userProfile,
    profileLoading,
    profileError,
    refreshUserProfile,
  } = useAuth()
  const ownedPokemonIds = useMemo(() => getValidOwnedIds(userProfile), [userProfile])
  const normalizedProfileState = useMemo(
    () => createSpinView(userProfile?.spinState, ownedPokemonIds),
    [userProfile?.spinState, ownedPokemonIds],
  )
  const [spinView, setSpinView] = useState(normalizedProfileState)
  const [spinning, setSpinning] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [rolloverMessage, setRolloverMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const submittingRef = useRef(false)

  useEffect(() => {
    setSpinView(normalizedProfileState)
  }, [normalizedProfileState])

  useEffect(() => {
    if (!import.meta.env.DEV || !Array.isArray(userProfile?.ownedPokemonIds)) return
    const unknownIds = [...new Set(userProfile.ownedPokemonIds)]
      .filter((id) => !validRosterIds.has(id))
    if (unknownIds.length > 0) {
      console.warn('Ignoring unknown Pokémon IDs on the spinner page.', unknownIds)
    }
  }, [userProfile])

  const closeResetDialog = useCallback(() => {
    if (!resetting) setShowResetDialog(false)
  }, [resetting])
  const closeRolloverDialog = useCallback(() => setRolloverMessage(''), [])

  const rosterReady = Boolean(
    userProfile?.rosterLocked &&
    userProfile?.regulationId === MB_ROSTER_ID &&
    ownedPokemonIds.length >= 6,
  )
  const currentTeam = spinView.teamIds.map((id) => pokemonById.get(id)).filter(Boolean)

  async function handleSpin() {
    if (submittingRef.current || !rosterReady || !user?.uid) return
    submittingRef.current = true
    setSpinning(true)
    setError('')
    setStatusMessage('')

    try {
      const result = await spinRandomTeam(user.uid)
      setSpinView({
        teamIds: result.teamIds,
        usedCount: result.usedCount,
        remainingCount: result.remainingCount,
        cycleNumber: result.cycleNumber,
        totalSpins: result.totalSpins,
      })
      if (result.rollover) setRolloverMessage(result.rolloverMessage)
      void refreshUserProfile(user)
    } catch (spinError) {
      console.error('Unable to generate a random team.', {
        code: spinError?.code ?? 'unknown',
        message: spinError?.message ?? 'Unknown spinner error',
      })
      setError('We could not generate your team. Please try again.')
    } finally {
      submittingRef.current = false
      setSpinning(false)
    }
  }

  async function handleReset() {
    if (submittingRef.current || !rosterReady || !user?.uid) return
    submittingRef.current = true
    setResetting(true)
    setError('')
    setStatusMessage('')

    try {
      await resetSpinCycle(user.uid)
      setSpinView({
        teamIds: [],
        usedCount: 0,
        remainingCount: ownedPokemonIds.length,
        cycleNumber: 1,
        totalSpins: 0,
      })
      setShowResetDialog(false)
      setStatusMessage('Your spin cycle has been reset.')
      void refreshUserProfile(user)
    } catch (resetError) {
      console.error('Unable to reset the spin cycle.', {
        code: resetError?.code ?? 'unknown',
        message: resetError?.message ?? 'Unknown spin reset error',
      })
      setError('We could not reset your spin cycle. Please try again.')
    } finally {
      submittingRef.current = false
      setResetting(false)
    }
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    setError('')
    try {
      await logout()
    } catch (logoutError) {
      setError(getAuthErrorMessage(logoutError))
      setLoggingOut(false)
    }
  }

  if (profileLoading && !userProfile) return <SpinnerStatus message="Loading your team spinner..." />

  if (profileError || !userProfile) {
    return (
      <SpinnerStatus message="We could not load your saved team data.">
        <button type="button" onClick={() => refreshUserProfile()} disabled={profileLoading}
          className="mt-4 rounded-lg bg-brand-yellow px-4 py-2 font-semibold text-navy-950 outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-60">
          Retry
        </button>
      </SpinnerStatus>
    )
  }

  if (!rosterReady) {
    return (
      <SpinnerStatus message="Set up and lock at least 6 Pokémon before using the spinner.">
        <div className="mt-5 flex justify-center gap-3">
          <Link to="/roster"
            className="rounded-lg bg-brand-yellow px-4 py-2 font-semibold text-navy-950 outline-none focus-visible:ring-2 focus-visible:ring-brand-blue">
            Set Up My Roster
          </Link>
          <Link to="/app"
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-brand-blue">
            Back to Account
          </Link>
        </div>
      </SpinnerStatus>
    )
  }

  return (
    <div className="min-h-screen bg-navy-950">
      <header className="border-b border-slate-700 bg-navy-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Trophy className="size-6 text-brand-yellow" aria-hidden="true" />
            <span className="font-bold">Champion Team Spinner</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="min-w-0 truncate text-sm text-slate-300">{user?.email}</span>
            <button type="button" onClick={handleLogout} disabled={loggingOut || spinning || resetting}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-500 px-3 py-2 text-sm font-medium outline-none hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-brand-yellow disabled:opacity-60">
              <LogOut className="size-4" aria-hidden="true" />
              {loggingOut ? 'Signing out...' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link to="/app"
          className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-white outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-yellow">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Account
        </Link>

        <section className="mt-5 rounded-2xl bg-slate-50 p-5 shadow-lg sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-blue">Regulation: {MB_ROSTER_ID}</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Champion Team Spinner</h1>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <SpinnerMetric label="Owned" value={ownedPokemonIds.length} />
            <SpinnerMetric label="Used this cycle" value={spinView.usedCount} />
            <SpinnerMetric label="Remaining this cycle" value={spinView.remainingCount} />
            <SpinnerMetric label="Cycle" value={spinView.cycleNumber} />
            <SpinnerMetric label="Total spins" value={spinView.totalSpins} />
          </dl>

          {error && <Notice tone="error">{error}</Notice>}
          {statusMessage && <Notice tone="success">{statusMessage}</Notice>}

          <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6" aria-live="polite">
            {currentTeam.length === 6
              ? currentTeam.map((pokemon, index) => (
                <TeamPokemonCard key={pokemon.id} pokemon={pokemon} position={index + 1} />
              ))
              : Array.from({ length: 6 }, (_, index) => (
                <div key={index}
                  className="flex aspect-[3/4] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 text-center text-sm font-medium text-slate-500">
                  <span>Position {index + 1}<br />No team generated</span>
                </div>
              ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-3 border-t border-slate-200 pt-5">
            <button type="button" onClick={handleSpin} disabled={spinning || resetting}
              className="rounded-lg bg-brand-yellow px-5 py-2.5 font-semibold text-navy-950 outline-none hover:bg-yellow-300 focus-visible:ring-2 focus-visible:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-60">
              {spinning ? 'Building your team...' : currentTeam.length === 6 ? 'Spin Again' : 'Spin Random Team'}
            </button>
            <Link to="/roster"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-blue">
              Edit My Roster
            </Link>
            <button type="button" onClick={() => setShowResetDialog(true)} disabled={spinning || resetting}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-60">
              <RefreshCcw className="size-4" aria-hidden="true" />
              Reset Spin Cycle
            </button>
          </div>
        </section>
      </main>

      <StatusDialog open={showResetDialog} title="Reset current cycle?"
        message="This will allow every owned Pokémon to be selected again. Your owned roster will not change."
        actionLabel="Reset Cycle" busy={resetting} onAction={handleReset} onClose={closeResetDialog} />
      <StatusDialog open={Boolean(rolloverMessage)} title="A new cycle has started"
        message={rolloverMessage} actionLabel="Continue" onClose={closeRolloverDialog} />
    </div>
  )
}

function SpinnerMetric({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-xl font-bold text-slate-950">{value}</dd>
    </div>
  )
}

function Notice({ tone, children }) {
  const classes = tone === 'success'
    ? 'border-green-200 bg-green-50 text-green-800'
    : 'border-red-200 bg-red-50 text-red-800'
  return <p className={`mt-5 rounded-lg border p-3 text-sm ${classes}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</p>
}

function SpinnerStatus({ message, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-950 p-6">
      <section className="w-full max-w-lg rounded-2xl bg-white p-6 text-center shadow-xl">
        <p className="font-semibold text-slate-900">{message}</p>
        {children}
      </section>
    </main>
  )
}
