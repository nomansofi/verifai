const KEY = 'verifai_users_db'
const CURRENT_USER_KEY = 'verifai_current_user'

export const DEPARTMENTS = ['CSE', 'ECE', 'MBA', 'Admin', 'Security']

export function loadUsersDb() {
  try {
    const raw = localStorage.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function saveUsersDb(db) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

export function addUserToDb(newUser) {
  const db = loadUsersDb()
  db.push(newUser)
  saveUsersDb(db)
  return db
}

export function updateUserInDb(id, patch) {
  const db = loadUsersDb()
  const idx = db.findIndex((u) => u.id === id)
  if (idx === -1) return { ok: false, db }
  db[idx] = { ...db[idx], ...patch }
  saveUsersDb(db)
  return { ok: true, db, user: db[idx] }
}

export function deleteUserFromDb(id) {
  const db = loadUsersDb()
  const next = db.filter((u) => u.id !== id)
  saveUsersDb(next)
  return next
}

export function findUserByUsernameRole(username, role) {
  const db = loadUsersDb()
  return db.find((u) => u.username === username && u.role === role) ?? null
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setCurrentUser(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
}

export function clearCurrentUser() {
  localStorage.removeItem(CURRENT_USER_KEY)
}

export function findUserById(id) {
  const db = loadUsersDb()
  return db.find((u) => u.id === id) ?? null
}

export function findUserByUsername(username) {
  const db = loadUsersDb()
  return db.find((u) => u.username === username) ?? null
}

export function upsertUserInDb(user) {
  const db = loadUsersDb()
  const idx = db.findIndex((u) => u.id === user.id)
  if (idx === -1) db.push(user)
  else db[idx] = { ...db[idx], ...user }
  saveUsersDb(db)
  return db
}

export function addAttendanceForStudentName(name, { status = 'present', method = 'FACE', confidence = 0, ...extra } = {}) {
  const db = loadUsersDb()
  const idx = db.findIndex((u) => u.role === 'student' && u.name === name)
  if (idx === -1) return { ok: false }
  const rec = {
    date: new Date().toDateString(),
    timeIn: new Date().toLocaleTimeString(),
    status,
    method,
    confidence,
    ...extra,
  }
  const prev = Array.isArray(db[idx].attendanceRecords) ? db[idx].attendanceRecords : []
  db[idx] = { ...db[idx], attendanceRecords: [...prev, rec] }
  saveUsersDb(db)
  return { ok: true, record: rec }
}

export function addAttendanceForStudentId(username, { status = 'present', method = 'FACE', confidence = 0, ...extra } = {}) {
  const db = loadUsersDb()
  const idx = db.findIndex((u) => u.role === 'student' && u.username === username)
  if (idx === -1) return { ok: false }
  const rec = {
    date: new Date().toDateString(),
    timeIn: new Date().toLocaleTimeString(),
    status,
    method,
    confidence,
    ...extra,
  }
  const prev = Array.isArray(db[idx].attendanceRecords) ? db[idx].attendanceRecords : []
  db[idx] = { ...db[idx], attendanceRecords: [...prev, rec] }
  saveUsersDb(db)
  return { ok: true, record: rec }
}

