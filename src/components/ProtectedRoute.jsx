import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import AuthLoadingScreen from './AuthLoadingScreen'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoadingScreen />
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
