import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { resolvePostLoginRoute } from '../../utils/onboarding'

const ONBOARDING_ROUTES = new Set(['/change-password', '/setup', '/welcome'])

export default function PrivateRoute({ children, roles }) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const loadMe = useAuthStore((s) => s.loadMe)
  const location = useLocation()
  const [checking, setChecking] = useState(Boolean(token) && !user)

  useEffect(() => {
    let mounted = true

    const ensureUser = async () => {
      if (!token || user) {
        if (mounted) setChecking(false)
        return
      }

      setChecking(true)
      await loadMe()
      if (mounted) setChecking(false)
    }

    ensureUser()
    return () => {
      mounted = false
    }
  }, [token, user, loadMe])

  if (!token) return <Navigate to="/login" replace state={{ from: location }} />
  if (checking || (!user && token)) {
    return <div className="flex min-h-screen items-center justify-center bg-surface-0 text-sm text-muted">Carregando...</div>
  }

  const redirectTo = resolvePostLoginRoute(user)
  const currentPath = location.pathname

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />
  }

  if (ONBOARDING_ROUTES.has(redirectTo) && currentPath !== redirectTo) {
    return <Navigate to={redirectTo} replace />
  }

  if (!ONBOARDING_ROUTES.has(redirectTo) && ONBOARDING_ROUTES.has(currentPath) && currentPath !== redirectTo) {
    return <Navigate to={redirectTo} replace />
  }

  return children
}
