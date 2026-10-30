import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status, MetricCard } from '../components/UI'
import type { TotemItem, PageId } from '../types'

const initialTotems: TotemItem[] = [
  {
    id: 'TOT-001',
    unitName: 'Totem Recepção 01',
    code: 'TOT-REC-01',
    location: 'Unidade Central — Entrada Principal',
    status: 'Online',
    tone: 'green',
    os: 'Windows 11 IoT Enterprise',
    uptime: '14d 06h',
    peripherals: { touchScreen: true, thermalPrinter: true, pinpad: true, barcodeScanner: true },
    lastPing: 'Agora',
    cpuTemp: '42 °C',
    ramUsage: '38%',
  },
  {
    id: 'TOT-002',
    unitName: 'Totem Triagem 02',
    code: 'TOT-TRG-02',
    location: 'Ambulatório / Pronto Atendimento',
    status: 'Online',
    tone: 'green',
    os: 'Ubuntu 24.04 Kiosk Edition',
    uptime: '22d 11h',
    peripherals: { touchScreen: true, thermalPrinter: true, pinpad: true, barcodeScanner: true },
    lastPing: 'Agora',
    cpuTemp: '45 °C',
    ramUsage: '44%',
  },
  {
    id: 'TOT-003',
    unitName: 'Totem Pagamento 03',
    code: 'TOT-PAG-03',
    location: 'Praça de Alimentação / Autoatendimento',
    status: 'Alerta',
    tone: 'amber',
    os: 'Windows 10 IoT LTSC',
    uptime: '3d 02h',
    peripherals: { touchScreen: true, thermalPrinter: false, pinpad: true, barcodeScanner: true },
    lastPing: 'Há 2 min',
    cpuTemp: '58 °C',
    ramUsage: '68%',
  },
  {
    id: 'TOT-004',
    unitName: 'Totem Senhas 04',
    code: 'TOT-SNH-04',
    location: 'Agência Sul — Balcão Rápido',
    status: 'Offline',
    tone: 'gray',
    os: 'Android 13 Enterprise Kiosk',
    uptime: '0h',
    peripherals: { touchScreen: false, thermalPrinter: false, pinpad: false, barcodeScanner: false },
    lastPing: 'Há 45 min',
    cpuTemp: '—',
    ramUsage: '—',
  },
]

export function Totems({ go }: { go?: (p: PageId) => void }) {
  const [query, setQuery] = useState('')
  const [totems] = useState<TotemItem[]>(initialTotems)

  const filtered = totems.filter((t) =>
    `${t.unitName} ${t.code} ${t.location} ${t.os}`.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="page-stack">
      <div className="action-row">
        <div>
          <h2>Monitoramento de Totens de Autoatendimento</h2>
          <p>Supervisão operacional de telas touch, pinpads, leitores e impressoras térmicas em tempo real.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" icon="refresh">
            Atualizar Status
          </Button>
          <Button icon="plus" onClick={() => go?.('provisioning')}>
            Novo Totem
          </Button>
        </div>
      </div>

      <section className="metrics-grid">
        <MetricCard
          label="Total de Totens"
          value="18"
          delta="100%"
          detail="cadastrados"
          icon="totem"
          tone="blue"
        />
        <MetricCard
          label="Em Operação Normal"
          value="16"
          delta="88,9%"
          detail="periféricos OK"
          icon="check"
          tone="green"
        />
        <MetricCard
          label="Com Alerta / Falha"
          value="1"
          delta="Papel térmico"
          detail="requer atenção"
          icon="warning"
          tone="amber"
        />
        <MetricCard
          label="Disponibilidade Média"
          value="99,8%"
          delta="30 dias"
          detail="uptime contínuo"
          icon="pulse"
          tone="violet"
        />
      </section>

      <section className="panel table-panel">
        <div className="table-header">
          <label className="search table-search">
            <Icon name="search" />
            <input
              placeholder="Buscar por unidade, código, local ou SO..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <Button variant="secondary" icon="filter">
            Filtros
          </Button>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Totem / Unidade</th>
                <th>Sistema & Hardware</th>
                <th>Periféricos Integrados</th>
                <th>Telemetria</th>
                <th>Uptime</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((totem) => (
                <tr key={totem.id}>
                  <td>
                    <button
                      type="button"
                      className="device-cell device-link"
                      onClick={() => go?.('totemDetail')}
                    >
                      <span>
                        <Icon name="totem" />
                      </span>
                      <div>
                        <strong>{totem.unitName}</strong>
                        <small>{totem.code} · {totem.location}</small>
                      </div>
                    </button>
                  </td>
                  <td>
                    <strong>{totem.os}</strong>
                    <br />
                    <small style={{ color: 'var(--muted)', fontSize: '8px' }}>Último ping: {totem.lastPing}</small>
                  </td>
                  <td>
                    <div className="totem-peripheral-grid">
                      <div className="totem-peripheral" title="Tela Touch">
                        <span style={{ background: totem.peripherals.touchScreen ? 'var(--green)' : 'var(--red)' }} />
                        Touch
                      </div>
                      <div className="totem-peripheral" title="Impressora Térmica">
                        <span style={{ background: totem.peripherals.thermalPrinter ? 'var(--green)' : 'var(--red)' }} />
                        Térmica
                      </div>
                      <div className="totem-peripheral" title="Pinpad / TEF">
                        <span style={{ background: totem.peripherals.pinpad ? 'var(--green)' : 'var(--red)' }} />
                        Pinpad
                      </div>
                      <div className="totem-peripheral" title="Leitor de Barras/QR">
                        <span style={{ background: totem.peripherals.barcodeScanner ? 'var(--green)' : 'var(--red)' }} />
                        Leitor
                      </div>
                    </div>
                  </td>
                  <td>
                    <span>CPU: <strong>{totem.cpuTemp}</strong></span>
                    <br />
                    <span>RAM: <strong>{totem.ramUsage}</strong></span>
                  </td>
                  <td>
                    <strong>{totem.uptime}</strong>
                  </td>
                  <td>
                    <Status tone={totem.tone}>{totem.status}</Status>
                  </td>
                  <td>
                    <button className="card-more" aria-label="Ações do totem">•••</button>
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
