const departments = ['CSE', 'ECE', 'MBA', 'Admin', 'Security']

export const MOCK_DEPARTMENTS = departments

export const MOCK_USERS = [
  { id: 'S-1001', name: 'Aarav Mehta', role: 'Student', department: 'CSE' },
  { id: 'S-1002', name: 'Isha Sharma', role: 'Student', department: 'CSE' },
  { id: 'S-1003', name: 'Kabir Singh', role: 'Student', department: 'ECE' },
  { id: 'S-1004', name: 'Ananya Rao', role: 'Student', department: 'ECE' },
  { id: 'S-1005', name: 'Vihaan Patel', role: 'Student', department: 'MBA' },
  { id: 'S-1006', name: 'Diya Nair', role: 'Student', department: 'MBA' },
  { id: 'E-2001', name: 'Rohan Kapoor', role: 'Employee', department: 'Admin' },
  { id: 'E-2002', name: 'Meera Iyer', role: 'Employee', department: 'Admin' },
  { id: 'E-2003', name: 'Sana Ali', role: 'Employee', department: 'Security' },
  { id: 'E-2004', name: 'Aditya Verma', role: 'Employee', department: 'Security' },
  { id: 'S-1007', name: 'Nikhil Joshi', role: 'Student', department: 'CSE' },
  { id: 'S-1008', name: 'Priya Kulkarni', role: 'Student', department: 'ECE' },
  { id: 'S-1009', name: 'Arjun Menon', role: 'Student', department: 'CSE' },
  { id: 'S-1010', name: 'Neha Gupta', role: 'Student', department: 'MBA' },
  { id: 'E-2005', name: 'Karan Malhotra', role: 'Employee', department: 'Admin' },
  { id: 'E-2006', name: 'Tanya Sen', role: 'Employee', department: 'Security' },
  { id: 'S-1011', name: 'Siddharth Jain', role: 'Student', department: 'ECE' },
  { id: 'S-1012', name: 'Riya Choudhary', role: 'Student', department: 'CSE' },
  { id: 'E-2007', name: 'Farhan Qureshi', role: 'Employee', department: 'Admin' },
  { id: 'E-2008', name: 'Pooja Bansal', role: 'Employee', department: 'Security' },
]

export const MOCK_ALERTS = [
  { id: 'A-1', title: 'Unknown face detected', location: 'Main Gate', time: '09:12 AM' },
  { id: 'A-2', title: 'Repeated unknown entry attempt', location: 'Lab Block', time: '10:05 AM' },
  { id: 'A-3', title: 'Low-confidence match', location: 'Exam Hall 2', time: '11:20 AM' },
  { id: 'A-4', title: 'Camera tamper detected', location: 'CSE Floor', time: '11:48 AM' },
  { id: 'A-5', title: 'Unknown face detected', location: 'Admin Office', time: '12:08 PM' },
]

function pad2(n) {
  return String(n).padStart(2, '0')
}

export function lastNDays(n = 30) {
  const out = []
  const today = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    out.push(d)
  }
  return out
}

export function makeAttendanceHistory(days = 30) {
  const dates = lastNDays(days)
  const records = []
  let seed = 42
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  for (const d of dates) {
    const dateStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    for (const u of MOCK_USERS) {
      const r = rand()
      const status = r < 0.07 ? 'ABSENT' : r < 0.18 ? 'LATE' : 'PRESENT'
      const method = r < 0.85 ? 'FACE' : 'QR'
      const timeIn = status === 'ABSENT' ? null : r < 0.18 ? '09:18' : '09:02'
      const timeOut = status === 'ABSENT' ? null : '16:45'
      records.push({
        id: `${dateStr}-${u.id}`,
        date: dateStr,
        name: u.name,
        userId: u.id,
        department: u.department,
        status,
        method,
        timeIn,
        timeOut,
      })
    }
  }
  return records
}

export const MOCK_ATTENDANCE = makeAttendanceHistory(30)

export function getTodaySnapshot() {
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`
  const todayRecords = MOCK_ATTENDANCE.filter((r) => r.date === dateStr)
  const present = todayRecords.filter((r) => r.status === 'PRESENT').length
  const absent = todayRecords.filter((r) => r.status === 'ABSENT').length
  const late = todayRecords.filter((r) => r.status === 'LATE').length
  const unknown = 2
  const total = present + absent + late
  const pct = total ? Math.round(((present + late) / total) * 100) : 0
  return { dateStr, present, absent, late, unknown, pct }
}

export function makeWeeklyBars() {
  const days = lastNDays(7)
  return days.map((d, idx) => {
    const label = d.toLocaleDateString(undefined, { weekday: 'short' })
    const base = 84 + (idx % 3) * 3
    const jitter = (idx * 7) % 9
    const pct = Math.min(98, base + jitter)
    return { label, pct }
  })
}

export function makeDonut(pct) {
  return [
    { name: 'Present', value: pct },
    { name: 'Absent', value: 100 - pct },
  ]
}

export function makeLiveFeed(count = 10) {
  const now = new Date()
  return Array.from({ length: count }).map((_, i) => {
    const u = MOCK_USERS[(i * 3 + 2) % MOCK_USERS.length]
    const d = new Date(now)
    d.setMinutes(now.getMinutes() - i * 6)
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    const status = i === 2 ? 'UNKNOWN' : i % 6 === 0 ? 'LATE' : 'PRESENT'
    const confidence = status === 'UNKNOWN' ? 0.42 : status === 'LATE' ? 0.88 : 0.94
    return { id: `F-${i}`, name: u.name, time, status, confidence }
  })
}

export function makeAccessLogs(count = 14) {
  const now = new Date()
  return Array.from({ length: count }).map((_, i) => {
    const u = MOCK_USERS[(i * 5 + 1) % MOCK_USERS.length]
    const d = new Date(now)
    d.setMinutes(now.getMinutes() - i * 9)
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    const loc = i % 4 === 0 ? 'Main Gate' : i % 4 === 1 ? 'Lab Block' : i % 4 === 2 ? 'Admin Wing' : 'Exam Hall'
    const access = i % 7 === 0 ? 'DENIED' : 'GRANTED'
    return { id: `X-${i}`, name: u.name, time, location: loc, access }
  })
}

