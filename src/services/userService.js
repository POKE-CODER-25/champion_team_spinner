import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { MB_ROSTER, MB_ROSTER_ID } from '../data/mbRoster'

const pendingInitializations = new Map()
const pendingRosterSaves = new Map()
const validRosterIds = new Set(MB_ROSTER.map(({ id }) => id))

function requireUid(uid) {
  if (typeof uid !== 'string' || !uid.trim()) {
    throw new Error('A valid Firebase Authentication UID is required.')
  }
  return uid
}

async function initializeUserDocument(user) {
  const userReference = doc(db, 'users', user.uid)
  const userSnapshot = await getDoc(userReference)

  if (userSnapshot.exists()) {
    return { profile: userSnapshot.data(), created: false }
  }

  const profile = {
    uid: user.uid,
    email: user.email ?? '',
    regulationId: 'M-B',
    rosterLocked: false,
    ownedPokemonIds: [],
    spinState: {
      unusedPokemonIds: [],
      usedPokemonIds: [],
      currentTeamIds: [],
      cycleNumber: 1,
      totalSpins: 0,
      lastSpinAt: null,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(userReference, profile)
  return { profile, created: true }
}

export function createUserDocumentIfMissing(user) {
  if (!user || typeof user !== 'object') {
    return Promise.reject(new Error('An authenticated Firebase user is required.'))
  }

  const uid = requireUid(user.uid)
  const existingRequest = pendingInitializations.get(uid)
  if (existingRequest) return existingRequest

  const request = initializeUserDocument(user).finally(() => {
    if (pendingInitializations.get(uid) === request) {
      pendingInitializations.delete(uid)
    }
  })

  pendingInitializations.set(uid, request)
  return request
}

export async function getUserDocument(uid) {
  const userReference = doc(db, 'users', requireUid(uid))
  const userSnapshot = await getDoc(userReference)
  return userSnapshot.exists() ? userSnapshot.data() : null
}

export function validateOwnedPokemonRoster(pokemonIds) {
  if (!Array.isArray(pokemonIds)) {
    throw new Error('Pokémon IDs must be provided as an array.')
  }

  const requestedIds = new Set(pokemonIds)
  const unknownIds = [...requestedIds].filter((id) => !validRosterIds.has(id))
  if (unknownIds.length > 0) {
    throw new Error('The roster contains unknown Pokémon IDs.')
  }

  const selectedPokemonIds = MB_ROSTER
    .filter(({ id }) => requestedIds.has(id))
    .map(({ id }) => id)

  if (selectedPokemonIds.length < 6) {
    throw new Error('A roster must contain at least six Pokémon.')
  }

  return selectedPokemonIds
}

export function saveOwnedPokemonRoster(uid, pokemonIds) {
  const validatedUid = requireUid(uid)
  let selectedPokemonIds
  try {
    selectedPokemonIds = validateOwnedPokemonRoster(pokemonIds)
  } catch (error) {
    return Promise.reject(error)
  }

  const existingRequest = pendingRosterSaves.get(validatedUid)
  if (existingRequest) return existingRequest

  const request = updateDoc(doc(db, 'users', validatedUid), {
    ownedPokemonIds: selectedPokemonIds,
    rosterLocked: true,
    regulationId: MB_ROSTER_ID,
    spinState: {
      unusedPokemonIds: selectedPokemonIds,
      usedPokemonIds: [],
      currentTeamIds: [],
      cycleNumber: 1,
      totalSpins: 0,
      lastSpinAt: null,
    },
    updatedAt: serverTimestamp(),
  }).then(() => selectedPokemonIds)
    .finally(() => {
      if (pendingRosterSaves.get(validatedUid) === request) {
        pendingRosterSaves.delete(validatedUid)
      }
    })

  pendingRosterSaves.set(validatedUid, request)
  return request
}
