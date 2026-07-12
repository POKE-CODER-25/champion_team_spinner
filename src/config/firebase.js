import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const environmentVariables = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
}

const missingVariables = Object.entries(environmentVariables)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (missingVariables.length > 0) {
  throw new Error(
    `Firebase configuration is incomplete. Add these variables to .env: ${missingVariables.join(', ')}`,
  )
}

const firebaseApp = initializeApp({
  apiKey: environmentVariables.VITE_FIREBASE_API_KEY,
  authDomain: environmentVariables.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: environmentVariables.VITE_FIREBASE_PROJECT_ID,
  storageBucket: environmentVariables.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: environmentVariables.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: environmentVariables.VITE_FIREBASE_APP_ID,
})

export const auth = getAuth(firebaseApp)
