import { useState, useMemo } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status, MetricCard } from '../components/UI'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import type { PageId, StatusTone } from '../types'

interface DesktopItem {
  id: string
  hostname: string
  model: string
  cpu: string
  ram: string
  gpu: string
  ip: string
  mac: string
  speed: string
  user: string
  department: string
  monitors: number
  status: 'Online' | 'Standby' | 'Offline'
  tone: StatusTone
  lastBoot: string
}

const initialDesktops: DesktopItem[] = [
  {
    id: 'DSK-ENG-001',
    hostname: 'WS-ENG-CAD01',
    model: 'Dell Precision 5860 Tower',
    cpu: 'Intel Xeon w5-2455X (16c/32t)',
    ram: '64 GB DDR5 ECC',
    gpu: 'NVIDIA RTX A4500 20GB',
    ip: '10.42.10.45',
    mac: 'B4:2E:99:A1:77:20',
    speed: '10 Gbps Fibra',
    user: 'Felipe Alcantara',
    department: 'Engenharia de Estruturas',
    monitors: 3,
    status: 'Online',
    tone: 'green',
    lastBoot: 'Hoje, 07:15',
  },
  {
    id: 'DSK-DES-002',
    hostname: 'MAC-STUDIO-3D',
    model: 'Apple Mac Studio (M2 Max)',
    cpu: 'Apple M2 Max (12-core CPU)',
    ram: '64 GB Unificada',
    gpu: '38-core GPU Integrada',
    ip: '10.42.10.48',
    mac: '3C:06:30:D5:19:B2',
    speed: '10 Gbps Ethernet',
    user: 'Mariana Costa',
    department: 'Design Studio & Render',
    monitors: 2,
    status: 'Online',
    tone: 'green',
    lastBoot: 'Ontem, 08:30',
  },
  {
    id: 'DSK-FIN-003',
    hostname: 'OPT-FIN-0042',
    model: 'Dell OptiPlex 7010 Micro',
    cpu: 'Intel Core i7-13700T (16 cores)',
    ram: '32 GB DDR5',
    gpu: 'Intel UHD Graphics 770',
    ip: '10.42.10.52',
    mac: '18:66:DA:22:90:3E',
    speed: '1 Gbps RJ45',
    user: 'Carlos Mendes',
    department: 'Controladoria & Finanças',
    monitors: 2,
    status: 'Online',
    tone: 'green',
    lastBoot: 'Hoje, 08:00',
  },
  {
    id: 'DSK-TI-004',
    hostname: 'LEN-TI-SRV02',
    model: 'Lenovo ThinkCentre M90t Gen 4',
    cpu: 'Intel Core i9-13900 (24 cores)',
    ram: '128 GB DDR5',
    gpu: 'NVIDIA RTX 4070 12GB',
    ip: '10.42.10.12',
    mac: 'D8:BB:C1:F4:02:88',
    speed: '2.5 Gbps Ethernet',
    user: 'Equipe NOC / DevOps',
    department: 'Infraestrutura & TI',
    monitors: 4,
    status: 'Online',
    tone: 'green',
    lastBoot: 'Há 18 dias',
  },
  {
    id: 'DSK-RH-005',
    hostname: 'OPT-RH-0019',
    model: 'Dell OptiPlex 3000 SFF',
    cpu: 'Intel Core i5-12500 (6 cores)',
    ram: '16 GB DDR4',
    gpu: 'Intel UHD Graphics 770',
    ip: '10.42.10.88',
    mac: '74:86:7A:B3:55:10',
    speed: '1 Gbps RJ45',
    user: 'Juliana Paes',
    department: 'Recursos Humanos',
    monitors: 1,
    status: 'Standby',
    tone: 'amber',
    lastBoot: 'Há 3 dias',
  },
  {
    id: 'DSK-ENG-006',
    hostname: 'WS-ENG-CAD02',
    model: 'HP Z4 G5 Workstation',
    cpu: 'Intel Xeon w3-2435 (8c/16t)',
    ram: '32 GB DDR5 ECC',
    gpu: 'NVIDIA RTX A2000 12GB',
    ip: '10.42.10.46',
    mac: '9C:B6:54:19:88:EC',
    speed: '10 Gbps Fibra',
    user: 'Rodrigo Lima',
    department: 'Engenharia de Estruturas',
    monitors: 2,
    status: 'Offline',
    tone: 'red',
    lastBoot: 'Há 5 dias',
  },
]

export function Desktops({ go }: { go: (p: PageId) => void }) {
  const [desktops, setDesktops] = useState<DesktopItem[]>(initialDesktops)
  const [subTab, setSubTab] = useState<'fleet' | 'peripherals' | 'wol'>('fleet')
  const [query, setQuery] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [wolModalOpen, setWolModalOpen] = useState(false)
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [selectedMac, setSelectedMac] = useState('')
  const [selectedIp, setSelectedIp] = useState('')

  // Form novo desktop
  const [formHostname, setFormHostname] = useState('')
  const [formModel, setFormModel] = useState('Dell Precision 5860')
  const [formCpu, setFormCpu] = useState('Intel Core i7-14700')
  const [formRam, setFormRam] = useState('32 GB DDR5')
  const [formIp, setFormIp] = useState('10.42.10.95')
  const [formMac, setFormMac] = useState('00:1E:67:AA:BB:CC')
  const [formUser, setFormUser] = useState('')
  const [formDept, setFormDept] = useState('Engenharia de Estruturas')

  const toast = useToast()

  const filtered = useMemo(() => {
    return desktops.filter((d) => {
      const matchQuery = `${d.hostname} ${d.model} ${d.user} ${d.ip} ${d.department}`
        .toLowerCase()
        .includes(query.toLowerCase())
      const matchDept = filterDepartment === 'all' || d.department === filterDepartment
      return matchQuery && matchDept
    })
  }, [desktops, query, filterDepartment])

  const handleWakeOnLan = (item: DesktopItem) => {
    setSelectedMac(item.mac)
    setSelectedIp(item.ip)
    setWolModalOpen(true)
  }

  const handleSendMagicPacket = (e: React.FormEvent) => {
    e.preventDefault()
    setWolModalOpen(false)
    toast.success(`Pacote Mágico Wake-on-LAN enviado via UDP broadcast (Porta 9) para ${selectedMac}!`)
    // Altera status para online caso estivesse standby/offline
    setDesktops((prev) =>
      prev.map((d) => (d.mac === selectedMac ? { ...d, status: 'Online', tone: 'green' } : d))
    )
  }

  const handleAddDesktop = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formHostname.trim()) {
      toast.warning('Informe o hostname da estação de trabalho.')
      return
    }

    const newItem: DesktopItem = {
      id: `DSK-${Date.now()}`,
      hostname: formHostname,
      model: formModel,
      cpu: formCpu,
      ram: formRam,
      gpu: 'Intel UHD Graphics',
      ip: formIp,
      mac: formMac,
      speed: '1 Gbps RJ45',
      user: formUser || 'Operador Local',
      department: formDept,
      monitors: 2,
      status: 'Online',
      tone: 'green',
      lastBoot: 'Agora mesmo',
    }

    setDesktops((prev) => [newItem, ...prev])
    setNewModalOpen(false)
    toast.success(`Estação de trabalho "${formHostname}" cadastrada e integrada ao console!`)
  }

  return (
    <div className="page-stack">
      {/* Cabeçalho */}
      <div className="action-row">
        <div>
          <p className="eyebrow">ESTAÇÕES DE TRABALHO FIXAS</p>
          <h2>Módulo Desktops & Estações de Trabalho</h2>
          <p>Supervisão de torres de alto desempenho, Mac mini/Studio, portas ethernet, dual-display e Wake-on-LAN.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            icon="pulse"
            onClick={() => {
              toast.info('Disparando pacote Wake-on-LAN broadcast para todas as 120 estações...')
              setTimeout(() => toast.success('Estações ligadas e sincronizadas com sucesso!'), 1200)
            }}
          >
            Wake-on-LAN em Massa
          </Button>
          <Button icon="plus" onClick={() => setNewModalOpen(true)}>
            Cadastrar Estação
          </Button>
        </div>
      </div>

      {/* Métricas do Módulo Desktop */}
      <section className="metrics-grid">
        <MetricCard
          label="Total de Estações"
          value={desktops.length}
          delta="100%"
          detail="estações fixas"
          icon="server"
          tone="blue"
        />
        <MetricCard
          label="Ligadas & Operantes"
          value={desktops.filter((d) => d.status === 'Online').length}
          delta="Conectadas"
          detail="rede ethernet ativa"
          icon="check"
          tone="green"
        />
        <MetricCard
          label="Em Standby / Suspensas"
          value={desktops.filter((d) => d.status === 'Standby').length}
          delta="Wake-on-LAN"
          detail="prontas para acordar"
          icon="clock"
          tone="amber"
        />
        <MetricCard
          label="Capacidade de GPU"
          value="18 GPUs"
          delta="Dedicadas"
          detail="RTX & Apple Silicon"
          icon="cpu"
          tone="violet"
        />
      </section>

      {/* Barra de Abas */}
      <div className="detail-tabs">
        <button
          className={subTab === 'fleet' ? 'active' : ''}
          onClick={() => setSubTab('fleet')}
        >
          Estações de Trabalho ({desktops.length})
        </button>
        <button
          className={subTab === 'peripherals' ? 'active' : ''}
          onClick={() => setSubTab('peripherals')}
        >
          Monitores & Múltiplas Telas (Dual Display)
        </button>
        <button
          className={subTab === 'wol' ? 'active' : ''}
          onClick={() => setSubTab('wol')}
        >
          Wake-on-LAN & Gerenciamento de Energia
        </button>
      </div>

      {/* ABA 1: LISTAGEM DE DESKTOPS */}
      {subTab === 'fleet' && (
        <section className="panel table-panel">
          <div className="table-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
            <label className="search table-search" style={{ flex: '1 1 280px' }}>
              <Icon name="search" />
              <input
                placeholder="Buscar por hostname, modelo, usuário ou IP..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            <select
              style={{ border: '1px solid var(--line)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <option value="all">Todos os Departamentos</option>
              <option value="Engenharia de Estruturas">Engenharia de Estruturas</option>
              <option value="Design Studio & Render">Design Studio & Render</option>
              <option value="Controladoria & Finanças">Controladoria & Finanças</option>
              <option value="Infraestrutura & TI">Infraestrutura & TI</option>
              <option value="Recursos Humanos">Recursos Humanos</option>
            </select>

            <Button
              variant="secondary"
              icon="download"
              onClick={() => toast.success('Inventário de estações de trabalho exportado (CSV)!')}
            >
              Exportar CSV
            </Button>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Estação / Hostname</th>
                  <th>Modelo & Gabinete</th>
                  <th>Processador & Memória</th>
                  <th>Placa Gráfica (GPU)</th>
                  <th>Rede Ethernet</th>
                  <th>Responsável / Setor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <button
                        type="button"
                        className="device-cell device-link"
                        onClick={() => go('desktopDetail')}
                      >
                        <span style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                          <Icon name="server" />
                        </span>
                        <div>
                          <strong>{d.hostname}</strong>
                          <small>{d.id} · {d.monitors} monitor{d.monitors > 1 ? 'es' : ''}</small>
                        </div>
                      </button>
                    </td>
                    <td>{d.model}</td>
                    <td>
                      <strong>{d.cpu}</strong>
                      <br />
                      <small style={{ color: 'var(--muted)', fontSize: '10px' }}>{d.ram}</small>
                    </td>
                    <td>
                      <span className="badge-tag blue">{d.gpu}</span>
                    </td>
                    <td>
                      <strong>{d.ip}</strong>
                      <br />
                      <small style={{ color: 'var(--muted)', fontSize: '10px' }}>{d.speed} · {d.mac}</small>
                    </td>
                    <td>
                      <strong>{d.user}</strong>
                      <br />
                      <small style={{ color: 'var(--muted)', fontSize: '10px' }}>{d.department}</small>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Status tone={d.tone}>{d.status}</Status>
                        {d.status !== 'Online' && (
                          <Button variant="secondary" icon="pulse" onClick={() => handleWakeOnLan(d)}>
                            Ligar WOL
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ABA 2: MONITORES & PERIFÉRICOS */}
      {subTab === 'peripherals' && (
        <div className="tab-full-stack">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <article className="panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Estações com Múltiplos Monitores (Multi-Display)</h3>
                <span className="badge-tag green">92% da Engenharia</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '6px' }}>
                Estações de trabalho equipadas com 2 a 4 displays DisplayPort 1.4 / HDMI 2.1 para produtividade máxima em CAD e Design.
              </p>
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Dell UltraSharp 27" 4K (U2723QE)</span>
                  <strong>84 displays detectados</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>LG UltraWide 34" Curvo (34WN80C)</span>
                  <strong>26 displays detectados</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Apple Studio Display 27" 5K</span>
                  <strong>10 displays detectados</strong>
                </div>
              </div>
            </article>

            <article className="panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Alimentação & No-breaks (UPS) Monitorados</h3>
                <Status tone="green">Tensão Estável</Status>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '6px' }}>
                Conexão USB/SNMP com no-breaks senoidais para desligamento seguro em caso de queda de energia predial.
              </p>
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Carga da Bateria UPS Central</span>
                  <strong style={{ color: 'var(--green)' }}>100% Carregada</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Autonomia Estimada</span>
                  <strong>45 minutos de operação contínua</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Desligamento Automático</span>
                  <strong>Configurado para 10% restante</strong>
                </div>
              </div>
            </article>
          </div>
        </div>
      )}

      {/* ABA 3: WAKE-ON-LAN */}
      {subTab === 'wol' && (
        <article className="panel form-panel">
          <div className="form-heading">
            <span>GERENCIAMENTO DE ENERGIA & DISPARO REMOTO</span>
            <h3>Rotinas Wake-on-LAN (WOL) Programadas</h3>
            <p>Economize energia desligando computadores às 20h e ligando-os automaticamente às 06h30 para rotinas de backup e patches.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div className="panel" style={{ padding: '16px', background: '#fafbfc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Ligar para Atualização Noturna</strong>
                <Status tone="green">Ativo</Status>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
                Terças-feiras às 02:00 · Dispara Pacote Mágico para todas as estações com updates pendentes.
              </p>
            </div>

            <div className="panel" style={{ padding: '16px', background: '#fafbfc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Ligar Início de Turno Matutino</strong>
                <Status tone="green">Ativo</Status>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
                Segunda a Sexta às 07:00 · Acorda estações da Engenharia e Financeiro antes da chegada dos colaboradores.
              </p>
            </div>
          </div>
        </article>
      )}

      {/* MODAL DE WAKE-ON-LAN */}
      <Modal
        isOpen={wolModalOpen}
        onClose={() => setWolModalOpen(false)}
        title="Enviar Pacote Mágico Wake-on-LAN"
        subtitle="Ligue esta estação de trabalho remotamente através da placa de rede ethernet"
        icon="pulse"
        maxWidth={480}
      >
        <form onSubmit={handleSendMagicPacket} className="page-stack">
          <label className="field full">
            <span>Endereço MAC da Interface Ethernet</span>
            <input
              type="text"
              value={selectedMac}
              onChange={(e) => setSelectedMac(e.target.value)}
              required
            />
          </label>

          <label className="field full">
            <span>Endereço IP / Broadcast da Sub-rede</span>
            <input
              type="text"
              value={selectedIp}
              onChange={(e) => setSelectedIp(e.target.value)}
              required
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
            <Button variant="secondary" onClick={() => setWolModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Enviar Pacote WOL</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE CADASTRO DE ESTAÇÃO */}
      <Modal
        isOpen={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title="Cadastrar Nova Estação de Trabalho"
        subtitle="Registre uma torre ou máquina fixa para inventário e gerenciamento"
        icon="server"
        maxWidth={540}
      >
        <form onSubmit={handleAddDesktop} className="page-stack">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="field">
              <span>Hostname</span>
              <input
                placeholder="Ex.: WS-ENG-05"
                value={formHostname}
                onChange={(e) => setFormHostname(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Modelo de Hardware</span>
              <input
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                required
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="field">
              <span>Processador (CPU)</span>
              <input
                value={formCpu}
                onChange={(e) => setFormCpu(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Memória RAM</span>
              <input
                value={formRam}
                onChange={(e) => setFormRam(e.target.value)}
                required
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="field">
              <span>Endereço IP</span>
              <input
                value={formIp}
                onChange={(e) => setFormIp(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Endereço MAC</span>
              <input
                value={formMac}
                onChange={(e) => setFormMac(e.target.value)}
                required
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="field">
              <span>Responsável</span>
              <input
                placeholder="Nome do colaborador"
                value={formUser}
                onChange={(e) => setFormUser(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Departamento</span>
              <select
                value={formDept}
                onChange={(e) => setFormDept(e.target.value)}
              >
                <option value="Engenharia de Estruturas">Engenharia de Estruturas</option>
                <option value="Design Studio & Render">Design Studio & Render</option>
                <option value="Controladoria & Finanças">Controladoria & Finanças</option>
                <option value="Infraestrutura & TI">Infraestrutura & TI</option>
                <option value="Recursos Humanos">Recursos Humanos</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <Button variant="secondary" onClick={() => setNewModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Cadastrar Estação</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
