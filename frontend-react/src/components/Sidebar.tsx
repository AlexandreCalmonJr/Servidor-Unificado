import { useMemo } from 'react'
import { Icon } from './Icon'
import { Logo } from './UI'
import type { PageId, NavItem, ModuleItem } from '../types'

export function Sidebar({
  active,
  setActive,
  open,
  setOpen,
  logout,
  modules = [],
  userName = 'Administrador',
  userRole = 'Super Admin',
}: {
  active: PageId
  setActive: (p: PageId) => void
  open: boolean
  setOpen: (v: boolean) => void
  logout: () => void
  modules?: ModuleItem[]
  userName?: string
  userRole?: string
}) {
  // Constrói dinamicamente os itens de navegação respeitando os módulos ATIVOS
  const computedNavItems = useMemo(() => {
    // Mapeamento de status de ativação dos módulos por id
    const isEnabled = (id: string) => {
      const found = modules.find((m) => m.id === id)
      return found ? found.enabled : false
    }

    const items: NavItem[] = [
      { id: 'dashboard', label: 'Visão geral', icon: 'grid' },
    ]

    // DISPOSITIVOS & OPERAÇÃO
    const devItems: NavItem[] = []
    if (isEnabled('assets')) {
      devItems.push({ id: 'assets', label: 'Gestão Geral de Ativos', icon: 'grid', section: 'DISPOSITIVOS & OPERAÇÃO', badge: 289 })
    }
    if (isEnabled('desktops')) {
      devItems.push({ id: 'desktops', label: 'Estações & Desktops', icon: 'server', section: 'DISPOSITIVOS & OPERAÇÃO', badge: 120 })
    }
    if (isEnabled('notebooks')) {
      devItems.push({ id: 'notebooks', label: 'Notebooks & Laptops', icon: 'laptop', section: 'DISPOSITIVOS & OPERAÇÃO', badge: 81 })
    }
    if (isEnabled('mobiles')) {
      devItems.push({ id: 'mobiles', label: 'Smartphones & Tablets', icon: 'phone', section: 'DISPOSITIVOS & OPERAÇÃO', badge: 46 })
    }
    if (isEnabled('panels')) {
      devItems.push({ id: 'panels', label: 'Painéis & Signage', icon: 'blocks', section: 'DISPOSITIVOS & OPERAÇÃO', badge: 14 })
    }
    if (isEnabled('totems')) {
      devItems.push({ id: 'totems', label: 'Totens de Autoatend.', icon: 'totem', section: 'DISPOSITIVOS & OPERAÇÃO', badge: 18 })
    }
    if (isEnabled('printers')) {
      devItems.push({ id: 'printers', label: 'Impressoras & Insumos', icon: 'printer', section: 'DISPOSITIVOS & OPERAÇÃO', badge: 12 })
    }
    if (isEnabled('iot')) {
      devItems.push({ id: 'iot', label: 'Sensores & IoT', icon: 'cpu', section: 'DISPOSITIVOS & OPERAÇÃO', badge: 24 })
    }

    // Se houver itens nesta seção, adiciona o primeiro com a indicação de seção
    if (devItems.length > 0) {
      devItems[0].section = 'DISPOSITIVOS & OPERAÇÃO'
      items.push(...devItems)
    }

    // GERENCIAMENTO
    const mgmtItems: NavItem[] = [
      { id: 'provisioning', label: 'Provisionamento', icon: 'rocket', section: 'GERENCIAMENTO' },
      { id: 'groups', label: 'Grupos inteligentes', icon: 'user' },
    ]

    if (isEnabled('policies')) {
      mgmtItems.push({ id: 'policies', label: 'Políticas', icon: 'shield' })
    }
    if (isEnabled('catalog')) {
      mgmtItems.push({ id: 'catalog', label: 'Catálogo de apps', icon: 'blocks' })
    }

    // A central de Módulos sempre fica visível para o admin gerenciar!
    mgmtItems.push({ id: 'modules', label: 'Módulos', icon: 'blocks' })
    mgmtItems.push({ id: 'profiles', label: 'Perfis MDM', icon: 'sliders' })

    if (isEnabled('commands')) {
      mgmtItems.push({ id: 'commands', label: 'Comandos remotos', icon: 'terminal' })
    }
    if (isEnabled('diagnostics')) {
      mgmtItems.push({ id: 'diagnostics', label: 'Diagnóstico', icon: 'pulse' })
    }
    if (isEnabled('reports')) {
      mgmtItems.push({ id: 'reports', label: 'Relatórios', icon: 'report' })
    }

    items.push(...mgmtItems)

    // SISTEMA
    items.push(
      { id: 'admin', label: 'Administração', icon: 'shield', section: 'SISTEMA' },
      { id: 'mappings', label: 'Mapeamentos', icon: 'mapPin' },
      { id: 'audit', label: 'Auditoria', icon: 'report' },
      { id: 'server', label: 'Status dos servidores', icon: 'server' }
    )

    // DISTRIBUIÇÃO
    const distItems: NavItem[] = [
      { id: 'agent', label: 'Agente desktop', icon: 'agent', section: 'DISTRIBUIÇÃO' },
      { id: 'downloads', label: 'Central downloads', icon: 'download' },
    ]
    if (isEnabled('mobile')) {
      distItems.push({ id: 'mobile', label: 'Aplicativo mobile', icon: 'phone' })
    }
    items.push(...distItems)

    // MÓDULOS CUSTOMIZADOS CRIADOS PELO USUÁRIO (se ativos)
    const customActive = modules.filter((m) => m.isCustom && m.enabled)
    if (customActive.length > 0) {
      customActive.forEach((cm, idx) => {
        items.push({
          id: (cm.pageId || 'modules') as PageId,
          label: cm.name,
          icon: cm.icon,
          section: idx === 0 ? 'MÓDULOS CUSTOMIZADOS' : undefined,
          badge: cm.badge || 'Novo',
        })
      })
    }

    return items
  }, [modules])

  let currentSection = ''

  return (
    <>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <Logo />
          <button
            className="mobile-close"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="workspace-card">
          <span className="workspace-avatar">SU</span>
          <span>
            <strong>Servidor Unificado</strong>
            <small>Console Central MDM</small>
          </span>
          <Icon name="chevron" size={15} />
        </div>

        <nav className="nav">
          {computedNavItems.map((item) => {
            const heading = item.section && item.section !== currentSection
            if (item.section) currentSection = item.section
            return (
              <div key={`${item.id}-${item.label}`}>
                {heading && <p className="nav-section">{item.section}</p>}
                <button
                  className={`nav-item ${active === item.id ? 'active' : ''}`}
                  onClick={() => {
                    setActive(item.id)
                    setOpen(false)
                  }}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {item.badge && <b>{item.badge}</b>}
                </button>
              </div>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <button
            className={`profile-chip ${active === 'profile' ? 'active' : ''}`}
            onClick={() => {
              setActive('profile')
              setOpen(false)
            }}
          >
            <span className="avatar">
              {userName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'AD'}
            </span>
            <span>
              <strong>{userName}</strong>
              <small>{userRole}</small>
            </span>
            <Icon name="chevron" size={15} />
          </button>
          <button className="logout-btn" onClick={logout} title="Sair da conta">
            <Icon name="logout" />
          </button>
        </div>
      </aside>
    </>
  )
}
