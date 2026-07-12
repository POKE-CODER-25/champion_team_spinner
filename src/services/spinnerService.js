import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { MB_ROSTER, MB_ROSTER_ID } from '../data/mbRoster'
import { buildNextSpinState } from '../utils/spinState'

const validRosterIds = new Set(MB_ROSTER.map(({ id }) => id))

function requireUid(uid) {
  if (typeof uid !== 'string' || !uid.trim()) {
    throw new Error('A valid Firebase Authentication UID is required.')
  }
  return uid
}

function getValidOwnedIds(profile) {
  const savedIds = Array.isArray(profile?.ownedPokemonIds) ? profile.ownedPokemonIds : []
  const savedSet = new Set(savedIds)
  const validIds = MB_ROSTER.filter(({ id }) => savedSet.has(id)).map(({ id }) => id)
  const unknownIds = [...savedSet].filter((id) => !validRosterIds.has(id))

  if (import.meta.env.DEV && unknownIds.length > 0) {
    console.warn('Ignoring unknown Pokémon IDs while processing spinner state.', unknownIds)
  }
  return validIds
}

function requireSpinnerReady(profile) {
  const ownedPokemonIds = getValidOwnedIds(profile)
  if (!profile?.rosterLocked || profile?.regulationId !== MB_ROSTER_ID || ownedPokemonIds.length < 6) {
    throw new Error('The owned roster is not ready for team generation.')
  }
  return ownedPokemonIds
}

export async function spinRandomTeam(uid) {
  const userReference = doc(db, 'users', requireUid(uid))

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userReference)
    if (!snapshot.exists()) throw new Error('The authenticated user document does not exist.')

    const profile = snapshot.data()
    const ownedPokemonIds = requireSpinnerReady(profile)
    const result = buildNextSpinState(profile.spinState, ownedPokemonIds)
    const nextSpinState = {
      ...result.spinState,
      lastSpinAt: serverTimestamp(),
    }

    transaction.update(userReference, {
      spinState: nextSpinState,
      updatedAt: serverTimestamp(),
    })

    return {
      teamIds: nextSpinState.currentTeamIds,
      cycleNumber: nextSpinState.cycleNumber,
      totalSpins: nextSpinState.totalSpins,
      remainingCount: nextSpinState.unusedPokemonIds.length,
      usedCount: nextSpinState.usedPokemonIds.length,
      rollover: Boolean(result.rolloverType),
      rolloverType: result.rolloverType,
      rolloverMessage: result.rolloverMessage,
    }
  })
}

export async function resetSpinCycle(uid) {
  const userReference = doc(db, 'users', requireUid(uid))

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userReference)
    if (!snapshot.exists()) throw new Error('The authenticated user document does not exist.')

    const ownedPokemonIds = requireSpinnerReady(snapshot.data())
    const spinState = {
      unusedPokemonIds: ownedPokemonIds,
      usedPokemonIds: [],
      currentTeamIds: [],
      cycleNumber: 1,
      totalSpins: 0,
      lastSpinAt: null,
    }

    transaction.update(userReference, {
      spinState,
      updatedAt: serverTimestamp(),
    })

    return spinState
  })
}
