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
import BudgetsPage from './pages/BudgetsPage'
import BudgetEditorPage from './pages/BudgetEditorPage'
import BudgetReportsPage from './pages/BudgetReportsPage'
import SchedulesPage from './pages/SchedulesPage'
import ScheduleEditorPage from './pages/ScheduleEditorPage'
import EquipoPage from './pages/rrhh/EquipoPage'
import UsersPage from './pages/rrhh/UsersPage'
import AttendancePage from './pages/rrhh/AttendancePage'
import HHDashboardPage from './pages/rrhh/HHDashboardPage'
import ValuationsPage from './pages/valuations/ValuationsPage'
import ValuationEditorPage from './pages/valuations/ValuationEditorPage'
import ComprasPage from './pages/compras/ComprasPage'
import ComparativoEditorPage from './pages/compras/ComparativoEditorPage'
import ProveedoresPage from './pages/compras/ProveedoresPage'
import ArticulosPage from './pages/compras/ArticulosPage'

function AuthenticatedApp() {
  const { user, loading, accountDisabled, signOut } = useAuth()

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

  if (accountDisabled) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--n-50)', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--n-800)' }}>Cuenta desactivada</div>
        <div style={{ fontSize: 13, color: 'var(--n-500)' }}>
          Contacta al administrador para reactivar tu acceso.
        </div>
        <button
          onClick={signOut}
          style={{ marginTop: 8, fontSize: 12.5, color: 'var(--brand-600)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Cerrar sesión
        </button>
      </div>
    )
  }

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
          <Route path="/budgets"           element={<BudgetsPage />} />
          <Route path="/budgets/reports"   element={<BudgetReportsPage />} />
          <Route path="/budgets/:id"       element={<BudgetEditorPage />} />
          <Route path="/schedule"          element={<SchedulesPage />} />
          <Route path="/schedule/:id"      element={<ScheduleEditorPage />} />
          {/* Compras */}
          <Route path="/compras"              element={<ComprasPage />} />
          <Route path="/compras/articulos"    element={<ArticulosPage />} />
          <Route path="/compras/proveedores"  element={<ProveedoresPage />} />
          <Route path="/compras/:id"          element={<ComparativoEditorPage />} />
          {/* RRHH */}
          <Route path="/rrhh/equipo"     element={<EquipoPage />} />
          <Route path="/rrhh/usuarios"   element={<UsersPage />} />
          <Route path="/rrhh/asistencia" element={<AttendancePage />} />
          <Route path="/rrhh/hh"         element={<HHDashboardPage />} />
          {/* Valorizaciones */}
          <Route path="/projects/:id/valuations"      element={<ValuationsPage />} />
          <Route path="/projects/:id/valuations/:vid" element={<ValuationEditorPage />} />
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
