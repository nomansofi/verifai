import { loadUsersDb, saveUsersDb } from './usersDb.js'
import { listTimetable, saveTimetable } from './verifaiDb.js'

function hasAnyUsers() {
  const db = loadUsersDb()
  return Array.isArray(db) && db.length > 0
}

export function ensureSeedData() {
  if (!hasAnyUsers()) {
    const now = new Date().toISOString()
    const seed = [
      {
        id: 't-1001',
        username: 'T-1001',
        password: 'teacher123',
        name: 'Prof. Neha Iyer',
        role: 'teacher',
        department: 'CSE',
        subjects: ['Data Structures', 'Algorithms'],
        phone: '9990001111',
        email: 'neha@verifai.local',
        photoDataURL: null,
        faceDescriptor: null,
        createdAt: now,
      },
      {
        id: 's-1001',
        username: 'S-1001',
        password: 'student123',
        name: 'Aarav Mehta',
        role: 'student',
        department: 'CSE',
        section: 'CSE-A',
        phone: '9991112222',
        email: 'aarav@verifai.local',
        dob: '2006-02-14',
        parentName: 'Mr. Raj Mehta',
        parentPhone: '9997778888',
        parentEmail: 'raj.mehta@example.com',
        parentNotifyPref: 'Both',
        photoDataURL: null,
        faceDescriptor: null,
        createdAt: now,
        attendanceRecords: [],
      },
      {
        id: 's-1002',
        username: 'S-1002',
        password: 'student123',
        name: 'Diya Nair',
        role: 'student',
        department: 'CSE',
        section: 'CSE-A',
        phone: '9993334444',
        email: 'diya@verifai.local',
        dob: '2006-09-03',
        parentName: 'Mrs. Anitha Nair',
        parentPhone: '9996665555',
        parentEmail: 'anitha.nair@example.com',
        parentNotifyPref: 'Email',
        photoDataURL: null,
        faceDescriptor: null,
        createdAt: now,
        attendanceRecords: [],
      },
    ]
    saveUsersDb(seed)
  }

  const tt = listTimetable()
  if (!Array.isArray(tt) || tt.length === 0) {
    // default timetable for demo
    saveTimetable([
      {
        id: 'tt-1',
        department: 'CSE',
        day: 'Tue',
        startTime: '14:00',
        endTime: '15:00',
        subject: 'Data Structures',
        teacher: 'Prof. Neha Iyer',
        room: 'CSE-201',
      },
      {
        id: 'tt-2',
        department: 'CSE',
        day: 'Tue',
        startTime: '15:00',
        endTime: '16:00',
        subject: 'Algorithms',
        teacher: 'Prof. Neha Iyer',
        room: 'CSE-201',
      },
    ])
  }
}

