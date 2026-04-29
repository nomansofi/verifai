import { clearCurrentUser, findUserByUsernameRole, setCurrentUser } from './usersDb.js'

export const MASTER_ADMIN = { username: 'admin', password: 'admin123', role: 'admin' }

export function login({ role, username, password }) {
  const u = String(username || '').trim()
  const p = String(password || '')

  if (role === 'admin') {
    if (u === MASTER_ADMIN.username && p === MASTER_ADMIN.password) {
      const user = { id: 'admin', username: u, name: 'Admin', role: 'admin' }
      setCurrentUser(user)
      return { ok: true, user }
    }
    return { ok: false, message: 'Invalid credentials. Please contact your administrator.' }
  }

  const found = findUserByUsernameRole(u, role)
  if (!found || found.password !== p) {
    return { ok: false, message: 'Invalid credentials. Please contact your administrator.' }
  }

  const session = {
    id: found.id,
    username: found.username,
    name: found.name,
    role: found.role,
    department: found.department ?? null,
    photoDataURL: found.photoDataURL ?? null,
  }
  setCurrentUser(session)
  return { ok: true, user: session }
}

export function logout() {
  clearCurrentUser()
}
