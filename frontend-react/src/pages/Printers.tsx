import { useState, useMemo } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status, MetricCard } from '../components/UI'
import type { PrinterItem, PageId } from '../types'

const initialPrinters: PrinterItem[] = [
  {
    id: 'PRN-001',
    name: 'HP LaserJet Enterprise M507',
    model: 'LaserJet M507x',
    ip: '10.42.20.15',
    location: 'Recepção Principal · Térreo',
    status: 'Operacional',
    tone: 'green',
    blackToner: 78,
    cyanToner: 0,
    magentaToner: 0,
    yellowToner: 0,
    drumLife: 89,
    paperStatus: 'Normal',
    queueCount: 0,
    totalPages: 48920,
    lastCheck: 'Agora',
  },
  {
    id: 'PRN-002',
    name: 'Canon imageRUNNER ADVANCE DX',
    model: 'C3835i Color',
    ip: '10.42.20.22',
    location: 'Design & Marketing · 3º Andar',
    status: 'Toner Baixo',
    tone: 'amber',
    blackToner: 14,
    cyanToner: 42,
    magentaToner: 65,
    yellowToner: 58,
    drumLife: 74,
    paperStatus: 'Normal',
    queueCount: 2,
    totalPages: 112450,
    lastCheck: 'Há 4 min',
  },
  {
    id: 'PRN-003',
    name: 'Brother HL-L6400DW',
    model: 'HL-L6400DW Mono',
    ip: '10.42.20.30',
    location: 'Departamento Financeiro · 2º Andar',
    status: 'Operacional',
    tone: 'green',
    blackToner: 62,
    cyanToner: 0,
    magentaToner: 0,
    yellowToner: 0,
    drumLife: 92,
    paperStatus: 'Normal',
    queueCount: 1,
    totalPages: 87310,
    lastCheck: 'Há 12 min',
  },
  {
    id: 'PRN-004',
    name: 'Epson WorkForce Pro WF-C579R',
    model: 'WF-C579R Business',
    ip: '10.42.20.45',
    location: 'Almoxarifado & Logística',
    status: 'Alerta',
    tone: 'red',
    blackToner: 8,
    cyanToner: 12,
    magentaToner: 18,
    yellowToner: 9,
    drumLife: 45,
    paperStatus: 'Baixo',
    queueCount: 4,
    totalPages: 34100,
    lastCheck: 'Há 18 min',
  },
]

export function Printers({ go }: { go?: (p: PageId) => void }) {
  const [query, setQuery] = useState('')
  const [syncing, setSyncing] = useState(false)

  const filtered = useMemo(() => {
    return initialPrinters.filter((p) =>
      `${p.name} ${p.model} ${p.location} ${p.ip}`.toLowerCase().includes(query.toLowerCase())
    )
  }, [query])

  const handleSync = () => {
    setSyncing(true)
    setTimeout(() => setSyncing(false), 900)
  }

  return (
    <div className="page-stack">
      <div className="action-row">
        <div>
          <h2>Monitoramento de Impressoras e Insumos</h2>
          <p>Supervisão SNMP em tempo real de toners, cilindros, bandejas de papel e contadores.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" icon="refresh" onClick={handleSync}>
            {syncing ? 'Sincronizando...' : 'Sincronizar SNMP'}
          </Button>
          <Button icon="plus">Adicionar Impressora</Button>
        </div>
      </div>

      <section className="metrics-grid">
        <MetricCard
          label="Total de impressoras"
          value={initialPrinters.length}
          delta="100%"
          detail="monitoradas"
          icon="printer"
          tone="blue"
        />
        <MetricCard
          label="Operacionais"
          value="3"
          delta="75%"
          detail="níveis adequados"
          icon="check"
          tone="green"
        />
        <MetricCard
          label="Alertas de suprimento"
          value="2"
          delta="Toner < 15%"
          detail="requer reposição"
          icon="warning"
          tone="amber"
        />
        <MetricCard
          label="Páginas este mês"
          value="282.780"
          delta="+8,4%"
          detail="vs. mês anterior"
          icon="report"
          tone="violet"
        />
      </section>

      <section className="panel table-panel">
        <div className="table-header">
          <label className="search table-search">
            <Icon name="search" />
            <input
              placeholder="Buscar por impressora, modelo, IP ou local..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <Button variant="secondary" icon="filter">
            Filtros
          </Button>
          <Button variant="secondary" icon="download">
            Relatório de Insumos
          </Button>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Impressora & Local</th>
                <th>IP & Comunicação</th>
                <th>Níveis de Toner</th>
                <th>Bandeja Papel</th>
                <th>Cilindro</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((prn) => (
                <tr key={prn.id}>
                  <td>
                    <button
                      type="button"
                      className="device-cell device-link"
                      onClick={() => go?.('printerDetail')}
                    >
                      <span>
                        <Icon name="printer" />
                      </span>
                      <div>
                        <strong>{prn.name}</strong>
                        <small>{prn.location} · {prn.model}</small>
                      </div>
                    </button>
                  </td>
                  <td>
                    <strong>{prn.ip}</strong>
                    <br />
                    <small style={{ color: 'var(--muted)', fontSize: '8px' }}>SNMP v2c · {prn.lastCheck}</small>
                  </td>
                  <td style={{ minWidth: '180px' }}>
                    <div className="supply-bars">
                      <div className="supply-item">
                        <div>
                          <span>K</span>
                          <strong>{prn.blackToner}%</strong>
                        </div>
                        <div className="supply-bar">
                          <i
                            className="supply-k"
                            style={{
                              width: `${prn.blackToner}%`,
                              background: prn.blackToner <= 15 ? 'var(--red)' : '#1a1e2d',
                            }}
                          />
                        </div>
                      </div>
                      {prn.cyanToner > 0 && (
                        <>
                          <div className="supply-item">
                            <div>
                              <span>C</span>
                              <strong>{prn.cyanToner}%</strong>
                            </div>
                            <div className="supply-bar">
                              <i className="supply-c" style={{ width: `${prn.cyanToner}%` }} />
                            </div>
                          </div>
                          <div className="supply-item">
                            <div>
                              <span>M</span>
                              <strong>{prn.magentaToner}%</strong>
                            </div>
                            <div className="supply-bar">
                              <i className="supply-m" style={{ width: `${prn.magentaToner}%` }} />
                            </div>
                          </div>
                          <div className="supply-item">
                            <div>
                              <span>Y</span>
                              <strong>{prn.yellowToner}%</strong>
                            </div>
                            <div className="supply-bar">
                              <i className="supply-y" style={{ width: `${prn.yellowToner}%` }} />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td>
                    <Status tone={prn.paperStatus === 'Normal' ? 'green' : 'amber'}>
                      {prn.paperStatus}
                    </Status>
                  </td>
                  <td>
                    <strong>{prn.drumLife}%</strong>
                  </td>
                  <td>
                    <Status tone={prn.tone}>{prn.status}</Status>
                  </td>
                  <td>
                    <button className="card-more" aria-label="Ações da impressora">•••</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
