import { useState, useMemo } from 'react'
import type { PageId } from './types'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'

// Páginas
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Assets } from './pages/Assets'
import { DeviceDetail } from './pages/DeviceDetail'
import { Totems } from './pages/Totems'
import { TotemDetail } from './pages/TotemDetail'
import { Printers } from './pages/Printers'
import { PrinterDetail } from './pages/PrinterDetail'
import { Provisioning } from './pages/Provisioning'
import { ProvisionQr } from './pages/ProvisionQr'
import { Commands } from './pages/Commands'
import { Diagnostics } from './pages/Diagnostics'
import { Modules } from './pages/Modules'
import { IoT } from './pages/IoT'
import { Policies } from './pages/Policies'
import { PolicyCreate } from './pages/PolicyCreate'
import { Groups } from './pages/Groups'
import { GroupDetail } from './pages/GroupDetail'
import { GroupCreate } from './pages/GroupCreate'
import { GroupRules } from './pages/GroupRules'
import { AppCatalog } from './pages/AppCatalog'
import { AppCreate } from './pages/AppCreate'
import { Agent } from './pages/Agent'
import { AgentDownloads } from './pages/AgentDownloads'
import { MobileApp } from './pages/MobileApp'
import { Admin } from './pages/Admin'
import { UserCreate } from './pages/UserCreate'
import { Audit } from './pages/Audit'
import { ServerStatus } from './pages/ServerStatus'
import { Reports } from './pages/Reports'
import { Profile } from './pages/Profile'
import { Mappings } from './pages/Mappings'
import { Profiles } from './pages/Profiles'
import { Desktops } from './pages/Desktops'
import { DesktopDetail } from './pages/DesktopDetail'
import { Notebooks } from './pages/Notebooks'
import { NotebookDetail } from './pages/NotebookDetail'
import { MobileDevices } from './pages/MobileDevices'
import { MobileDetail } from './pages/MobileDetail'
import { Panels } from './pages/Panels'
import { PanelDetail } from './pages/PanelDetail'
import { defaultModules } from './data/modules'
import type { ModuleItem } from './types'

export function App() {
  const [loggedIn, setLoggedIn] = useState(true)
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
        logout={() => setLoggedIn(false)}
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
        <main className="content">{content}</main>
      </div>
    </div>
  )
}

export default App
