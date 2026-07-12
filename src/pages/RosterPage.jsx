import { ArrowLeft, LogOut, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import PokemonCard from '../components/PokemonCard'
import { useAuth } from '../context/useAuth'
import { MB_ROSTER, MB_ROSTER_COUNT, MB_ROSTER_ID } from '../data/mbRoster'
import { saveOwnedPokemonRoster } from '../services/userService'
import { getAuthErrorMessage } from '../utils/authErrors'

const validRosterIds = new Set(MB_ROSTER.map(({ id }) => id))
const allRosterIds = MB_ROSTER.map(({ id }) => id)
const rosterTypes = [...new Set(MB_ROSTER.flatMap(({ types }) => types))].sort()

function getValidSavedIds(profile) {
  if (!Array.isArray(profile?.ownedPokemonIds)) return []
  return [...new Set(profile.ownedPokemonIds)].filter((id) => validRosterIds.has(id))
}

export default function RosterPage() {
  const {
    user,
    logout,
    userProfile,
    profileLoading,
    profileError,
    refreshUserProfile,
  } = useAuth()
  const savedIds = useMemo(() => getValidSavedIds(userProfile), [userProfile])
  const savedIdsKey = savedIds.join('|')
  const [selectedIds, setSelectedIds] = useState(() => new Set(savedIds))
  const [editing, setEditing] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [saving, setSaving] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    setSelectedIds(new Set(savedIdsKey ? savedIdsKey.split('|') : []))
    setEditing(false)
  }, [savedIdsKey])

  useEffect(() => {
    if (!import.meta.env.DEV || !Array.isArray(userProfile?.ownedPokemonIds)) return
    const invalidIds = userProfile.ownedPokemonIds.filter((id) => !validRosterIds.has(id))
    if (invalidIds.length > 0) {
      console.warn('Ignoring unknown Pokémon IDs in the saved roster.', invalidIds)
    }
  }, [userProfile])

  const lockedMode = Boolean(userProfile?.rosterLocked) && !editing
  const normalizedSearch = search.trim().toLowerCase()
  const visiblePokemon = useMemo(() => {
    const source = lockedMode
      ? MB_ROSTER.filter(({ id }) => savedIds.includes(id))
      : MB_ROSTER

    return source.filter((pokemon) => {
      const matchesSearch = !normalizedSearch || pokemon.name.toLowerCase().includes(normalizedSearch)
      const matchesType = !selectedType || pokemon.types.includes(selectedType)
      return matchesSearch && matchesType
    })
  }, [lockedMode, normalizedSearch, savedIds, selectedType])

  const ownedCount = lockedMode ? savedIds.length : selectedIds.size
  const canSave = selectedIds.size >= 6 && !saving

  function togglePokemon(id) {
    if (lockedMode || saving) return
    setMessage('')
    setSaveError('')
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function beginEditing() {
    setSelectedIds(new Set(savedIds))
    setEditing(true)
    setMessage('')
    setSaveError('')
  }

  function cancelEditing() {
    setSelectedIds(new Set(savedIds))
    setEditing(false)
    setShowConfirmation(false)
    setSaveError('')
  }

  function requestSave() {
    if (!canSave) return
    if (userProfile?.rosterLocked && editing) {
      setShowConfirmation(true)
      return
    }
    void saveRoster()
  }

  async function saveRoster() {
    if (saving || selectedIds.size < 6 || !user?.uid) return
    setSaving(true)
    setShowConfirmation(false)
    setSaveError('')
    setMessage('')

    try {
      const saved = await saveOwnedPokemonRoster(user.uid, [...selectedIds])
      setSelectedIds(new Set(saved))
      setEditing(false)
      const refreshed = await refreshUserProfile(user)
      if (refreshed) setMessage('Your M-B roster has been saved.')
    } catch (error) {
      console.error('Unable to save the owned Pokémon roster.', {
        code: error?.code ?? 'unknown',
        message: error?.message ?? 'Unknown roster save error',
      })
      setSaveError('We could not save your roster. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    setLogoutError('')
    try {
      await logout()
    } catch (error) {
      setLogoutError(getAuthErrorMessage(error))
      setLoggingOut(false)
    }
  }

  if (profileLoading) return <RosterStatus message="Loading your saved roster..." />

  if (profileError || !userProfile) {
    return (
      <RosterStatus message="We could not load your saved roster.">
        <button type="button" onClick={() => refreshUserProfile()} disabled={profileLoading}
          className="mt-4 rounded-lg bg-brand-yellow px-4 py-2 font-semibold text-navy-950 outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-60">
          Retry
        </button>
      </RosterStatus>
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
            <button type="button" onClick={handleLogout} disabled={loggingOut}
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
          Back to account
        </Link>

        <section className="mt-5 rounded-2xl bg-slate-50 p-5 shadow-lg sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-blue">Regulation: {MB_ROSTER_ID}</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950">My M-B Pokémon</h1>
              <p className="mt-2 text-sm text-slate-600">
                {lockedMode ? 'Review the Pokémon in your saved roster.' : 'Choose every Pokémon you currently own.'}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-center text-sm">
              <RosterMetric label="Owned" value={ownedCount} />
              <RosterMetric label="M-B total" value={MB_ROSTER_COUNT} />
              <RosterMetric label="Visible" value={visiblePokemon.length} />
            </dl>
          </div>

          {logoutError && <Notice tone="error">{logoutError}</Notice>}
          {saveError && <Notice tone="error">{saveError}</Notice>}
          {message && <Notice tone="success">{message}</Notice>}

          <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <div>
              <label htmlFor="roster-search" className="mb-1.5 block text-sm font-medium text-slate-800">Search Pokémon</label>
              <input id="roster-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-brand-blue focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label htmlFor="type-filter" className="mb-1.5 block text-sm font-medium text-slate-800">Type</label>
              <select id="type-filter" value={selectedType} onChange={(event) => setSelectedType(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-brand-blue focus:ring-2 focus:ring-blue-200">
                <option value="">All Types</option>
                {rosterTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
          </div>

          {!lockedMode && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => setSelectedIds(new Set(allRosterIds))} disabled={saving}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-60">
                Select All
              </button>
              <button type="button" onClick={() => setSelectedIds(new Set())} disabled={saving}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-60">
                Clear All
              </button>
            </div>
          )}

          {visiblePokemon.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {visiblePokemon.map((pokemon) => (
                <PokemonCard key={pokemon.id} pokemon={pokemon} selected={selectedIds.has(pokemon.id)}
                  editable={!lockedMode} disabled={saving} onToggle={togglePokemon} />
              ))}
            </div>
          ) : (
            <p className="mt-8 rounded-lg bg-slate-100 p-6 text-center text-slate-600">
              No Pokémon match your search and filter.
            </p>
          )}

          <div className="mt-7 border-t border-slate-200 pt-5">
            {lockedMode ? (
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={beginEditing}
                  className="rounded-lg bg-brand-yellow px-4 py-2.5 font-semibold text-navy-950 outline-none hover:bg-yellow-300 focus-visible:ring-2 focus-visible:ring-brand-blue">
                  Edit My Roster
                </button>
                <Link to="/app"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-blue">
                  Back to Account
                </Link>
              </div>
            ) : (
              <>
                {selectedIds.size < 6 && (
                  <p className="mb-3 text-sm font-medium text-amber-800" role="status">
                    Select at least 6 Pokémon before locking your roster.
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={requestSave} disabled={!canSave}
                    className="rounded-lg bg-brand-yellow px-4 py-2.5 font-semibold text-navy-950 outline-none hover:bg-yellow-300 focus-visible:ring-2 focus-visible:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-60">
                    {saving ? 'Saving roster...' : editing ? 'Save Changes' : 'Save and Lock Roster'}
                  </button>
                  {editing && (
                    <button type="button" onClick={cancelEditing} disabled={saving}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-60">
                      Cancel Editing
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <ConfirmDialog open={showConfirmation} busy={saving} onConfirm={saveRoster}
        onCancel={() => setShowConfirmation(false)} />
    </div>
  )
}

function RosterMetric({ label, value }) {
  return (
    <div className="min-w-20 rounded-lg bg-slate-100 px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-bold text-slate-950">{value}</dd>
    </div>
  )
}

function Notice({ tone, children }) {
  const classes = tone === 'success'
    ? 'border-green-200 bg-green-50 text-green-800'
    : 'border-red-200 bg-red-50 text-red-800'
  return <p className={`mt-5 rounded-lg border p-3 text-sm ${classes}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</p>
}

function RosterStatus({ message, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-950 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl" role="status">
        <p className="font-semibold text-slate-900">{message}</p>
        {children}
      </div>
    </main>
  )
}
