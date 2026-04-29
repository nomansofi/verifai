import { Navigate } from 'react-router-dom'
import { getCurrentUser } from '../lib/usersDb.js'

export default function AuthGuard({ children, allowedRoles }) {
  const user = getCurrentUser()
  if (!user) return <Navigate to="/" replace />
  if (Array.isArray(allowedRoles) && allowedRoles.length && !allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />
  return children
}

