import { useState, useMemo } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status, MetricCard } from '../components/UI'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import type { PageId, StatusTone } from '../types'

interface NotebookItem {
  id: string
  name: string
  model: string
  serial: string
  owner: string
  department: string
  os: string
  encryption: string
  batteryHealth: number
  batteryCycles: number
  chargerConnected: boolean
  wifiSsid: string
  bssid: string
  ip: string
  status: 'Conforme' | 'Atenção' | 'Crítico'
  tone: StatusTone
  lastSeen: string
}

const initialNotebooks: NotebookItem[] = [
  {
    id: 'NVR-MAC-0142',
    name: 'MacBook Pro 14" M3 Pro',
    model: 'Apple MacBook Pro (Nov 2023)',
    serial: 'C02G99AAQ05D',
    owner: 'Mariana Costa',
    department: 'Design Studio & Produto',
    os: 'macOS Sequoia 15.5',
    encryption: 'FileVault 2 (APFS XTS-AES)',
    batteryHealth: 94,
    batteryCycles: 142,
    chargerConnected: true,
    wifiSsid: 'Novara-Corp-HQ',
    bssid: '08:ec:f5:12:44:aa',
    ip: '10.42.18.119',
    status: 'Conforme',
    tone: 'green',
    lastSeen: 'Agora (Ativo)',
  },
  {
    id: 'NVR-WIN-0084',
    name: 'Dell Latitude 7440 Ultrabook',
    model: 'Dell Latitude 7440 vPro',
    serial: '8HG99F3',
    owner: 'Rafael Lima',
    department: 'Operações Comerciais',
    os: 'Windows 11 Pro 23H2',
    encryption: 'BitLocker (TPM 2.0 256-bit)',
    batteryHealth: 76,
    batteryCycles: 580,
    chargerConnected: false,
    wifiSsid: 'Novara-Corp-HQ',
    bssid: '08:ec:f5:12:44:bb',
    ip: '10.42.18.84',
    status: 'Atenção',
    tone: 'amber',
    lastSeen: 'Há 8 min',
  },
  {
    id: 'NVR-WIN-0091',
    name: 'Lenovo ThinkPad T14 Gen 4',
    model: 'ThinkPad T14 AMD Ryzen 7',
    serial: 'PF4199X9',
    owner: 'Carla Nogueira',
    department: 'Controladoria & Auditoria',
    os: 'Windows 11 Pro 23H2',
    encryption: 'BitLocker (TPM 2.0 256-bit)',
    batteryHealth: 98,
    batteryCycles: 64,
    chargerConnected: true,
    wifiSsid: 'Novara-Corp-HQ',
    bssid: '08:ec:f5:12:44:aa',
    ip: '10.42.18.91',
    status: 'Conforme',
    tone: 'green',
    lastSeen: 'Agora (Ativo)',
  },
  {
    id: 'NVR-MAC-0155',
    name: 'MacBook Air 15" M2',
    model: 'Apple MacBook Air 15 (2023)',
    serial: 'C02H41ZZMD6R',
    owner: 'Lucas Ferreira',
    department: 'Marketing & Growth',
    os: 'macOS Sonoma 14.6',
    encryption: 'FileVault 2 (APFS XTS-AES)',
    batteryHealth: 91,
    batteryCycles: 210,
    chargerConnected: false,
    wifiSsid: 'Novara-Home-Remote',
    bssid: 'VPN Corporativa WireGuard',
    ip: '10.80.4.15',
    status: 'Conforme',
    tone: 'green',
    lastSeen: 'Há 14 min',
  },
  {
    id: 'NVR-LIN-0004',
    name: 'Dell XPS 13 Developer Edition',
    model: 'Dell XPS 13 Plus 9320',
    serial: '3KL09R1',
    owner: 'Equipe DevOps & SRE',
    department: 'Engenharia de Software',
    os: 'Ubuntu 24.04 LTS (LUKS)',
    encryption: 'LUKS2 Full Disk Encryption',
    batteryHealth: 88,
    batteryCycles: 310,
    chargerConnected: true,
    wifiSsid: 'Novara-Corp-HQ',
    bssid: '08:ec:f5:12:44:cc',
    ip: '10.42.18.104',
    status: 'Conforme',
    tone: 'green',
    lastSeen: 'Há 5 min',
  },
]

export function Notebooks({ go }: { go: (p: PageId) => void }) {
  const [notebooks, setNotebooks] = useState<NotebookItem[]>(initialNotebooks)
  const [subTab, setSubTab] = useState<'fleet' | 'battery' | 'crypto'>('fleet')
  const [query, setQuery] = useState('')
  const [filterBrand, setFilterBrand] = useState('all')

  // Modais
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false)
  const [selectedRecoveryNotebook, setSelectedRecoveryNotebook] = useState<NotebookItem | null>(null)

  // Form novo notebook
  const [formName, setFormName] = useState('')
  const [formModel, setFormModel] = useState('Dell Latitude 7440')
  const [formSerial, setFormSerial] = useState('')
  const [formOwner, setFormOwner] = useState('')
  const [formDept, setFormDept] = useState('Marketing & Growth')
  const [formOs, setFormOs] = useState('Windows 11 Pro')

  const toast = useToast()

  const filtered = useMemo(() => {
    return notebooks.filter((n) => {
      const matchQuery = `${n.name} ${n.owner} ${n.serial} ${n.ip} ${n.model}`
        .toLowerCase()
        .includes(query.toLowerCase())
      const matchBrand =
        filterBrand === 'all' ||
        (filterBrand === 'apple' && n.model.includes('Apple')) ||
        (filterBrand === 'dell' && n.model.includes('Dell')) ||
        (filterBrand === 'lenovo' && n.model.includes('ThinkPad'))
      return matchQuery && matchBrand
    })
  }, [notebooks, query, filterBrand])

  const handleOpenRecovery = (item: NotebookItem) => {
    setSelectedRecoveryNotebook(item)
    setRecoveryModalOpen(true)
  }

  const handleAddNotebook = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formSerial.trim()) {
      toast.warning('Nome e número de série são obrigatórios.')
      return
    }

    const newItem: NotebookItem = {
      id: `NVR-NOT-${Date.now().toString().slice(-4)}`,
      name: formName,
      model: formModel,
      serial: formSerial.toUpperCase(),
      owner: formOwner || 'Colaborador',
      department: formDept,
      os: formOs,
      encryption: formOs.includes('macOS') ? 'FileVault 2 Ativo' : 'BitLocker 256-bit Ativo',
      batteryHealth: 100,
      batteryCycles: 1,
      chargerConnected: true,
      wifiSsid: 'Novara-Corp-HQ',
      bssid: '08:ec:f5:12:44:aa',
      ip: '10.42.18.210',
      status: 'Conforme',
      tone: 'green',
      lastSeen: 'Agora mesmo',
    }

    setNotebooks((prev) => [newItem, ...prev])
    setNewModalOpen(false)
    toast.success(`Notebook "${formName}" matriculado com sucesso no inventário MDM!`)
  }

  return (
    <div className="page-stack">
      {/* Cabeçalho */}
      <div className="action-row">
        <div>
          <p className="eyebrow">DISPOSITIVOS MÓVEIS & LAPTOPS</p>
          <h2>Módulo Notebooks & Laptops Corporativos</h2>
          <p>Supervisão de laptops móveis, saúde e desgaste de baterias, chaves de criptografia e mobilidade.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            icon="pulse"
            onClick={() => {
              toast.info('Coletando telemetria de ciclos de bateria de todos os 81 notebooks...')
              setTimeout(() => toast.success('Telemetria atualizada: 3 baterias necessitam de recalibração.'), 1200)
            }}
          >
            Varredura de Baterias
          </Button>
          <Button icon="plus" onClick={() => setNewModalOpen(true)}>
            Cadastrar Notebook
          </Button>
        </div>
      </div>

      {/* Métricas do Módulo Notebook */}
      <section className="metrics-grid">
        <MetricCard
          label="Total de Notebooks"
          value={notebooks.length}
          delta="100%"
          detail="laptops em circulação"
          icon="laptop"
          tone="blue"
        />
        <MetricCard
          label="Criptografia Integral"
          value="100%"
          delta="Protegidos"
          detail="BitLocker & FileVault"
          icon="shield"
          tone="green"
        />
        <MetricCard
          label="Baterias Degradadas"
          value={notebooks.filter((n) => n.batteryHealth < 80).length}
          delta="Saúde < 80%"
          detail="alerta de substituição"
          icon="warning"
          tone="amber"
        />
        <MetricCard
          label="Trabalho Remoto / VPN"
          value="18 laptops"
          delta="Fora da sede"
          detail="túnel seguro ativo"
          icon="wifi"
          tone="violet"
        />
      </section>

      {/* Barra de Abas */}
      <div className="detail-tabs">
        <button
          className={subTab === 'fleet' ? 'active' : ''}
          onClick={() => setSubTab('fleet')}
        >
          Frota de Notebooks ({notebooks.length})
        </button>
        <button
          className={subTab === 'battery' ? 'active' : ''}
          onClick={() => setSubTab('battery')}
        >
          Saúde das Baterias & Ciclos
        </button>
        <button
          className={subTab === 'crypto' ? 'active' : ''}
          onClick={() => setSubTab('crypto')}
        >
          Custódia de Chaves de Criptografia
        </button>
      </div>

      {/* ABA 1: LISTA DE NOTEBOOKS */}
      {subTab === 'fleet' && (
        <section className="panel table-panel">
          <div className="table-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
            <label className="search table-search" style={{ flex: '1 1 280px' }}>
              <Icon name="search" />
              <input
                placeholder="Buscar por colaborador, modelo, serial ou IP..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            <select
              style={{ border: '1px solid var(--line)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
            >
              <option value="all">Todas as Marcas</option>
              <option value="apple">Apple (MacBook)</option>
              <option value="dell">Dell (Latitude / XPS)</option>
              <option value="lenovo">Lenovo (ThinkPad)</option>
            </select>

            <Button
              variant="secondary"
              icon="download"
              onClick={() => toast.success('Relatório completo da frota de notebooks exportado (CSV)!')}
            >
              Exportar CSV
            </Button>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Notebook / Colaborador</th>
                  <th>Modelo & Fabricante</th>
                  <th>Criptografia de Disco</th>
                  <th>Bateria & Ciclos</th>
                  <th>Ponto Wi-Fi & IP</th>
                  <th>Última Conexão</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((n) => (
                  <tr key={n.id}>
                    <td>
                      <button
                        type="button"
                        className="device-cell device-link"
                        onClick={() => go('notebookDetail')}
                      >
                        <span style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                          <Icon name="laptop" />
                        </span>
                        <div>
                          <strong>{n.name}</strong>
                          <small>{n.owner} · {n.department}</small>
                        </div>
                      </button>
                    </td>
                    <td>
                      <strong>{n.model}</strong>
                      <br />
                      <small style={{ color: 'var(--muted)', fontSize: '10px' }}>S/N: {n.serial}</small>
                    </td>
                    <td>
                      <span className="badge-tag green">
                        <Icon name="shield" size={12} /> {n.encryption}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="progress" style={{ width: '60px', height: '6px' }}>
                          <i
                            className={n.batteryHealth < 80 ? 'os-amber' : 'os-green'}
                            style={{ width: `${n.batteryHealth}%` }}
                          />
                        </div>
                        <strong style={{ fontSize: '11px', color: n.batteryHealth < 80 ? 'var(--amber)' : 'var(--ink)' }}>
                          {n.batteryHealth}%
                        </strong>
                      </div>
                      <small style={{ color: 'var(--muted)', fontSize: '10px' }}>
                        {n.batteryCycles} ciclos {n.chargerConnected ? '· ⚡ Na tomada' : ''}
                      </small>
                    </td>
                    <td>
                      <strong>{n.ip}</strong>
                      <br />
                      <small style={{ color: 'var(--muted)', fontSize: '10px' }}>SSID: {n.wifiSsid}</small>
                    </td>
                    <td>{n.lastSeen}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Status tone={n.tone}>{n.status}</Status>
                        <Button
                          variant="ghost"
                          icon="lock"
                          onClick={() => handleOpenRecovery(n)}
                          title="Recuperar chave de descriptografia"
                        >
                          Chave
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ABA 2: SAÚDE DAS BATERIAS */}
      {subTab === 'battery' && (
        <div className="tab-full-stack">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <article className="panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Política de Troca Preventiva de Baterias</h3>
                <span className="badge-tag amber">Alerta com &lt; 80%</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '6px' }}>
                Notebooks corporativos que atingem menos de 80% da capacidade original ou mais de 500 ciclos recebem chamado automático para substituição da célula no suporte TI.
              </p>
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Dell Latitude 7440 (Rafael Lima)</span>
                  <strong style={{ color: 'var(--amber)' }}>76% saúde · 580 ciclos (Chamado aberto)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Dell XPS 13 Dev (DevOps Team)</span>
                  <strong>88% saúde · 310 ciclos</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>MacBook Pro 14" (Mariana Costa)</span>
                  <strong style={{ color: 'var(--green)' }}>94% saúde · 142 ciclos (Excelente)</strong>
                </div>
              </div>
            </article>

            <article className="panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Otimização de Carregamento Inteligente</h3>
                <Status tone="green">Ativo nos Laptops</Status>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '6px' }}>
                Limita a carga em 80% quando o dispositivo permanece conectado à docking station durante longos períodos para preservar a vida útil química do íon de lítio.
              </p>
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Proteção Apple Battery Health</span>
                  <strong style={{ color: 'var(--green)' }}>Ativa em 100% dos Macs</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Dell Command Power Manager</span>
                  <strong style={{ color: 'var(--green)' }}>Ativo em 100% dos Dells</strong>
                </div>
              </div>
            </article>
          </div>
        </div>
      )}

      {/* ABA 3: CUSTÓDIA DE CHAVES DE CRIPTOGRAFIA */}
      {subTab === 'crypto' && (
        <article className="panel form-panel">
          <div className="form-heading">
            <span>ESCROW SEGURO DE CHAVES DE DESCRIPTOGRAFIA</span>
            <h3>Custódia Centralizada de BitLocker & FileVault</h3>
            <p>
              Todas as chaves de recuperação de 48 dígitos (BitLocker) e chaves institucionais (FileVault) são custodiadas de forma criptografada pelo MDM com auditoria de acesso.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {notebooks.map((n) => (
              <div key={n.id} className="panel" style={{ padding: '16px', background: '#fafbfc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{n.name}</strong>
                  <Status tone="green">Custodiada</Status>
                </div>
                <small style={{ color: 'var(--muted)', display: 'block', margin: '4px 0 10px' }}>
                  Colaborador: {n.owner} · S/N: {n.serial}
                </small>
                <Button variant="secondary" icon="lock" onClick={() => handleOpenRecovery(n)}>
                  Consultar Chave Segura
                </Button>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* MODAL DE RECUPERAÇÃO DE CHAVE */}
      <Modal
        isOpen={recoveryModalOpen}
        onClose={() => setRecoveryModalOpen(false)}
        title="Chave de Recuperação de Disco Criptografado"
        subtitle={`Identificação: ${selectedRecoveryNotebook?.name} (S/N: ${selectedRecoveryNotebook?.serial})`}
        icon="shield"
        maxWidth={500}
      >
        <div className="page-stack">
          <div className="security-banner" style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
            <span>
              <Icon name="warning" />
            </span>
            <div>
              <strong style={{ color: '#991b1b' }}>Acesso Auditado</strong>
              <p style={{ color: '#7f1d1d' }}>
                A visualização desta chave de segurança será registrada na trilha de auditoria com seu IP e timestamp.
              </p>
            </div>
          </div>

          <div style={{ padding: '16px', background: '#1e293b', color: '#f8fafc', borderRadius: '8px', fontFamily: 'monospace', letterSpacing: '1px', textAlign: 'center', fontSize: '13px' }}>
            49182-39102-48192-10492-38194-29104-58291-38102
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
            <Button
              variant="secondary"
              icon="copy"
              onClick={() => {
                toast.success('Chave de descriptografia copiada para a área de transferência!')
              }}
            >
              Copiar Chave
            </Button>
            <Button onClick={() => setRecoveryModalOpen(false)}>Fechar</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL DE CADASTRO DE NOTEBOOK */}
      <Modal
        isOpen={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title="Cadastrar Novo Notebook Corporativo"
        subtitle="Adicione um laptop ao inventário com ativação mandatória de BitLocker/FileVault"
        icon="laptop"
        maxWidth={540}
      >
        <form onSubmit={handleAddNotebook} className="page-stack">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="field">
              <span>Nome Identificador</span>
              <input
                placeholder="Ex.: MacBook Pro 14"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
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
              <span>Número de Série (S/N)</span>
              <input
                placeholder="Ex.: C02G99AAQ05D"
                value={formSerial}
                onChange={(e) => setFormSerial(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Sistema Operacional</span>
              <select
                value={formOs}
                onChange={(e) => setFormOs(e.target.value)}
              >
                <option value="Windows 11 Pro">Windows 11 Pro (BitLocker)</option>
                <option value="macOS Sequoia 15">macOS Sequoia 15 (FileVault)</option>
                <option value="Ubuntu 24.04 LTS">Ubuntu 24.04 (LUKS)</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="field">
              <span>Colaborador Responsável</span>
              <input
                placeholder="Nome completo"
                value={formOwner}
                onChange={(e) => setFormOwner(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Departamento</span>
              <select
                value={formDept}
                onChange={(e) => setFormDept(e.target.value)}
              >
                <option value="Marketing & Growth">Marketing & Growth</option>
                <option value="Design Studio & Produto">Design Studio & Produto</option>
                <option value="Operações Comerciais">Operações Comerciais</option>
                <option value="Controladoria & Auditoria">Controladoria & Auditoria</option>
                <option value="Engenharia de Software">Engenharia de Software</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <Button variant="secondary" onClick={() => setNewModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Cadastrar Notebook</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
