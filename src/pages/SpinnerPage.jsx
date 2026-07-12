import { ArrowLeft, CircleDot, Copy, LoaderCircle, LogOut, RefreshCcw, Trophy } from 'lucide-react'
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
  const [rolloverNotice, setRolloverNotice] = useState(null)
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
  const closeRolloverDialog = useCallback(() => setRolloverNotice(null), [])

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
      if (result.rollover) {
        setRolloverNotice(result.rolloverType === 'partial'
          ? {
            title: 'New cycle started',
            message: `Every Pokémon from the previous cycle has now been used. This team includes the final unused Pokémon and new picks from Cycle ${result.cycleNumber}.`,
          }
          : {
            title: `Cycle ${result.cycleNumber} started`,
            message: 'You used every Pokémon in the previous cycle. All owned Pokémon are available again.',
          })
      }
      setStatusMessage('Your team is ready.')
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

  async function handleCopyTeam() {
    setError('')
    setStatusMessage('')
    try {
      await navigator.clipboard.writeText(currentTeam.map(({ name }) => name).join(', '))
      setStatusMessage('Team names copied.')
    } catch (copyError) {
      if (import.meta.env.DEV) console.warn('Unable to copy team names.', copyError)
      setError('We could not copy the team names.')
    }
  }

  useEffect(() => {
    if (!statusMessage) return undefined
    const timeout = window.setTimeout(() => setStatusMessage(''), 4000)
    return () => window.clearTimeout(timeout)
  }, [statusMessage])

  const spinShortcutRef = useRef(handleSpin)
  spinShortcutRef.current = handleSpin

  useEffect(() => {
    const handleShortcut = (event) => {
      const target = event.target
      const isTyping = target instanceof HTMLElement &&
        (target.matches('input, textarea, select') || target.isContentEditable)
      if (
        event.key.toLowerCase() !== 's' ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isTyping ||
        spinning ||
        resetting ||
        showResetDialog ||
        rolloverNotice ||
        !rosterReady ||
        window.location.pathname !== '/spinner'
      ) return
      event.preventDefault()
      void spinShortcutRef.current()
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [spinning, resetting, showResetDialog, rolloverNotice, rosterReady])

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
          <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Champion Team Spinner</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Generate six unique Pokémon without repeats until your entire owned roster has been used.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
            <SpinnerMetric label="Owned" value={ownedPokemonIds.length} />
            <SpinnerMetric label="Used this cycle" value={spinView.usedCount} />
            <SpinnerMetric label="Remaining this cycle" value={spinView.remainingCount} />
            <SpinnerMetric label="Cycle" value={spinView.cycleNumber} />
            <SpinnerMetric label="Total spins" value={spinView.totalSpins} />
          </dl>

          {error && <Notice tone="error">{error}</Notice>}
          {statusMessage && <Notice tone="success">{statusMessage}</Notice>}

          <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6" aria-live="polite" aria-busy={spinning}>
            {currentTeam.length === 6
              ? currentTeam.map((pokemon, index) => (
                <TeamPokemonCard key={pokemon.id} pokemon={pokemon} position={index + 1} />
              ))
              : Array.from({ length: 6 }, (_, index) => (
                <div key={index}
                  className="flex min-h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 text-center text-sm font-medium text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wide">Slot {index + 1}</span>
                  <CircleDot className="my-4 size-10 text-slate-300" aria-hidden="true" />
                  <span>No Pokémon yet</span>
                </div>
              ))}
          </div>

          <div className="mt-7 border-t border-slate-200 pt-5">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={handleSpin} disabled={spinning || resetting}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-yellow px-5 py-2.5 font-semibold text-navy-950 outline-none hover:bg-yellow-300 focus-visible:ring-2 focus-visible:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-60">
                {spinning && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                {spinning ? 'Building your team...' : currentTeam.length === 6 ? 'Spin Again' : 'Spin Random Team'}
              </button>
              {currentTeam.length === 6 && (
                <button type="button" onClick={handleCopyTeam} disabled={spinning || resetting}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-60">
                  <Copy className="size-4" aria-hidden="true" />
                  Copy Team Names
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">Tip: press S to spin</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/roster"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-blue">
                Edit My Roster
              </Link>
              <button type="button" onClick={() => setShowResetDialog(true)} disabled={spinning || resetting}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 font-semibold text-amber-900 outline-none hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-60">
                <RefreshCcw className="size-4" aria-hidden="true" />
                Reset Spin Cycle
              </button>
              <Link to="/app"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-blue">
                Back to Account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <StatusDialog open={showResetDialog} title="Reset spin progress?"
        message="This will clear the current team and allow every owned Pokémon to be selected again. Your saved roster will not change."
        actionLabel="Reset Progress" busy={resetting} onAction={handleReset} onClose={closeResetDialog} />
      <StatusDialog open={Boolean(rolloverNotice)} title={rolloverNotice?.title}
        message={rolloverNotice?.message} actionLabel="Continue" onClose={closeRolloverDialog} />
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
  return <p className={`mt-5 rounded-lg border p-3 text-sm ${classes}`} role={tone === 'error' ? 'alert' : 'status'} aria-live="polite">{children}</p>
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
