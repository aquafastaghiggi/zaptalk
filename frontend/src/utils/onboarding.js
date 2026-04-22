export function resolvePostLoginRoute(user) {
  if (!user) return '/login'
  if (user.must_change_password) return '/change-password'
  if (user.role === 'admin' && !user.setup_done) return '/setup'
  if (user.role === 'agent' && user.first_login) return '/welcome'
  return '/'
}
