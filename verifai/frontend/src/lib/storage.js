const USERS_KEY = 'verifai_users'
const ATTENDANCE_KEY = 'verifai_attendance'

export function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function upsertUser(user) {
  const users = loadUsers()
  const idx = users.findIndex((u) => u.id === user.id)
  if (idx >= 0) users[idx] = user
  else users.unshift(user)
  saveUsers(users)
  return users
}

export function removeUser(id) {
  const users = loadUsers().filter((u) => u.id !== id)
  saveUsers(users)
  return users
}

export function appendAttendanceEvent(ev) {
  const list = loadAttendanceEvents()
  list.unshift(ev)
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(list.slice(0, 1000)))
  return list
}

export function loadAttendanceEvents() {
  try {
    const raw = localStorage.getItem(ATTENDANCE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

