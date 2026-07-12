import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../config/firebase'
import { createUserDocumentIfMissing } from '../services/userService'

import { AuthContext } from './authContextObject'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const profileRequestId = useRef(0)

  const refreshUserProfile = useCallback(async (firebaseUser = auth.currentUser) => {
    const requestId = ++profileRequestId.current

    if (!firebaseUser?.uid) {
      setUserProfile(null)
      setProfileLoading(false)
      setProfileError(new Error('An authenticated user is required to load saved team data.'))
      return null
    }

    setProfileLoading(true)
    setProfileError(null)

    try {
      const result = await createUserDocumentIfMissing(firebaseUser)
      if (requestId === profileRequestId.current && auth.currentUser?.uid === firebaseUser.uid) {
        setUserProfile(result.profile)
        setProfileLoading(false)
      }
      return result
    } catch (error) {
      console.error('Unable to initialize the signed-in user document.', {
        code: error?.code ?? 'unknown',
        message: error?.message ?? 'Unknown Firestore error',
      })
      if (requestId === profileRequestId.current && auth.currentUser?.uid === firebaseUser.uid) {
        setUserProfile(null)
        setProfileError(error)
        setProfileLoading(false)
      }
      return null
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      if (currentUser) {
        void refreshUserProfile(currentUser)
      } else {
        profileRequestId.current += 1
        setUserProfile(null)
        setProfileLoading(false)
        setProfileError(null)
      }
    })
    return unsubscribe
  }, [refreshUserProfile])

  const value = useMemo(() => ({
    user,
    loading,
    userProfile,
    profileLoading,
    profileError,
    refreshUserProfile,
    register: (email, password) => createUserWithEmailAndPassword(auth, email, password),
    login: (email, password) => signInWithEmailAndPassword(auth, email, password),
    logout: () => signOut(auth),
  }), [user, loading, userProfile, profileLoading, profileError, refreshUserProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
