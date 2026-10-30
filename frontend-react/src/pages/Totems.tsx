import { useState, useMemo } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status, MetricCard } from '../components/UI'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'Online' | 'Alerta' | 'Offline'>('all')
  const [totems, setTotems] = useState<TotemItem[]>(initialTotems)
  const [refreshing, setRefreshing] = useState(false)
  const toast = useToast()

  // Modal de Novo Totem
  const [newTotemModalOpen, setNewTotemModalOpen] = useState(false)
  const [formCode, setFormCode] = useState('')
  const [formUnitName, setFormUnitName] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formOs, setFormOs] = useState('Windows 11 IoT Enterprise')

  const handleRefresh = () => {
    setRefreshing(true)
    toast.info('Sondando telemetria e heartbeat dos 18 totens da rede...')
    setTimeout(() => {
      setRefreshing(false)
      toast.success('Heartbeat concluído: 16 totens operacionais, 1 alerta de bobina.')
    }, 1000)
  }

  const handleExportCsv = () => {
    toast.success('Relatório operacional de totens e periféricos exportado (CSV)!')
  }

  const handleSaveTotem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formCode.trim() || !formUnitName.trim()) {
      toast.warning('Código e Nome do Totem são obrigatórios.')
      return
    }

    const newTotem: TotemItem = {
      id: `TOT-00${totems.length + 1}`,
      code: formCode.toUpperCase(),
      unitName: formUnitName,
      location: formLocation || 'Geral',
      status: 'Online',
      tone: 'green',
      os: formOs,
      uptime: '0h',
      peripherals: { touchScreen: true, thermalPrinter: true, pinpad: true, barcodeScanner: true },
      lastPing: 'Agora',
      cpuTemp: '36 °C',
      ramUsage: '28%',
    }

    setTotems([newTotem, ...totems])
    setNewTotemModalOpen(false)
    toast.success(`Totem ${formCode} cadastrado com sucesso!`)
  }

  const filtered = useMemo(() => {
    return totems.filter((t) => {
      const matchSearch = `${t.unitName} ${t.code} ${t.location} ${t.os}`
        .toLowerCase()
        .includes(query.toLowerCase())
      if (!matchSearch) return false
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      return true
    })
  }, [totems, query, statusFilter])

  return (
    <div className="page-stack">
      {/* Cabeçalho */}
      <div className="action-row">
        <div>
          <p className="eyebrow">AUTOATENDIMENTO & TERMINAIS</p>
          <h2>Monitoramento de Totens de Autoatendimento</h2>
          <p>Supervisão operacional de telas touch, pinpads, leitores e impressoras térmicas em tempo real.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button variant="secondary" icon="download" onClick={handleExportCsv}>
            Exportar CSV
          </Button>
          <Button variant="secondary" icon="refresh" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Sondando...' : 'Atualizar Status'}
          </Button>
          <Button icon="plus" onClick={() => setNewTotemModalOpen(true)}>
            Novo Totem
          </Button>
        </div>
      </div>

      {/* Métricas Principais */}
      <section className="metrics-grid">
        <MetricCard
          label="Total de Totens"
          value={totems.length}
          delta="100%"
          detail="cadastrados"
          icon="totem"
          tone="blue"
        />
        <MetricCard
          label="Em Operação Normal"
          value={totems.filter((t) => t.status === 'Online').length}
          delta="88,9%"
          detail="periféricos OK"
          icon="check"
          tone="green"
        />
        <MetricCard
          label="Com Alerta / Falha"
          value={totems.filter((t) => t.status === 'Alerta').length}
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

      {/* Painel da Tabela de Totens */}
      <section className="panel table-panel">
        <div className="table-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <label className="search table-search" style={{ flex: '1 1 280px' }}>
            <Icon name="search" />
            <input
              placeholder="Buscar por unidade, código, local ou SO..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <div className="segmented" style={{ border: 0 }}>
            <button
              className={statusFilter === 'all' ? 'active' : ''}
              onClick={() => setStatusFilter('all')}
            >
              Todos ({totems.length})
            </button>
            <button
              className={statusFilter === 'Online' ? 'active' : ''}
              onClick={() => setStatusFilter('Online')}
            >
              Online ({totems.filter((t) => t.status === 'Online').length})
            </button>
            <button
              className={statusFilter === 'Alerta' ? 'active' : ''}
              onClick={() => setStatusFilter('Alerta')}
            >
              Alerta ({totems.filter((t) => t.status === 'Alerta').length})
            </button>
            <button
              className={statusFilter === 'Offline' ? 'active' : ''}
              onClick={() => setStatusFilter('Offline')}
            >
              Offline ({totems.filter((t) => t.status === 'Offline').length})
            </button>
          </div>
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
                      <span style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
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
                    <small style={{ color: 'var(--muted)', fontSize: '10px' }}>Último ping: {totem.lastPing}</small>
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
                    <span style={{ fontSize: '11px' }}>CPU: <strong>{totem.cpuTemp}</strong></span>
                    <br />
                    <span style={{ fontSize: '11px' }}>RAM: <strong>{totem.ramUsage}</strong></span>
                  </td>
                  <td>
                    <strong>{totem.uptime}</strong>
                  </td>
                  <td>
                    <Status tone={totem.tone}>{totem.status}</Status>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL: NOVO TOTEM */}
      <Modal
        isOpen={newTotemModalOpen}
        onClose={() => setNewTotemModalOpen(false)}
        title="Cadastrar Novo Totem de Autoatendimento"
        subtitle="Registra o terminal na rede com provisionamento de imagem Kiosk"
        icon="totem"
        maxWidth={540}
      >
        <form onSubmit={handleSaveTotem} className="page-stack">
          <div className="form-grid">
            <label className="field">
              <span>Código de Identificação</span>
              <input
                type="text"
                placeholder="Ex: TOT-REC-05"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Nome Amigável</span>
              <input
                type="text"
                placeholder="Ex: Totem Entrada Sul"
                value={formUnitName}
                onChange={(e) => setFormUnitName(e.target.value)}
                required
              />
            </label>

            <label className="field full">
              <span>Localização Fisiográfica / Setor</span>
              <input
                type="text"
                placeholder="Ex: Matriz — Hall de Elevadores (Térreo)"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                required
              />
            </label>

            <label className="field full">
              <span>Sistema Operacional Kiosk</span>
              <select
                value={formOs}
                onChange={(e) => setFormOs(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
              >
                <option value="Windows 11 IoT Enterprise">Windows 11 IoT Enterprise (Edge Kiosk)</option>
                <option value="Windows 10 IoT LTSC">Windows 10 IoT Enterprise LTSC</option>
                <option value="Ubuntu 24.04 Kiosk Edition">Ubuntu 24.04 LTS Kiosk Edition</option>
                <option value="Android 13 Enterprise Kiosk">Android 13 Enterprise Kiosk (AOSP)</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <Button variant="secondary" onClick={() => setNewTotemModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Cadastrar Terminal</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
