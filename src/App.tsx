import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ConfigDataProvider } from './hooks/useConfigData'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import PortalPage from './pages/PortalPage'
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
import LibroPage from './pages/ventas/LibroPage'
import ComprasPage from './pages/compras/ComprasPage'
import ComparativoEditorPage from './pages/compras/ComparativoEditorPage'
import ProveedoresPage from './pages/compras/ProveedoresPage'
import ArticulosPage from './pages/compras/ArticulosPage'
import BitrixTareasPage from './pages/compras/BitrixTareasPage'
import ComprasGanttPage from './pages/compras/ComprasGanttPage'
import ComprasDashboardPage from './pages/compras/ComprasDashboardPage'
import SeguimientoGestionPage from './pages/compras/SeguimientoGestionPage'
import SeguimientoGanttPage from './pages/compras/SeguimientoGanttPage'
import SeguimientoDashboardPage from './pages/compras/SeguimientoDashboardPage'
import SolicitudCompraBOMPage from './pages/compras/SolicitudCompraBOMPage'
import SolicitudCompraBOMDashboardPage from './pages/compras/SolicitudCompraBOMDashboardPage'
import SolicitudesPage from './pages/compras/SolicitudesPage'
import SolicitudesDashboardPage from './pages/compras/SolicitudesDashboardPage'
import FormPage from './pages/forms/FormPage'
import FormPreviewPage from './pages/forms/FormPreviewPage'
import CotizacionesPage from './pages/cotizaciones/CotizacionesPage'
import PersonalTarifasPage from './pages/cotizaciones/PersonalTarifasPage'
import CotizacionEditorPage from './pages/cotizaciones/CotizacionEditorPage'
import DealsPage from './pages/comercial/DealsPage'
import DealsDashboardPage from './pages/comercial/DealsDashboardPage'
import DealsGanttPage from './pages/comercial/DealsGanttPage'
import AlmacenDashboardPage from './pages/almacen/AlmacenDashboardPage'
import EquiposAlmacenPage from './pages/almacen/EquiposAlmacenPage'
import KardexPage from './pages/almacen/KardexPage'
import PedidosPage from './pages/almacen/PedidosPage'
import PedidoEditorPage from './pages/almacen/PedidoEditorPage'
import RecepcionesPage from './pages/almacen/RecepcionesPage'
import RecepcionEditorPage from './pages/almacen/RecepcionEditorPage'
import DespachosPage from './pages/almacen/DespachosPage'
import DespachoEditorPage from './pages/almacen/DespachoEditorPage'
import UbicacionesPage from './pages/almacen/UbicacionesPage'
import TransferenciaPage from './pages/almacen/TransferenciaPage'
import NotFoundPage from './pages/NotFoundPage'

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
        {/* Páginas fullscreen — sin Layout */}
        <Route path="/" element={<PortalPage />} />

        <Route element={<Layout />}>
          <Route path="/dashboard"   element={<DashboardPage />} />
          <Route path="/projects"    element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/kanban"      element={<KanbanPage />} />
          <Route path="/timeline"    element={<TimelinePage />} />
          <Route path="/consolidated" element={<ConsolidatedPage />} />
          <Route path="/calendar"    element={<CalendarPage />} />
          <Route path="/overview"    element={<OverviewPage />} />
          <Route path="/settings"    element={<SettingsPage />} />
          <Route path="/budgets"                    element={<BudgetsPage />} />
          <Route path="/budgets/reports"            element={<BudgetReportsPage />} />
          <Route path="/budgets/:id"                element={<BudgetEditorPage />} />
          <Route path="/budgets/:id/:section"       element={<BudgetEditorPage />} />
          <Route path="/libro"                      element={<LibroPage />} />
          <Route path="/schedule"          element={<SchedulesPage />} />
          <Route path="/schedule/:id"      element={<ScheduleEditorPage />} />
          {/* Compras */}
          <Route path="/compras"              element={<ComprasPage />} />
          <Route path="/compras/articulos"    element={<ArticulosPage />} />
          <Route path="/compras/proveedores"  element={<ProveedoresPage />} />
          <Route path="/compras/seguimiento"            element={<SeguimientoGestionPage />} />
          <Route path="/compras/seguimiento/gantt"      element={<SeguimientoGanttPage />} />
          <Route path="/compras/seguimiento/dashboard"  element={<SeguimientoDashboardPage />} />
          <Route path="/compras/bom"            element={<SolicitudCompraBOMPage />} />
          <Route path="/compras/bom/dashboard"  element={<SolicitudCompraBOMDashboardPage />} />
          <Route path="/compras/solicitudes"                element={<SolicitudesPage />} />
          <Route path="/compras/solicitudes/dashboard"   element={<SolicitudesDashboardPage />} />
          <Route path="/compras/solicitudes/:id/preview" element={<FormPreviewPage />} />
          <Route path="/compras/tareas/:groupId/gantt"          element={<ComprasGanttPage />} />
          <Route path="/compras/tareas/:groupId/dashboard"     element={<ComprasDashboardPage />} />
          <Route path="/compras/tareas/:groupId"               element={<BitrixTareasPage />} />
          {/* Ingeniería */}
          <Route path="/ingenieria/tareas/:groupId/dashboard"  element={<ComprasDashboardPage />} />
          <Route path="/ingenieria/tareas/:groupId"            element={<BitrixTareasPage />} />
          <Route path="/compras/:id"          element={<ComparativoEditorPage />} />
          {/* RRHH */}
          <Route path="/rrhh/equipo"     element={<EquipoPage />} />
          <Route path="/rrhh/usuarios"   element={<UsersPage />} />
          <Route path="/rrhh/asistencia" element={<AttendancePage />} />
          <Route path="/rrhh/hh"         element={<HHDashboardPage />} />
          {/* Valorizaciones */}
          <Route path="/projects/:id/valuations"      element={<ValuationsPage />} />
          <Route path="/projects/:id/valuations/:vid" element={<ValuationEditorPage />} />
          {/* Cotizaciones */}
          <Route path="/cotizaciones"           element={<CotizacionesPage />} />
          <Route path="/cotizaciones/personal"  element={<PersonalTarifasPage />} />
          <Route path="/cotizaciones/:id"       element={<CotizacionEditorPage />} />
          {/* Comercial */}
          <Route path="/comercial/deals"            element={<DealsPage />} />
          <Route path="/comercial/deals/dashboard"  element={<DealsDashboardPage />} />
          <Route path="/comercial/deals/gantt"      element={<DealsGanttPage />} />
          {/* Almacén */}
          <Route path="/almacen"                        element={<AlmacenDashboardPage />} />
          <Route path="/almacen/equipos"                element={<EquiposAlmacenPage />} />
          <Route path="/almacen/kardex"                 element={<KardexPage />} />
          <Route path="/almacen/pedidos"                element={<PedidosPage />} />
          <Route path="/almacen/pedidos/:id"            element={<PedidoEditorPage />} />
          <Route path="/almacen/recepciones"            element={<RecepcionesPage />} />
          <Route path="/almacen/recepciones/:id"        element={<RecepcionEditorPage />} />
          <Route path="/almacen/despachos"              element={<DespachosPage />} />
          <Route path="/almacen/despachos/:id"          element={<DespachoEditorPage />} />
          <Route path="/almacen/ubicaciones"            element={<UbicacionesPage />} />
          <Route path="/almacen/transferencia"          element={<TransferenciaPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ConfigDataProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Formularios públicos — sin login Supabase, usan auth Microsoft propio */}
          <Route path="/forms/:slug" element={<FormPage />} />
          <Route path="/*" element={<AuthenticatedApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
