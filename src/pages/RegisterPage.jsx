import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import PasswordField from '../components/PasswordField'
import { useAuth } from '../context/useAuth'
import { getAuthErrorMessage } from '../utils/authErrors'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password || !confirmation) {
      setError('All fields are required.')
      return
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must contain at least six characters.')
      return
    }
    if (password !== confirmation) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await register(trimmedEmail, password)
      navigate('/app', { replace: true })
    } catch (authError) {
      setError(getAuthErrorMessage(authError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard heading="Create your account">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-800">Email</label>
          <input id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)}
            autoComplete="email" required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none focus:border-brand-blue focus:ring-2 focus:ring-blue-200" />
        </div>
        <PasswordField id="password" label="Password" value={password} onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password" visible={showPasswords} onToggle={() => setShowPasswords((current) => !current)} />
        <PasswordField id="confirmation" label="Confirm password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="new-password" visible={showPasswords} onToggle={() => setShowPasswords((current) => !current)} />
        <button type="submit" disabled={submitting}
          className="w-full rounded-lg bg-brand-yellow px-4 py-2.5 font-semibold text-navy-950 outline-none hover:bg-yellow-300 focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">Already registered?{' '}
        <Link to="/login" className="font-semibold text-brand-blue underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue">Sign in</Link>
      </p>
    </AuthCard>
  )
}
