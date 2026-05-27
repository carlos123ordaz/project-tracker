import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ConfigDataProvider } from './hooks/useConfigData'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import KanbanPage from './pages/KanbanPage'
import TimelinePage from './pages/TimelinePage'
import ConsolidatedPage from './pages/ConsolidatedPage'
import CalendarPage from './pages/CalendarPage'
import OverviewPage from './pages/OverviewPage'
import SettingsPage from './pages/SettingsPage'

function AuthenticatedApp() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--n-50)',
      }}>
        <div style={{ fontSize: 13, color: 'var(--n-400)' }}>Cargando…</div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <ConfigDataProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/"            element={<DashboardPage />} />
          <Route path="/projects"    element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/kanban"      element={<KanbanPage />} />
          <Route path="/timeline"    element={<TimelinePage />} />
          <Route path="/consolidated" element={<ConsolidatedPage />} />
          <Route path="/calendar"    element={<CalendarPage />} />
          <Route path="/overview"    element={<OverviewPage />} />
          <Route path="/settings"    element={<SettingsPage />} />
        </Route>
      </Routes>
    </ConfigDataProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/*" element={<AuthenticatedApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
