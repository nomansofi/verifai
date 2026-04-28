import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/ToastProvider.jsx'
import { AppLayout } from './components/layout/AppLayout.jsx'
import Landing from './pages/Landing.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Scan from './pages/Scan.jsx'
import Users from './pages/Users.jsx'
import Attendance from './pages/Attendance.jsx'
import Analytics from './pages/Analytics.jsx'
import AccessControl from './pages/AccessControl.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/users" element={<Users />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/access" element={<AccessControl />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
