import { useState, useMemo } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'
import type { PageId, DeviceItem } from '../types'

const initialDevices: DeviceItem[] = [
  { id: 'NVR-MAC-0142', name: 'MacBook Pro — Mariana', os: 'macOS 15.5', owner: 'Mariana Costa', status: 'Conforme', tone: 'green', seen: 'Agora', category: 'desktop' },
  { id: 'NVR-WIN-0084', name: 'Dell Latitude 7440', os: 'Windows 11 Pro', owner: 'Rafael Lima', status: 'Atenção', tone: 'amber', seen: 'Há 8 min', category: 'desktop' },
  { id: 'NVR-IOS-0031', name: 'iPhone 16 Pro', os: 'iOS 18.5', owner: 'Sofia Alves', status: 'Conforme', tone: 'green', seen: 'Há 12 min', category: 'mobile' },
  { id: 'NVR-MAC-0139', name: 'Mac mini M2 — Design', os: 'macOS 15.4', owner: 'Equipe de Design', status: 'Crítico', tone: 'red', seen: 'Há 1 h', category: 'desktop' },
  { id: 'NVR-AND-0015', name: 'Samsung Galaxy S25', os: 'Android 15', owner: 'Bruno Rocha', status: 'Conforme', tone: 'green', seen: 'Há 2 h', category: 'mobile' },
  { id: 'NVR-WIN-0091', name: 'ThinkPad T14 Gen 4', os: 'Windows 11', owner: 'Carla Nogueira', status: 'Conforme', tone: 'green', seen: 'Agora', category: 'desktop' },
  { id: 'NVR-LIN-0004', name: 'Dell XPS 13 Dev', os: 'Ubuntu 24.04', owner: 'DevOps Team', status: 'Conforme', tone: 'green', seen: 'Há 5 min', category: 'desktop' },
  { id: 'TOT-SP-001', name: 'Totem Recepção SP (T-01)', os: 'Linux Embedded / Kiosk', owner: 'Operações Prediais SP', status: 'Conforme', tone: 'green', seen: 'Agora', category: 'totem' },
  { id: 'TOT-RJ-003', name: 'Totem Autoatendimento RJ', os: 'Windows 11 IoT Enterprise', owner: 'Filial Rio de Janeiro', status: 'Atenção', tone: 'amber', seen: 'Há 4 min', category: 'totem' },
  { id: 'PRN-HP-E877', name: 'HP Color LaserJet E87750', os: 'HP FutureSmart 5.7', owner: 'TI Corporativo (Andar 4)', status: 'Conforme', tone: 'green', seen: 'Agora', category: 'printer' },
  { id: 'PRN-LEX-XC92', name: 'Lexmark XC9235 Finisher', os: 'Lexmark Firmware v7', owner: 'TI Corporativo (Andar 2)', status: 'Atenção', tone: 'amber', seen: 'Há 12 min', category: 'printer' },
]

export function Assets({ go }: { go: (p: PageId) => void }) {
  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'desktop' | 'mobile' | 'totem' | 'printer'>('all')

  const filtered = useMemo(() => {
    return initialDevices.filter((d) => {
      const matchQuery = `${d.name} ${d.owner} ${d.id} ${d.os}`
        .toLowerCase()
        .includes(query.toLowerCase())

      if (!matchQuery) return false

      if (filterType === 'desktop') return d.category === 'desktop'
      if (filterType === 'mobile') return d.category === 'mobile'
      if (filterType === 'totem') return d.category === 'totem'
      if (filterType === 'printer') return d.category === 'printer'
      return true
    })
  }, [query, filterType])

  const counts = useMemo(() => {
    return {
      all: 289,
      desktop: 201,
      mobile: 46,
      totem: 18,
      printer: 24,
    }
  }, [])

  const handleDeviceClick = (d: DeviceItem) => {
    if (d.category === 'totem') {
      go('totemDetail')
    } else if (d.category === 'printer') {
      go('printerDetail')
    } else {
      go('device')
    }
  }

  const getDeviceIcon = (d: DeviceItem) => {
    if (d.category === 'totem') return 'totem'
    if (d.category === 'printer') return 'printer'
    if (d.category === 'mobile') return 'phone'
    return 'laptop'
  }

  return (
    <div className="page-stack">
      <div className="action-row">
        <div className="segmented">
          <button
            className={filterType === 'all' ? 'active' : ''}
            onClick={() => setFilterType('all')}
          >
            Todos <b>{counts.all}</b>
          </button>
          <button
            className={filterType === 'desktop' ? 'active' : ''}
            onClick={() => setFilterType('desktop')}
          >
            Computadores <b>{counts.desktop}</b>
          </button>
          <button
            className={filterType === 'mobile' ? 'active' : ''}
            onClick={() => setFilterType('mobile')}
          >
            Mobile <b>{counts.mobile}</b>
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
            Adicionar ativo
          </Button>
        </div>
      </div>

      <section className="mini-metrics">
        <div>
          <span className="mini-icon green">
            <Icon name="check" />
          </span>
          <p>
            <strong>274</strong>Conformes
          </p>
        </div>
        <div>
          <span className="mini-icon amber">
            <Icon name="clock" />
          </span>
          <p>
            <strong>11</strong>Com atenção
          </p>
        </div>
        <div>
          <span className="mini-icon red">
            <Icon name="warning" />
          </span>
          <p>
            <strong>4</strong>Críticos
          </p>
        </div>
        <div>
          <span className="mini-icon gray">
            <Icon name="laptop" />
          </span>
          <p>
            <strong>5</strong>Offline
          </p>
        </div>
      </section>

      <section className="panel table-panel">
        <div className="table-header">
          <label className="search table-search">
            <Icon name="search" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, responsável, SO, modelo ou ID..."
            />
          </label>
          <Button variant="secondary" icon="filter">
            Filtros
          </Button>
          <Button variant="secondary" icon="download">
            Exportar CSV
          </Button>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  <input type="checkbox" aria-label="Selecionar todos" />
                </th>
                <th>Ativo / Dispositivo</th>
                <th>Módulo / Sistema</th>
                <th>Responsável / Localização</th>
                <th>Status</th>
                <th>Última telemetria</th>
                <th />
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
                  <td>{d.os}</td>
                  <td>{d.owner}</td>
                  <td>
                    <Status tone={d.tone}>{d.status}</Status>
                  </td>
                  <td>{d.seen}</td>
                  <td>
                    <button
                      className="card-more"
                      aria-label="Opções"
                      onClick={() => handleDeviceClick(d)}
                      title="Abrir ficha detalhada"
                    >
                      •••
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span>Exibindo 1–{filtered.length} de {filterType === 'all' ? counts.all : counts[filterType]} ativos cadastrados</span>
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
