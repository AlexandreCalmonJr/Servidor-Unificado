import { useState, useMemo } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status, MetricCard } from '../components/UI'
import type { PageId, DeviceItem } from '../types'

const initialGeneralDevices: DeviceItem[] = [
  // Notebooks
  { id: 'NVR-MAC-0142', name: 'MacBook Pro 14" M3 Pro', os: 'macOS Sequoia 15.5', owner: 'Mariana Costa (Design)', status: 'Conforme', tone: 'green', seen: 'Agora', category: 'notebook', ip: '10.42.18.119' },
  { id: 'NVR-WIN-0084', name: 'Dell Latitude 7440 Ultrabook', os: 'Windows 11 Pro 23H2', owner: 'Rafael Lima (Comercial)', status: 'Atenção', tone: 'amber', seen: 'Há 8 min', category: 'notebook', ip: '10.42.18.140' },
  { id: 'NVR-WIN-0091', name: 'Lenovo ThinkPad T14 Gen 4', os: 'Windows 11 Enterprise', owner: 'Carla Nogueira (Finanças)', status: 'Conforme', tone: 'green', seen: 'Agora', category: 'notebook', ip: '10.42.18.155' },
  { id: 'NVR-LIN-0004', name: 'Dell XPS 13 Dev Edition', os: 'Ubuntu 24.04 LTS', owner: 'DevOps & Cloud Core', status: 'Conforme', tone: 'green', seen: 'Há 5 min', category: 'notebook', ip: '10.42.18.172' },

  // Desktops & Workstations
  { id: 'DSK-ENG-001', name: 'WS-ENG-CAD01 (Dell Precision 5860)', os: 'Windows 11 Pro for Workstations', owner: 'Felipe Alcantara (Engenharia)', status: 'Conforme', tone: 'green', seen: 'Agora', category: 'desktop', ip: '10.42.10.45' },
  { id: 'DSK-DES-002', name: 'Mac Studio M2 Max (3D Render)', os: 'macOS Sonoma 14.6', owner: 'Studio de Criação & Render', status: 'Conforme', tone: 'green', seen: 'Há 12 min', category: 'desktop', ip: '10.42.10.48' },
  { id: 'DSK-OPE-003', name: 'Dell OptiPlex 7010 Micro', os: 'Windows 11 Pro', owner: 'Backoffice Financeiro', status: 'Conforme', tone: 'green', seen: 'Há 2 min', category: 'desktop', ip: '10.42.10.82' },
  { id: 'DSK-SVR-004', name: 'HP Z4 G5 Workstation', os: 'Debian 12 Bookworm', owner: 'Laboratório de IA & Dados', status: 'Atenção', tone: 'amber', seen: 'Há 18 min', category: 'desktop', ip: '10.42.10.99' },

  // Mobile (Smartphones & Tablets)
  { id: 'MOB-IOS-0031', name: 'iPhone 16 Pro 256GB', os: 'iOS 18.5', owner: 'Sofia Alves (Diretoria)', status: 'Conforme', tone: 'green', seen: 'Há 4 min', category: 'mobile', ip: '10.42.50.88' },
  { id: 'MOB-AND-0015', name: 'Samsung Galaxy S25 Enterprise', os: 'Android 15 (One UI 7)', owner: 'Bruno Rocha (Operações Campo)', status: 'Conforme', tone: 'green', seen: 'Há 15 min', category: 'mobile', ip: '10.42.50.92' },
  { id: 'MOB-TAB-0042', name: 'iPad Pro 11" M4 (Logística)', os: 'iPadOS 18.5', owner: 'Expedição & Centro Logístico', status: 'Conforme', tone: 'green', seen: 'Agora', category: 'mobile', ip: '10.42.50.104' },

  // Painéis Digitais & Signage
  { id: 'PNL-TRI-001', name: 'Painel Triagem & Chamada de Senhas', os: 'Windows 11 IoT (Intel NUC)', owner: 'Prédio Matriz — Térreo', status: 'Conforme', tone: 'green', seen: 'Agora', category: 'panel', ip: '10.42.30.12' },
  { id: 'PNL-REC-002', name: 'Video Wall Institucional 3x3', os: 'NVIDIA Controller Signage', owner: 'Prédio Matriz — Recepção', status: 'Conforme', tone: 'green', seen: 'Agora', category: 'panel', ip: '10.42.30.15' },
  { id: 'PNL-CAFE-003', name: 'Menuboard Digital Cafeteria', os: 'Samsung Tizen SSSP 10', owner: 'Edifício Anexo — 2º Andar', status: 'Conforme', tone: 'green', seen: 'Há 12s', category: 'panel', ip: '10.42.30.18' },

  // Totens de Autoatendimento
  { id: 'TOT-SP-001', name: 'Totem Recepção SP (T-01)', os: 'Linux Embedded / Kiosk', owner: 'Operações Prediais SP', status: 'Conforme', tone: 'green', seen: 'Agora', category: 'totem', ip: '10.42.20.10' },
  { id: 'TOT-RJ-003', name: 'Totem Autoatendimento RJ', os: 'Windows 11 IoT Enterprise', owner: 'Filial Rio de Janeiro', status: 'Atenção', tone: 'amber', seen: 'Há 4 min', category: 'totem', ip: '10.42.20.14' },

  // Impressoras Corporativas
  { id: 'PRN-HP-E877', name: 'HP Color LaserJet E87750', os: 'HP FutureSmart 5.7', owner: 'TI Corporativo (Andar 4)', status: 'Conforme', tone: 'green', seen: 'Agora', category: 'printer', ip: '10.42.4.10' },
  { id: 'PRN-LEX-XC92', name: 'Lexmark XC9235 Finisher', os: 'Lexmark Firmware v7', owner: 'TI Corporativo (Andar 2)', status: 'Atenção', tone: 'amber', seen: 'Há 12 min', category: 'printer', ip: '10.42.4.22' },
]

export function Assets({ go }: { go: (p: PageId) => void }) {
  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'notebook' | 'desktop' | 'mobile' | 'panel' | 'totem' | 'printer'>('all')

  const counts = useMemo(() => {
    return {
      all: 289,
      desktop: 120,
      notebook: 81,
      mobile: 46,
      panel: 14,
      totem: 18,
      printer: 12,
    }
  }, [])

  const filtered = useMemo(() => {
    return initialGeneralDevices.filter((d) => {
      const matchQuery = `${d.name} ${d.owner} ${d.id} ${d.os} ${d.ip || ''}`
        .toLowerCase()
        .includes(query.toLowerCase())

      if (!matchQuery) return false

      if (filterType === 'all') return true
      return d.category === filterType
    })
  }, [query, filterType])

  const handleDeviceClick = (d: DeviceItem) => {
    if (d.category === 'totem') {
      go('totemDetail')
    } else if (d.category === 'printer') {
      go('printerDetail')
    } else if (d.category === 'panel') {
      go('panelDetail')
    } else if (d.category === 'mobile') {
      go('mobileDetail')
    } else if (d.category === 'desktop') {
      go('desktopDetail')
    } else if (d.category === 'notebook') {
      go('notebookDetail')
    } else {
      go('device')
    }
  }

  const getDeviceIcon = (d: DeviceItem) => {
    if (d.category === 'totem') return 'totem'
    if (d.category === 'printer') return 'printer'
    if (d.category === 'panel') return 'blocks'
    if (d.category === 'mobile') return 'phone'
    if (d.category === 'desktop') return 'server'
    return 'laptop'
  }

  const getCategoryLabel = (cat?: string) => {
    switch (cat) {
      case 'desktop': return 'Desktop Fixo'
      case 'notebook': return 'Notebook Móvel'
      case 'mobile': return 'Dispositivo EMM'
      case 'panel': return 'Painel Signage'
      case 'totem': return 'Totem Kiosk'
      case 'printer': return 'Impressora'
      default: return 'Dispositivo Geral'
    }
  }

  return (
    <div className="page-stack">
      {/* Indicadores Consolidados da Frota */}
      <section className="metrics-grid">
        <MetricCard
          label="Total Geral Consolidado"
          value={counts.all}
          icon="grid"
          delta="100%"
          detail="Inventário unificado de 6 módulos"
          tone="blue"
        />
        <MetricCard
          label="Em Conformidade Plena"
          value="274"
          icon="check"
          delta="94.8%"
          detail="da frota ativa"
          tone="green"
        />
        <MetricCard
          label="Requerem Atenção"
          value="11"
          icon="clock"
          delta="Preventivo"
          detail="bateria e suprimentos"
          tone="amber"
        />
        <MetricCard
          label="Críticos / Offline"
          value="4"
          icon="warning"
          delta="Ação imediata"
          detail="intervenção requerida"
          tone="red"
        />
      </section>

      {/* Cartões de Acesso Rápido aos Módulos Especializados */}
      <section className="panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px' }}>Módulos Especializados de Hardware</h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Cada categoria de equipamento possui telemetria dedicada, comandos remotos específicos e gestão avançada.
            </p>
          </div>
          <Button variant="secondary" icon="blocks" onClick={() => go('modules')}>
            Gerenciar Módulos
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
          <div
            onClick={() => go('desktops')}
            style={{
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'border-color 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--accent)' }}><Icon name="server" /></span>
              <strong style={{ fontSize: '15px' }}>{counts.desktop}</strong>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Estações & Desktops</span>
            <small style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Wake-on-LAN e Monitores →</small>
          </div>

          <div
            onClick={() => go('notebooks')}
            style={{
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'border-color 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#0ea5e9' }}><Icon name="laptop" /></span>
              <strong style={{ fontSize: '15px' }}>{counts.notebook}</strong>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Notebooks & Laptops</span>
            <small style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Baterias e BitLocker →</small>
          </div>

          <div
            onClick={() => go('mobiles')}
            style={{
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'border-color 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#10b981' }}><Icon name="phone" /></span>
              <strong style={{ fontSize: '15px' }}>{counts.mobile}</strong>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Smartphones & Tablets</span>
            <small style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Modo Perdido e Wipe →</small>
          </div>

          <div
            onClick={() => go('panels')}
            style={{
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'border-color 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#f59e0b' }}><Icon name="blocks" /></span>
              <strong style={{ fontSize: '15px' }}>{counts.panel}</strong>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Painéis & Signage</span>
            <small style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>HDMI-CEC e Canais →</small>
          </div>

          <div
            onClick={() => go('totems')}
            style={{
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'border-color 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#8b5cf6' }}><Icon name="totem" /></span>
              <strong style={{ fontSize: '15px' }}>{counts.totem}</strong>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Totens Autoatend.</span>
            <small style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Kiosk e Periféricos →</small>
          </div>

          <div
            onClick={() => go('printers')}
            style={{
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'border-color 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#ec4899' }}><Icon name="printer" /></span>
              <strong style={{ fontSize: '15px' }}>{counts.printer}</strong>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Impressoras</span>
            <small style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Toners e Insumos →</small>
          </div>
        </div>
      </section>

      {/* Tabela do Inventário Consolidado */}
      <div className="action-row">
        <div className="segmented">
          <button
            className={filterType === 'all' ? 'active' : ''}
            onClick={() => setFilterType('all')}
          >
            Todos <b>{counts.all}</b>
          </button>
          <button
            className={filterType === 'notebook' ? 'active' : ''}
            onClick={() => setFilterType('notebook')}
          >
            Notebooks <b>{counts.notebook}</b>
          </button>
          <button
            className={filterType === 'desktop' ? 'active' : ''}
            onClick={() => setFilterType('desktop')}
          >
            Desktops <b>{counts.desktop}</b>
          </button>
          <button
            className={filterType === 'mobile' ? 'active' : ''}
            onClick={() => setFilterType('mobile')}
          >
            Mobile <b>{counts.mobile}</b>
          </button>
          <button
            className={filterType === 'panel' ? 'active' : ''}
            onClick={() => setFilterType('panel')}
          >
            Painéis <b>{counts.panel}</b>
          </button>
          <button
            className={filterType === 'totem' ? 'active' : ''}
            onClick={() => setFilterType('totem')}
          >
            Totens <b>{counts.totem}</b>
          </button>
          <button
            className={filterType === 'printer' ? 'active' : ''}
            onClick={() => setFilterType('printer')}
          >
            Impressoras <b>{counts.printer}</b>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button icon="plus" onClick={() => go('provisioning')}>
            Provisionar Novo Ativo
          </Button>
        </div>
      </div>

      <section className="panel table-panel">
        <div className="table-header">
          <label className="search table-search">
            <Icon name="search" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar em todo o inventário por nome, responsável, SO, modelo, IP ou ID..."
            />
          </label>
          <Button variant="secondary" icon="filter">
            Filtros Avançados
          </Button>
          <Button variant="secondary" icon="download">
            Exportar Inventário Geral
          </Button>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  <input type="checkbox" aria-label="Selecionar todos" />
                </th>
                <th>Ativo / Equipamento</th>
                <th>Categoria / Módulo</th>
                <th>Sistema Operacional</th>
                <th>Responsável / Localização</th>
                <th>Endereço IP</th>
                <th>Status Geral</th>
                <th>Telemetria</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td>
                    <input type="checkbox" aria-label={`Selecionar ${d.name}`} />
                  </td>
                  <td>
                    <button
                      className="device-cell device-link"
                      onClick={() => handleDeviceClick(d)}
                      title="Clique para abrir detalhes no módulo correspondente"
                    >
                      <span>
                        <Icon name={getDeviceIcon(d)} />
                      </span>
                      <div>
                        <strong>{d.name}</strong>
                        <small>{d.id}</small>
                      </div>
                    </button>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'var(--surface-sunken)',
                        border: '1px solid var(--border-subtle)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {getCategoryLabel(d.category)}
                    </span>
                  </td>
                  <td>{d.os}</td>
                  <td>{d.owner}</td>
                  <td>
                    <code style={{ fontSize: '12px' }}>{d.ip || '—'}</code>
                  </td>
                  <td>
                    <Status tone={d.tone}>{d.status}</Status>
                  </td>
                  <td>{d.seen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span>
            Exibindo {filtered.length} de {filterType === 'all' ? counts.all : counts[filterType]} ativos cadastrados na frota
          </span>
          <div>
            <button>Anterior</button>
            <button className="current">1</button>
            <button>2</button>
            <button>3</button>
            <button>Próximo</button>
          </div>
        </div>
      </section>
    </div>
  )
}
