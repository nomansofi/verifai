import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import { ToastProvider } from './components/ToastProvider.jsx'
import AuthGuard from './components/AuthGuard.jsx'
import RoleLayout from './components/layout/RoleLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Scan from './pages/Scan.jsx'
import Users from './pages/Users.jsx'
import Attendance from './pages/Attendance.jsx'
import Analytics from './pages/Analytics.jsx'
import AccessControl from './pages/AccessControl.jsx'
import Settings from './pages/Settings.jsx'
import TeacherDashboard from './pages/TeacherDashboard.jsx'
import StudentDashboard from './pages/StudentDashboard.jsx'
import StudentProfile from './pages/StudentProfile.jsx'
import Unauthorized from './pages/Unauthorized.jsx'
import WhatsappLogs from './pages/WhatsappLogs.jsx'
import StudentQr from './pages/StudentQr.jsx'
import Appeals from './pages/Appeals.jsx'
import EventsPage from './pages/EventsPage.jsx'
import EventAttendeesPage from './pages/EventAttendeesPage.jsx'
import EventCheckinPage from './pages/EventCheckinPage.jsx'
import ExamsPage from './pages/ExamsPage.jsx'
import ExamVerifyPage from './pages/ExamVerifyPage.jsx'
import ExamProctorPage from './pages/ExamProctorPage.jsx'
import ExamReportPage from './pages/ExamReportPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import { ensureSeedData } from './lib/initSeed.js'
import { initTheme } from './lib/theme.js'

export default function App() {
  useEffect(() => {
    ensureSeedData()
    return initTheme()
  }, [])

  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route
            element={
              <AuthGuard allowedRoles={['admin', 'teacher', 'student']}>
                <RoleLayout />
              </AuthGuard>
            }
          >
            <Route
              path="/dashboard"
              element={
                <AuthGuard allowedRoles={['admin']}>
                  <Dashboard />
                </AuthGuard>
              }
            />
            <Route
              path="/teacher-dashboard"
              element={
                <AuthGuard allowedRoles={['teacher']}>
                  <TeacherDashboard />
                </AuthGuard>
              }
            />
            <Route
              path="/student-dashboard"
              element={
                <AuthGuard allowedRoles={['student']}>
                  <StudentDashboard />
                </AuthGuard>
              }
            />
            <Route
              path="/student-profile"
              element={
                <AuthGuard allowedRoles={['student']}>
                  <StudentProfile />
                </AuthGuard>
              }
            />
            <Route
              path="/student-qr"
              element={
                <AuthGuard allowedRoles={['student']}>
                  <StudentQr />
                </AuthGuard>
              }
            />
            <Route
              path="/appeals"
              element={
                <AuthGuard allowedRoles={['student', 'teacher']}>
                  <Appeals />
                </AuthGuard>
              }
            />
            <Route
              path="/scan"
              element={
                <AuthGuard allowedRoles={['admin', 'teacher']}>
                  <Scan />
                </AuthGuard>
              }
            />
            <Route
              path="/users"
              element={
                <AuthGuard allowedRoles={['admin']}>
                  <Users />
                </AuthGuard>
              }
            />
            <Route
              path="/attendance"
              element={
                <AuthGuard allowedRoles={['admin', 'teacher']}>
                  <Attendance />
                </AuthGuard>
              }
            />
            <Route
              path="/analytics"
              element={
                <AuthGuard allowedRoles={['admin', 'teacher']}>
                  <Analytics />
                </AuthGuard>
              }
            />
            <Route
              path="/events"
              element={
                <AuthGuard allowedRoles={['admin']}>
                  <EventsPage />
                </AuthGuard>
              }
            />
            <Route
              path="/events/:id/attendees"
              element={
                <AuthGuard allowedRoles={['admin']}>
                  <EventAttendeesPage />
                </AuthGuard>
              }
            />
            <Route
              path="/events/:id/checkin"
              element={
                <AuthGuard allowedRoles={['admin']}>
                  <EventCheckinPage />
                </AuthGuard>
              }
            />
            <Route
              path="/exams"
              element={
                <AuthGuard allowedRoles={['admin', 'teacher']}>
                  <ExamsPage />
                </AuthGuard>
              }
            />
            <Route
              path="/exams/:id/verify"
              element={
                <AuthGuard allowedRoles={['admin', 'teacher']}>
                  <ExamVerifyPage />
                </AuthGuard>
              }
            />
            <Route
              path="/exams/:id/proctor"
              element={
                <AuthGuard allowedRoles={['admin', 'teacher']}>
                  <ExamProctorPage />
                </AuthGuard>
              }
            />
            <Route
              path="/exams/:id/report"
              element={
                <AuthGuard allowedRoles={['admin', 'teacher']}>
                  <ExamReportPage />
                </AuthGuard>
              }
            />
            <Route
              path="/reports"
              element={
                <AuthGuard allowedRoles={['admin', 'teacher']}>
                  <PlaceholderPage title="Reports" subtitle="Report center placeholder (existing module can be integrated here)." />
                </AuthGuard>
              }
            />
            <Route
              path="/notifications"
              element={
                <AuthGuard allowedRoles={['admin']}>
                  <PlaceholderPage title="Notifications" subtitle="Notification center placeholder." />
                </AuthGuard>
              }
            />
            <Route
              path="/timetable"
              element={
                <AuthGuard allowedRoles={['admin', 'teacher']}>
                  <PlaceholderPage title="Timetable" subtitle="Timetable module placeholder." />
                </AuthGuard>
              }
            />
            <Route
              path="/access"
              element={
                <AuthGuard allowedRoles={['admin']}>
                  <AccessControl />
                </AuthGuard>
              }
            />
            <Route
              path="/settings"
              element={
                <AuthGuard allowedRoles={['admin']}>
                  <Settings />
                </AuthGuard>
              }
            />
            <Route
              path="/whatsapp-logs"
              element={
                <AuthGuard allowedRoles={['admin']}>
                  <WhatsappLogs />
                </AuthGuard>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
