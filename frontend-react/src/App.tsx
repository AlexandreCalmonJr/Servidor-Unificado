import { useState, useMemo, lazy, Suspense } from 'react'
import type { PageId } from './types'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TableSkeleton } from './components/TableSkeleton'
import { Login } from './pages/Login'
import { defaultModules } from './data/modules'
import type { ModuleItem } from './types'
import { authStorage } from './services/api'

// Code-splitting de todas as páginas para otimização de bundle e memória
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Assets = lazy(() => import('./pages/Assets').then(m => ({ default: m.Assets })))
const DeviceDetail = lazy(() => import('./pages/DeviceDetail').then(m => ({ default: m.DeviceDetail })))
const Totems = lazy(() => import('./pages/Totems').then(m => ({ default: m.Totems })))
const TotemDetail = lazy(() => import('./pages/TotemDetail').then(m => ({ default: m.TotemDetail })))
const Printers = lazy(() => import('./pages/Printers').then(m => ({ default: m.Printers })))
const PrinterDetail = lazy(() => import('./pages/PrinterDetail').then(m => ({ default: m.PrinterDetail })))
const Provisioning = lazy(() => import('./pages/Provisioning').then(m => ({ default: m.Provisioning })))
const ProvisionQr = lazy(() => import('./pages/ProvisionQr').then(m => ({ default: m.ProvisionQr })))
const Commands = lazy(() => import('./pages/Commands').then(m => ({ default: m.Commands })))
const Diagnostics = lazy(() => import('./pages/Diagnostics').then(m => ({ default: m.Diagnostics })))
const Modules = lazy(() => import('./pages/Modules').then(m => ({ default: m.Modules })))
const IoT = lazy(() => import('./pages/IoT').then(m => ({ default: m.IoT })))
const IoTDetail = lazy(() => import('./pages/IoTDetail').then(m => ({ default: m.IoTDetail })))
const Policies = lazy(() => import('./pages/Policies').then(m => ({ default: m.Policies })))
const PolicyCreate = lazy(() => import('./pages/PolicyCreate').then(m => ({ default: m.PolicyCreate })))
const Groups = lazy(() => import('./pages/Groups').then(m => ({ default: m.Groups })))
const GroupDetail = lazy(() => import('./pages/GroupDetail').then(m => ({ default: m.GroupDetail })))
const GroupCreate = lazy(() => import('./pages/GroupCreate').then(m => ({ default: m.GroupCreate })))
const GroupRules = lazy(() => import('./pages/GroupRules').then(m => ({ default: m.GroupRules })))
const AppCatalog = lazy(() => import('./pages/AppCatalog').then(m => ({ default: m.AppCatalog })))
const AppCreate = lazy(() => import('./pages/AppCreate').then(m => ({ default: m.AppCreate })))
const Agent = lazy(() => import('./pages/Agent').then(m => ({ default: m.Agent })))
const AgentDownloads = lazy(() => import('./pages/AgentDownloads').then(m => ({ default: m.AgentDownloads })))
const MobileApp = lazy(() => import('./pages/MobileApp').then(m => ({ default: m.MobileApp })))
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })))
const UserCreate = lazy(() => import('./pages/UserCreate').then(m => ({ default: m.UserCreate })))
const Audit = lazy(() => import('./pages/Audit').then(m => ({ default: m.Audit })))
const ServerStatus = lazy(() => import('./pages/ServerStatus').then(m => ({ default: m.ServerStatus })))
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })))
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })))
const Mappings = lazy(() => import('./pages/Mappings').then(m => ({ default: m.Mappings })))
const Profiles = lazy(() => import('./pages/Profiles').then(m => ({ default: m.Profiles })))
const Desktops = lazy(() => import('./pages/Desktops').then(m => ({ default: m.Desktops })))
const DesktopDetail = lazy(() => import('./pages/DesktopDetail').then(m => ({ default: m.DesktopDetail })))
const Notebooks = lazy(() => import('./pages/Notebooks').then(m => ({ default: m.Notebooks })))
const NotebookDetail = lazy(() => import('./pages/NotebookDetail').then(m => ({ default: m.NotebookDetail })))
const MobileDevices = lazy(() => import('./pages/MobileDevices').then(m => ({ default: m.MobileDevices })))
const MobileDetail = lazy(() => import('./pages/MobileDetail').then(m => ({ default: m.MobileDetail })))
const Panels = lazy(() => import('./pages/Panels').then(m => ({ default: m.Panels })))
const PanelDetail = lazy(() => import('./pages/PanelDetail').then(m => ({ default: m.PanelDetail })))
const CyberSecurity = lazy(() => import('./pages/CyberSecurity').then(m => ({ default: m.CyberSecurity })))
const DesktopAgentApp = lazy(() => import('./pages/DesktopAgentApp').then(m => ({ default: m.DesktopAgentApp })))
const MobileAgentApp = lazy(() => import('./pages/MobileAgentApp').then(m => ({ default: m.MobileAgentApp })))
const PanelAgentApp = lazy(() => import('./pages/PanelAgentApp').then(m => ({ default: m.PanelAgentApp })))
const IoTAgentApp = lazy(() => import('./pages/IoTAgentApp').then(m => ({ default: m.IoTAgentApp })))
const EquipmentDiagnostics = lazy(() => import('./pages/EquipmentDiagnostics').then(m => ({ default: m.EquipmentDiagnostics })))
const RemoteAccess = lazy(() => import('./pages/RemoteAccess').then(m => ({ default: m.RemoteAccess })))

function PageLoadingFallback() {
  return (
    <div style={{ padding: '24px 32px' }}>
      <TableSkeleton rows={7} columns={4} />
    </div>
  )
}

export function App() {
  const [loggedIn, setLoggedIn] = useState(() => Boolean(authStorage.getToken()))
  const [active, setActive] = useState<PageId>('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [modules, setModules] = useState<ModuleItem[]>(defaultModules)

  const handleToggleModule = (id: string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    )
  }

  const handleAddModule = (newModule: ModuleItem) => {
    setModules((prev) => [...prev, newModule])
  }

  const handleUpdateModule = (updated: ModuleItem) => {
    setModules((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m))
    )
  }

  const handleDeleteModule = (id: string) => {
    setModules((prev) => prev.filter((m) => m.id !== id))
  }

  const content = useMemo(() => {
    switch (active) {
      case 'dashboard':
        return <Dashboard go={setActive} modules={modules} />
      case 'assets':
        return <Assets go={setActive} />
      case 'desktops':
        return <Desktops go={setActive} />
      case 'desktopDetail':
        return <DesktopDetail go={setActive} />
      case 'notebooks':
        return <Notebooks go={setActive} />
      case 'notebookDetail':
        return <NotebookDetail go={setActive} />
      case 'mobiles':
        return <MobileDevices go={setActive} />
      case 'mobileDetail':
        return <MobileDetail go={setActive} />
      case 'panels':
        return <Panels go={setActive} />
      case 'panelDetail':
        return <PanelDetail go={setActive} />
      case 'device':
        return <DeviceDetail go={setActive} />
      case 'totems':
        return <Totems go={setActive} />
      case 'totemDetail':
        return <TotemDetail go={setActive} />
      case 'printers':
        return <Printers go={setActive} />
      case 'printerDetail':
        return <PrinterDetail go={setActive} />
      case 'iot':
        return <IoT go={setActive} />
      case 'iotDetail':
        return <IoTDetail go={setActive} />
      case 'provisioning':
        return <Provisioning go={setActive} />
      case 'provisionQr':
        return <ProvisionQr go={setActive} />
      case 'commands':
        return <Commands />
      case 'diagnostics':
        return <Diagnostics />
      case 'modules':
        return (
          <Modules
            modules={modules}
            onToggleModule={handleToggleModule}
            onAddModule={handleAddModule}
            onUpdateModule={handleUpdateModule}
            onDeleteModule={handleDeleteModule}
            go={setActive}
          />
        )
      case 'policies':
        return <Policies go={setActive} />
      case 'policyCreate':
        return <PolicyCreate go={setActive} />
      case 'groups':
        return <Groups go={setActive} />
      case 'groupDetail':
        return <GroupDetail go={setActive} />
      case 'groupCreate':
        return <GroupCreate go={setActive} />
      case 'groupRules':
        return <GroupRules go={setActive} />
      case 'catalog':
        return <AppCatalog go={setActive} />
      case 'appCreate':
        return <AppCreate go={setActive} />
      case 'agent':
        return <Agent go={setActive} />
      case 'downloads':
        return <AgentDownloads />
      case 'mobile':
        return <MobileApp />
      case 'admin':
        return <Admin go={setActive} />
      case 'userCreate':
        return <UserCreate go={setActive} />
      case 'audit':
        return <Audit />
      case 'server':
        return <ServerStatus />
      case 'reports':
        return <Reports />
      case 'mappings':
        return <Mappings go={setActive} />
      case 'profiles':
        return <Profiles go={setActive} />
      case 'cybersecurity':
        return <CyberSecurity go={setActive} />
      case 'desktopAgent':
        return <DesktopAgentApp go={setActive} />
      case 'mobileAgent':
        return <MobileAgentApp go={setActive} />
      case 'panelAgent':
        return <PanelAgentApp go={setActive} />
      case 'iotAgent':
        return <IoTAgentApp go={setActive} />
      case 'equipmentDiagnostics':
        return <EquipmentDiagnostics go={setActive} />
      case 'remoteAccess':
        return <RemoteAccess go={setActive} />
      case 'profile':
      default:
        return <Profile />
    }
  }, [active, modules])

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />
  }

  return (
    <div className="app-shell">
      <Sidebar
        active={active}
        setActive={setActive}
        open={menuOpen}
        setOpen={setMenuOpen}
        logout={() => {
          authStorage.clearToken()
          setLoggedIn(false)
        }}
        modules={modules}
        userName="Lucas Martins"
        userRole="Super Administrador"
      />
      <div className="app-main">
        <Header
          active={active}
          openMenu={() => setMenuOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <main className="content">
          <ErrorBoundary key={active}>
            <Suspense fallback={<PageLoadingFallback />}>
              {content}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

export default App
