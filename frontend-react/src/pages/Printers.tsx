import { useState, useMemo } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status, MetricCard } from '../components/UI'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import type { PrinterItem, PageId } from '../types'

interface StockSupply {
  id: string
  model: string
  color: 'Black' | 'Cyan' | 'Magenta' | 'Yellow' | 'Drum'
  compatiblePrinters: string
  inStock: number
  minStock: number
  unitLocation: string
  status: 'safe' | 'low' | 'empty'
}

interface PrinterAlert {
  id: string
  printerName: string
  location: string
  type: 'toner' | 'paper' | 'door' | 'snmp'
  severity: 'critical' | 'warning' | 'info'
  message: string
  time: string
  resolved: boolean
}

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
  const [subTab, setSubTab] = useState<'list' | 'stock' | 'alerts' | 'history'>('list')
  const [query, setQuery] = useState('')
  const [syncing, setSyncing] = useState(false)
  const toast = useToast()

  // Impressoras
  const [printers, setPrinters] = useState<PrinterItem[]>(initialPrinters)

  // Estoque de Insumos
  const [stockList, setStockList] = useState<StockSupply[]>([
    {
      id: 'stk-1',
      model: 'HP 89A (CF289A)',
      color: 'Black',
      compatiblePrinters: 'HP LaserJet M507, M528 MFP',
      inStock: 6,
      minStock: 2,
      unitLocation: 'Almoxarifado Central — Prateleira B3',
      status: 'safe',
    },
    {
      id: 'stk-2',
      model: 'Canon NPG-84 Toner Black',
      color: 'Black',
      compatiblePrinters: 'Canon iR ADV DX C3835i / C3830i',
      inStock: 1,
      minStock: 3,
      unitLocation: 'Almoxarifado Central — Prateleira C1',
      status: 'low',
    },
    {
      id: 'stk-3',
      model: 'Canon NPG-84 Toner Cyan',
      color: 'Cyan',
      compatiblePrinters: 'Canon iR ADV DX C3835i / C3830i',
      inStock: 4,
      minStock: 2,
      unitLocation: 'Almoxarifado Central — Prateleira C1',
      status: 'safe',
    },
    {
      id: 'stk-4',
      model: 'Brother TN-890 Ultra High Yield',
      color: 'Black',
      compatiblePrinters: 'Brother HL-L6400DW / MFC-L6900DW',
      inStock: 5,
      minStock: 2,
      unitLocation: 'Armário TI — 2º Andar',
      status: 'safe',
    },
    {
      id: 'stk-5',
      model: 'Epson T942 Black XXL Ink Pack',
      color: 'Black',
      compatiblePrinters: 'Epson WorkForce WF-C579R',
      inStock: 0,
      minStock: 2,
      unitLocation: 'Almoxarifado Logística',
      status: 'empty',
    },
    {
      id: 'stk-6',
      model: 'Unidade de Cilindro DR-890',
      color: 'Drum',
      compatiblePrinters: 'Brother HL-L6400DW',
      inStock: 2,
      minStock: 1,
      unitLocation: 'Armário TI — 2º Andar',
      status: 'safe',
    },
  ])

  // Central de Alertas
  const [alerts, setAlerts] = useState<PrinterAlert[]>([
    {
      id: 'alt-1',
      printerName: 'Epson WorkForce Pro WF-C579R',
      location: 'Almoxarifado & Logística (10.42.20.45)',
      type: 'toner',
      severity: 'critical',
      message: 'Bolsa de tinta preta (Black XXL) com nível crítico (8%). Risco iminente de parada.',
      time: 'Há 18 min',
      resolved: false,
    },
    {
      id: 'alt-2',
      printerName: 'Canon imageRUNNER ADVANCE DX',
      location: 'Design & Marketing · 3º Andar (10.42.20.22)',
      type: 'toner',
      severity: 'warning',
      message: 'Toner Preto em 14%. Estoque local possui apenas 1 unidade disponível.',
      time: 'Há 32 min',
      resolved: false,
    },
    {
      id: 'alt-3',
      printerName: 'HP LaserJet Enterprise M507',
      location: 'Recepção Principal · Térreo (10.42.20.15)',
      type: 'paper',
      severity: 'info',
      message: 'Bandeja 2 reabastecida com 500 folhas Chamex A4 75g.',
      time: 'Hoje, 09:15',
      resolved: true,
    },
  ])

  // Modais
  const [addPrinterModalOpen, setAddPrinterModalOpen] = useState(false)
  const [formName, setFormName] = useState('')
  const [formModel, setFormModel] = useState('')
  const [formIp, setFormIp] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formSnmpCommunity, setFormSnmpCommunity] = useState('public')

  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [stockTarget, setStockTarget] = useState<StockSupply | null>(null)
  const [stockAction, setStockAction] = useState<'in' | 'out'>('in')
  const [stockQuantity, setStockQuantity] = useState(1)

  const handleSync = () => {
    setSyncing(true)
    toast.info('Sondando impressoras via SNMP v2c/v3...')
    setTimeout(() => {
      setSyncing(false)
      toast.success('Telemetria SNMP de toners, papéis e contadores atualizada com sucesso!')
    }, 1100)
  }

  const handleDiscoverNetwork = () => {
    toast.info('Iniciando varredura ARP/SNMP nas sub-redes corporativas (10.42.20.0/24)...')
    setTimeout(() => {
      toast.success('Varredura concluída: 4 impressoras homologadas ativas na rede.')
    }, 1500)
  }

  const handleSavePrinter = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formIp.trim()) {
      toast.warning('Nome e IP da impressora são obrigatórios.')
      return
    }

    const newPrn: PrinterItem = {
      id: `PRN-00${printers.length + 1}`,
      name: formName,
      model: formModel || 'Impressora de Rede',
      ip: formIp,
      location: formLocation || 'Geral',
      status: 'Operacional',
      tone: 'green',
      blackToner: 100,
      cyanToner: 0,
      magentaToner: 0,
      yellowToner: 0,
      drumLife: 100,
      paperStatus: 'Normal',
      queueCount: 0,
      totalPages: 0,
      lastCheck: 'Agora',
    }

    setPrinters([newPrn, ...printers])
    setAddPrinterModalOpen(false)
    toast.success(`Impressora "${formName}" cadastrada e monitoramento SNMP iniciado!`)
  }

  const handleStockMovement = (e: React.FormEvent) => {
    e.preventDefault()
    if (!stockTarget) return

    const diff = stockAction === 'in' ? stockQuantity : -stockQuantity
    const newQty = Math.max(0, stockTarget.inStock + diff)
    const newStatus: 'safe' | 'low' | 'empty' =
      newQty === 0 ? 'empty' : newQty <= stockTarget.minStock ? 'low' : 'safe'

    setStockList((prev) =>
      prev.map((s) =>
        s.id === stockTarget.id ? { ...s, inStock: newQty, status: newStatus } : s
      )
    )

    setStockModalOpen(false)
    toast.success(
      `Movimentação registrada: ${stockAction === 'in' ? 'Entrada' : 'Baixa'} de ${stockQuantity} un de ${stockTarget.model}. Estoque atual: ${newQty} un.`
    )
  }

  const handleResolveAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, resolved: true } : a))
    )
    toast.success('Alerta de impressão reconhecido e arquivado com sucesso!')
  }

  const filteredPrinters = useMemo(() => {
    return printers.filter((p) =>
      `${p.name} ${p.model} ${p.location} ${p.ip}`.toLowerCase().includes(query.toLowerCase())
    )
  }, [printers, query])

  return (
    <div className="page-stack">
      {/* Cabeçalho */}
      <div className="action-row">
        <div>
          <p className="eyebrow">MONITORAMENTO & SUPRIMENTOS</p>
          <h2>Monitoramento de Impressoras e Insumos</h2>
          <p>Supervisão SNMP em tempo real de toners, cilindros, bandejas de papel e contadores.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button variant="secondary" icon="search" onClick={handleDiscoverNetwork}>
            Descobrir na Rede
          </Button>
          <Button variant="secondary" icon="refresh" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Sincronizando...' : 'Sincronizar SNMP'}
          </Button>
          <Button icon="plus" onClick={() => setAddPrinterModalOpen(true)}>
            Adicionar Impressora
          </Button>
        </div>
      </div>

      {/* Métricas Principais */}
      <section className="metrics-grid">
        <MetricCard
          label="Total de impressoras"
          value={printers.length}
          delta="100%"
          detail="monitoradas"
          icon="printer"
          tone="blue"
        />
        <MetricCard
          label="Operacionais"
          value={printers.filter((p) => p.status === 'Operacional').length}
          delta="75%"
          detail="níveis adequados"
          icon="check"
          tone="green"
        />
        <MetricCard
          label="Alertas de suprimento"
          value={alerts.filter((a) => !a.resolved).length}
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

      {/* Barra de Abas do Módulo de Impressoras */}
      <div className="detail-tabs">
        <button
          className={subTab === 'list' ? 'active' : ''}
          onClick={() => setSubTab('list')}
        >
          Frota de Impressoras ({printers.length})
        </button>
        <button
          className={subTab === 'stock' ? 'active' : ''}
          onClick={() => setSubTab('stock')}
        >
          Estoque de Insumos & Toners ({stockList.length})
        </button>
        <button
          className={subTab === 'alerts' ? 'active' : ''}
          onClick={() => setSubTab('alerts')}
        >
          Central de Alertas ({alerts.filter((a) => !a.resolved).length})
        </button>
        <button
          className={subTab === 'history' ? 'active' : ''}
          onClick={() => setSubTab('history')}
        >
          Histórico & Contadores
        </button>
      </div>

      {/* ABA 1: LISTA DE IMPRESSORAS */}
      {subTab === 'list' && (
        <section className="panel table-panel">
          <div className="table-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
            <label className="search table-search" style={{ flex: '1 1 280px' }}>
              <Icon name="search" />
              <input
                placeholder="Buscar por impressora, modelo, IP ou local..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <Button
              variant="secondary"
              icon="download"
              onClick={() => toast.success('Relatório de suprimentos e contadores exportado (CSV)!')}
            >
              Exportar CSV
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
                </tr>
              </thead>
              <tbody>
                {filteredPrinters.map((prn) => (
                  <tr key={prn.id}>
                    <td>
                      <button
                        type="button"
                        className="device-cell device-link"
                        onClick={() => go?.('printerDetail')}
                      >
                        <span style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
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
                      <small style={{ color: 'var(--muted)', fontSize: '10px' }}>SNMP v2c · {prn.lastCheck}</small>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ABA 2: ESTOQUE DE INSUMOS */}
      {subTab === 'stock' && (
        <section className="page-stack">
          <div className="panel table-panel">
            <div className="table-header" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '14px', margin: 0 }}>Almoxarifado & Controle de Estoque de Cartuchos</h3>
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '3px 0 0' }}>
                  Acompanhe a disponibilidade física de toners e cilindros para reposição imediata
                </p>
              </div>
              <Button
                variant="secondary"
                icon="plus"
                onClick={() => {
                  setStockTarget(stockList[0])
                  setStockAction('in')
                  setStockQuantity(2)
                  setStockModalOpen(true)
                }}
              >
                Registrar Movimentação
              </Button>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Modelo do Insumo / Cartucho</th>
                    <th>Cor / Tipo</th>
                    <th>Equipamentos Compatíveis</th>
                    <th>Localização no Almoxarifado</th>
                    <th>Estoque Atual</th>
                    <th>Mínimo Alerta</th>
                    <th>Situação</th>
                    <th style={{ textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {stockList.map((stk) => (
                    <tr key={stk.id}>
                      <td>
                        <strong>{stk.model}</strong>
                      </td>
                      <td>
                        <span
                          className="badge-tag"
                          style={{
                            background:
                              stk.color === 'Black'
                                ? '#222'
                                : stk.color === 'Cyan'
                                ? '#0284c7'
                                : stk.color === 'Magenta'
                                ? '#db2777'
                                : stk.color === 'Yellow'
                                ? '#ca8a04'
                                : '#4f46e5',
                            color: '#fff',
                          }}
                        >
                          {stk.color}
                        </span>
                      </td>
                      <td>
                        <small>{stk.compatiblePrinters}</small>
                      </td>
                      <td>{stk.unitLocation}</td>
                      <td>
                        <strong style={{ fontSize: '14px' }}>{stk.inStock} un</strong>
                      </td>
                      <td>{stk.minStock} un</td>
                      <td>
                        <Status
                          tone={
                            stk.status === 'safe'
                              ? 'green'
                              : stk.status === 'low'
                              ? 'amber'
                              : 'red'
                          }
                        >
                          {stk.status === 'safe'
                            ? 'Estoque Seguro'
                            : stk.status === 'low'
                            ? 'Estoque Baixo'
                            : 'Esgotado'}
                        </Status>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setStockTarget(stk)
                            setStockAction('out')
                            setStockQuantity(1)
                            setStockModalOpen(true)
                          }}
                        >
                          Baixa
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ABA 3: CENTRAL DE ALERTAS */}
      {subTab === 'alerts' && (
        <section className="page-stack">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {alerts.map((alt) => (
              <article
                key={alt.id}
                className="panel"
                style={{
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  borderLeft: `4px solid ${
                    alt.severity === 'critical'
                      ? 'var(--red)'
                      : alt.severity === 'warning'
                      ? 'var(--amber)'
                      : 'var(--primary)'
                  }`,
                  opacity: alt.resolved ? 0.6 : 1,
                }}
              >
                <span
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    display: 'grid',
                    placeItems: 'center',
                    background:
                      alt.severity === 'critical'
                        ? 'var(--red-soft)'
                        : alt.severity === 'warning'
                        ? 'var(--amber-soft)'
                        : 'var(--primary-soft)',
                    color:
                      alt.severity === 'critical'
                        ? 'var(--red)'
                        : alt.severity === 'warning'
                        ? 'var(--amber)'
                        : 'var(--primary)',
                  }}
                >
                  <Icon name="warning" size={20} />
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{alt.printerName}</strong>
                    <Status
                      tone={
                        alt.severity === 'critical'
                          ? 'red'
                          : alt.severity === 'warning'
                          ? 'amber'
                          : 'blue'
                      }
                    >
                      {alt.severity === 'critical' ? 'Crítico' : alt.severity === 'warning' ? 'Alerta' : 'Info'}
                    </Status>
                    <small style={{ color: 'var(--muted)', marginLeft: 'auto' }}>{alt.time}</small>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--ink)', margin: '4px 0 2px' }}>
                    {alt.message}
                  </p>
                  <small style={{ color: 'var(--muted)' }}>Localização: {alt.location}</small>
                </div>

                {!alt.resolved ? (
                  <Button variant="secondary" onClick={() => handleResolveAlert(alt.id)}>
                    Reconhecer
                  </Button>
                ) : (
                  <Status tone="green">Resolvido</Status>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ABA 4: HISTÓRICO E CONTADORES CONSOLIDADOS */}
      {subTab === 'history' && (
        <section className="tab-content-grid">
          <div className="tab-full-stack">
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3 className="card-section-title">Contadores Globais de Volume de Impressão</h3>
                  <p className="card-section-desc">Auditoria agregada de páginas impressas por tecnologia e duplex</p>
                </div>
              </div>

              <div className="resource-grid">
                <div>
                  <div>
                    <span>Impressões Monocromáticas (P&B)</span>
                    <strong>218.420 páginas (77%)</strong>
                  </div>
                  <div className="progress large">
                    <i className="os-blue" style={{ width: '77%' }} />
                  </div>
                  <small>Custo médio por página: R$ 0,028</small>
                </div>

                <div>
                  <div>
                    <span>Impressões Coloridas (Color)</span>
                    <strong>64.360 páginas (23%)</strong>
                  </div>
                  <div className="progress large">
                    <i className="os-violet" style={{ width: '23%' }} />
                  </div>
                  <small>Custo médio por página: R$ 0,142</small>
                </div>
              </div>

              <div className="info-grid" style={{ marginTop: '20px' }}>
                <div>
                  <span>Total Acumulado de Páginas</span>
                  <strong>282.780 páginas neste ciclo</strong>
                </div>
                <div>
                  <span>Economia com Duplex (Frente e Verso)</span>
                  <strong>62% dos trabalhos impressos em duplex</strong>
                </div>
                <div>
                  <span>Páginas Digitalizadas (Scan to Email/Folder)</span>
                  <strong>18.940 documentos escaneados</strong>
                </div>
                <div>
                  <span>Índice de Disponibilidade SNMP</span>
                  <strong>99,4% uptime da frota</strong>
                </div>
              </div>
            </article>

            {/* Tabela de Substituições Recentes */}
            <article className="panel table-panel">
              <div className="table-header">
                <div>
                  <h3 className="card-section-title">Registro de Substituições de Insumos</h3>
                  <p className="card-section-desc" style={{ marginBottom: 0 }}>
                    Histórico de troca física de toners e cilindros na frota
                  </p>
                </div>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Data da Troca</th>
                      <th>Impressora</th>
                      <th>Insumo Substituído</th>
                      <th>Contador na Troca</th>
                      <th>Técnico Responsável</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { date: '28/10/2026', prn: 'HP LaserJet Enterprise M507', item: 'Toner Preto HP 89A', pages: '45.100 pgs', tech: 'Carlos Silva', tone: 'green' },
                      { date: '20/10/2026', prn: 'Brother HL-L6400DW', item: 'Cilindro DR-890', pages: '82.000 pgs', tech: 'Lucas Mendes', tone: 'green' },
                      { date: '14/10/2026', prn: 'Canon imageRUNNER ADV DX', item: 'Toner Amarelo NPG-84', pages: '109.800 pgs', tech: 'Carlos Silva', tone: 'green' },
                      { date: '02/10/2026', prn: 'Canon imageRUNNER ADV DX', item: 'Toner Magenta NPG-84', pages: '104.200 pgs', tech: 'Mariana Costa', tone: 'green' },
                    ].map((h, i) => (
                      <tr key={i}>
                        <td>
                          <strong>{h.date}</strong>
                        </td>
                        <td>{h.prn}</td>
                        <td>
                          <span className="badge-tag blue">{h.item}</span>
                        </td>
                        <td>{h.pages}</td>
                        <td>{h.tech}</td>
                        <td>
                          <Status tone="green">Concluído</Status>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>

          <aside className="tab-full-stack">
            <article className="panel quick-info">
              <h3>Metas de Sustentabilidade</h3>
              <div>
                <span>Papel economizado (Duplex)</span>
                <strong>~87.600 folhas</strong>
              </div>
              <div>
                <span>Cartuchos Reciclados</span>
                <strong>14 unidades no mês</strong>
              </div>
              <div>
                <span>Consumo Energético</span>
                <strong>42 kWh (Modo Eco ativo)</strong>
              </div>
            </article>

            <article className="panel quick-info">
              <h3>Ações de Manutenção</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Button
                  variant="secondary"
                  icon="download"
                  onClick={() => toast.success('Relatório gerencial de consumo e custos exportado (PDF/CSV)!')}
                >
                  Exportar Balanço Geral
                </Button>
              </div>
            </article>
          </aside>
        </section>
      )}

      {/* MODAL 1: ADICIONAR IMPRESSORA */}
      <Modal
        isOpen={addPrinterModalOpen}
        onClose={() => setAddPrinterModalOpen(false)}
        title="Cadastrar Nova Impressora de Rede"
        subtitle="Adiciona um equipamento ao inventário com monitoramento SNMP contínuo"
        icon="printer"
        maxWidth={580}
      >
        <form onSubmit={handleSavePrinter} className="page-stack">
          <div className="form-grid">
            <label className="field full">
              <span>Nome Amigável da Impressora</span>
              <input
                type="text"
                placeholder="Ex: HP LaserJet M507 — Sala de Reunião"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Endereço IP (Estático / DHCP Reservado)</span>
              <input
                type="text"
                placeholder="Ex: 10.42.20.55"
                value={formIp}
                onChange={(e) => setFormIp(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Modelo do Equipamento</span>
              <input
                type="text"
                placeholder="Ex: HP LaserJet Enterprise M507x"
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
              />
            </label>

            <label className="field full">
              <span>Localização Fisiográfica / Setor</span>
              <input
                type="text"
                placeholder="Ex: Prédio Administrativo · 2º Andar — Sala 204"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
              />
            </label>

            <label className="field full">
              <span>Comunidade SNMP (v2c)</span>
              <input
                type="text"
                placeholder="public"
                value={formSnmpCommunity}
                onChange={(e) => setFormSnmpCommunity(e.target.value)}
              />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <Button variant="secondary" onClick={() => setAddPrinterModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Cadastrar e Monitorar</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: MOVIMENTAÇÃO DE ESTOQUE */}
      <Modal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        title="Movimentação de Estoque de Insumos"
        subtitle={stockTarget ? `${stockTarget.model} (${stockTarget.color})` : 'Cartucho'}
        icon="package"
        maxWidth={480}
      >
        <form onSubmit={handleStockMovement} className="page-stack">
          <div className="form-grid">
            <label className="field full">
              <span>Tipo de Movimentação</span>
              <select
                value={stockAction}
                onChange={(e) => setStockAction(e.target.value as any)}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
              >
                <option value="in">Entrada no Estoque (Compra / Reposição recebida)</option>
                <option value="out">Baixa de Estoque (Troca física realizada na impressora)</option>
              </select>
            </label>

            <label className="field full">
              <span>Quantidade</span>
              <input
                type="number"
                min={1}
                max={50}
                value={stockQuantity}
                onChange={(e) => setStockQuantity(Number(e.target.value))}
                required
              />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
            <Button variant="secondary" onClick={() => setStockModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {stockAction === 'in' ? 'Registrar Entrada' : 'Registrar Baixa'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
