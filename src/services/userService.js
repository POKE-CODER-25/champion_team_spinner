import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../config/firebase'

const pendingInitializations = new Map()

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
