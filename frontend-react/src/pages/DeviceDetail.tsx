import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import type { PageId } from '../types'

interface SoftwareItem {
  id: string
  name: string
  vendor: string
  version: string
  size: string
  installedAt: string
  managed: boolean
  hasUpdate: boolean
  updateVersion?: string
  status: string
  tone: 'green' | 'amber' | 'blue'
}

interface EventLogItem {
  id: string
  time: string
  category: 'policy' | 'security' | 'auth' | 'software' | 'network'
  title: string
  desc: string
  ip: string
  tone: 'green' | 'amber' | 'blue'
  payload: Record<string, any>
}

function getAppIconName(name: string, managed: boolean): import('../types').IconName {
  if (name.includes('1Password')) return 'lock'
  if (name.includes('Code') || name.includes('Terminal')) return 'terminal'
  if (name.includes('Falcon') || name.includes('CrowdStrike')) return 'shield'
  if (name.includes('Zoom')) return 'phone'
  if (name.includes('Slack')) return 'agent'
  if (name.includes('Chrome')) return 'search'
  if (name.includes('Figma')) return 'sliders'
  if (name.includes('Copilot') || name.includes('Microsoft')) return 'grid'
  return managed ? 'shield' : 'package'
}

export function DeviceDetail({ go }: { go: (p: PageId) => void }) {
  const [tab, setTab] = useState<'geral' | 'hardware' | 'apps' | 'security' | 'activity'>('geral')
  const toast = useToast()

  // Modais
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [installModalOpen, setInstallModalOpen] = useState(false)
  const [eventDetailModal, setEventDetailModal] = useState<EventLogItem | null>(null)

  // Estados de edição de cadastro
  const [deviceName, setDeviceName] = useState('MacBook Pro 14" — Mariana Costa')
  const [owner, setOwner] = useState('Mariana Costa')
  const [department, setDepartment] = useState('Design & Produto')
  const [unit, setUnit] = useState('Matriz — São Paulo')
  const [sector, setSector] = useState('Design Studio · 4º Andar')
  const [assetTag, setAssetTag] = useState('NVR-MAC-0142')

  // Filtros da aba de apps
  const [appSearch, setAppSearch] = useState('')
  const [appFilter, setAppFilter] = useState<'all' | 'managed' | 'updates'>('all')

  // Filtros da aba de eventos
  const [eventSearch, setEventSearch] = useState('')
  const [eventFilter, setEventFilter] = useState<'all' | 'policy' | 'security' | 'auth' | 'software' | 'network'>('all')

  // Estado de ações simuladas
  const [scanning, setScanning] = useState(false)
  const [reapplyingPolicies, setReapplyingPolicies] = useState(false)

  // Lista de Softwares
  const [softwareList, setSoftwareList] = useState<SoftwareItem[]>([
    {
      id: 'sw-1',
      name: 'Microsoft 365 Copilot Suite',
      vendor: 'Microsoft Corp',
      version: '16.89',
      size: '2,4 GB',
      installedAt: '28/10/2026',
      managed: true,
      hasUpdate: false,
      status: 'Conforme',
      tone: 'green',
    },
    {
      id: 'sw-2',
      name: 'Google Chrome Enterprise',
      vendor: 'Google LLC',
      version: '130.0.6723.70',
      size: '480 MB',
      installedAt: '25/10/2026',
      managed: true,
      hasUpdate: false,
      status: 'Conforme',
      tone: 'green',
    },
    {
      id: 'sw-3',
      name: 'Slack Desktop Workspace',
      vendor: 'Slack Technologies',
      version: '4.39.2',
      size: '310 MB',
      installedAt: '14/10/2026',
      managed: true,
      hasUpdate: true,
      updateVersion: '4.40.1',
      status: 'Atualização pendente',
      tone: 'amber',
    },
    {
      id: 'sw-4',
      name: '1Password 8',
      vendor: 'AgileBits Inc',
      version: '8.10.36',
      size: '180 MB',
      installedAt: '01/10/2026',
      managed: true,
      hasUpdate: false,
      status: 'Conforme',
      tone: 'green',
    },
    {
      id: 'sw-5',
      name: 'CrowdStrike Falcon Sensor',
      vendor: 'CrowdStrike Inc',
      version: '7.18.18204',
      size: '95 MB',
      installedAt: '30/10/2026',
      managed: true,
      hasUpdate: false,
      status: 'EDR Operacional',
      tone: 'blue',
    },
    {
      id: 'sw-6',
      name: 'Figma Desktop',
      vendor: 'Figma Inc',
      version: '124.3.2',
      size: '210 MB',
      installedAt: '19/10/2026',
      managed: false,
      hasUpdate: false,
      status: 'Conforme',
      tone: 'green',
    },
    {
      id: 'sw-7',
      name: 'Zoom Workplace',
      vendor: 'Zoom Video',
      version: '6.2.3',
      size: '290 MB',
      installedAt: '12/10/2026',
      managed: true,
      hasUpdate: true,
      updateVersion: '6.2.6',
      status: 'Atualização pendente',
      tone: 'amber',
    },
    {
      id: 'sw-8',
      name: 'Visual Studio Code',
      vendor: 'Microsoft Corp',
      version: '1.94.2',
      size: '420 MB',
      installedAt: '22/10/2026',
      managed: false,
      hasUpdate: false,
      status: 'Conforme',
      tone: 'green',
    },
    {
      id: 'sw-9',
      name: 'Novara Agent Daemon',
      vendor: 'Novara MDM',
      version: '4.8.2',
      size: '38 MB',
      installedAt: '30/10/2026',
      managed: true,
      hasUpdate: false,
      status: 'Agente Oficial',
      tone: 'blue',
    },
  ])

  // Trilha de Eventos
  const eventLogs: EventLogItem[] = [
    {
      id: 'evt-1',
      time: 'Hoje, 15:42:19',
      category: 'policy',
      title: 'Baseline de segurança verificada',
      desc: 'Todas as 6 regras de compliance foram avaliadas pelo daemon local sem desvios.',
      ip: '10.42.18.119',
      tone: 'green',
      payload: { policyId: 'base-mac-2.4', checksum: 'a8b79c3d4e', result: 'COMPLIANT' },
    },
    {
      id: 'evt-2',
      time: 'Hoje, 14:10:05',
      category: 'software',
      title: 'Sensor CrowdStrike Falcon checado',
      desc: 'Sensor v7.18.18204 reportou conexão estável à nuvem e proteção em tempo real ativa.',
      ip: '10.42.18.119',
      tone: 'green',
      payload: { sensorVersion: '7.18', cloudStatus: 'CONNECTED', engine: 'AGGRESSIVE' },
    },
    {
      id: 'evt-3',
      time: 'Hoje, 09:12:44',
      category: 'auth',
      title: 'Sessão do agente renovada via SSO',
      desc: 'Token de autenticação mTLS rotacionado via credencial corporativa Mariana Costa.',
      ip: '10.42.18.119',
      tone: 'blue',
      payload: { identity: 'mariana.costa@novara.corp', certExpiry: '2027-03-14' },
    },
    {
      id: 'evt-4',
      time: 'Hoje, 08:30:11',
      category: 'network',
      title: 'Conexão Wi-Fi corporativa estabelecida',
      desc: 'Autenticado no ponto de acesso Novara-Corp-HQ (BSSID 08:ec:f5:12:44:aa, canal 36 160MHz).',
      ip: '10.42.18.119',
      tone: 'blue',
      payload: { ssid: 'Novara-Corp-HQ', bssid: '08:ec:f5:12:44:aa', protocol: '802.11ax' },
    },
    {
      id: 'evt-5',
      time: 'Ontem, 18:04:22',
      category: 'security',
      title: 'Bloqueio de tela ativado por inatividade',
      desc: 'Regra de 5 minutos acionada. Touch ID solicitado para desbloqueio.',
      ip: '10.42.18.119',
      tone: 'green',
      payload: { lockReason: 'TIMEOUT_5MIN', authType: 'TOUCH_ID' },
    },
    {
      id: 'evt-6',
      time: 'Ontem, 14:22:18',
      category: 'security',
      title: 'Telemetria SMART de SSD validada',
      desc: '0 blocos defeituosos encontrados. Saúde da unidade em 100% (Temperatura 34°C).',
      ip: '10.42.18.119',
      tone: 'green',
      payload: { drive: 'Macintosh HD', smartStatus: 'VERIFIED', wearLevel: '0%' },
    },
    {
      id: 'evt-7',
      time: '28/10, 11:15:00',
      category: 'software',
      title: 'Pacote de software homologado',
      desc: 'Microsoft 365 Copilot Suite v16.89 conferido com assinatura oficial Microsoft.',
      ip: '10.42.18.119',
      tone: 'green',
      payload: { bundleId: 'com.microsoft.autoupdate2', signer: 'Developer ID Application: Microsoft' },
    },
    {
      id: 'evt-8',
      time: '26/10, 16:50:33',
      category: 'security',
      title: 'Tentativa de montagem USB monitorada',
      desc: 'Dispositivo Kingston DataTraveler conectado. Política de DLP permitiu leitura e bloqueou gravação.',
      ip: '10.42.18.119',
      tone: 'amber',
      payload: { usbVendor: 'Kingston', serial: '001A928C9F', permission: 'READ_ONLY_ENFORCED' },
    },
  ]

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    setEditModalOpen(false)
    toast.success('Informações cadastrais do dispositivo atualizadas com sucesso!')
  }

  const handleScanSoftwares = () => {
    setScanning(true)
    toast.info('Varredura profunda de aplicativos iniciada no dispositivo...')
    setTimeout(() => {
      setScanning(false)
      toast.success('Varredura concluída: 42 softwares conferidos, nenhum software não-autorizado.')
    }, 1200)
  }

  const handleReapplyPolicies = () => {
    setReapplyingPolicies(true)
    toast.info('Transmitindo ordem de reconciliação de políticas ao agente...')
    setTimeout(() => {
      setReapplyingPolicies(false)
      toast.success('Todas as 6 políticas foram sincronizadas e reaplicadas com sucesso!')
    }, 1300)
  }

  const handleUpdateApp = (app: SoftwareItem) => {
    toast.info(`Iniciando atualização remota de ${app.name} para v${app.updateVersion}...`)
    setTimeout(() => {
      setSoftwareList((prev) =>
        prev.map((item) =>
          item.id === app.id
            ? { ...item, version: item.updateVersion || item.version, hasUpdate: false, status: 'Conforme', tone: 'green' }
            : item
        )
      )
      toast.success(`${app.name} atualizado com sucesso no dispositivo!`)
    }, 1500)
  }

  const handleExportAuditCSV = () => {
    toast.success('Relatório de auditoria exportado com sucesso (device_audit_mariana.csv)!')
  }

  const filteredApps = softwareList.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(appSearch.toLowerCase()) ||
      app.vendor.toLowerCase().includes(appSearch.toLowerCase()) ||
      app.version.toLowerCase().includes(appSearch.toLowerCase())
    if (!matchesSearch) return false
    if (appFilter === 'managed') return app.managed
    if (appFilter === 'updates') return app.hasUpdate
    return true
  })

  const filteredEvents = eventLogs.filter((evt) => {
    const matchesSearch =
      evt.title.toLowerCase().includes(eventSearch.toLowerCase()) ||
      evt.desc.toLowerCase().includes(eventSearch.toLowerCase()) ||
      evt.ip.includes(eventSearch)
    if (!matchesSearch) return false
    if (eventFilter !== 'all') return evt.category === eventFilter
    return true
  })

  return (
    <div className="page-stack">
      {/* Cabeçalho do Ativo */}
      <div className="detail-heading">
        <button onClick={() => go('assets')}>
          <Icon name="arrow" size={16} /> Voltar para inventário de ativos
        </button>

        <div className="detail-device">
          <span className="detail-device-icon">
            <Icon name="laptop" size={26} />
          </span>
          <div className="detail-device-info">
            <div className="detail-device-title-row">
              <h2>{deviceName}</h2>
              <Status tone="green">Online e Conforme</Status>
            </div>
            <p>
              {assetTag} · macOS Sequoia 15.5 · Apple M3 Pro · {department}
            </p>
          </div>
        </div>

        <div className="detail-actions">
          <Button variant="secondary" icon="edit" onClick={() => setEditModalOpen(true)}>
            Editar Cadastro
          </Button>
          <Button variant="secondary" icon="pulse" onClick={() => go('diagnostics')}>
            Diagnosticar
          </Button>
          <Button icon="terminal" onClick={() => go('commands')}>
            Executar Comando
          </Button>
        </div>
      </div>

      {/* Barra de Abas */}
      <div className="detail-tabs">
        <button className={tab === 'geral' ? 'active' : ''} onClick={() => setTab('geral')}>
          Visão geral
        </button>
        <button className={tab === 'hardware' ? 'active' : ''} onClick={() => setTab('hardware')}>
          Hardware & Disco
        </button>
        <button className={tab === 'apps' ? 'active' : ''} onClick={() => setTab('apps')}>
          Aplicativos instalados ({softwareList.length})
        </button>
        <button className={tab === 'security' ? 'active' : ''} onClick={() => setTab('security')}>
          Segurança & Políticas
        </button>
        <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>
          Trilha de eventos ({eventLogs.length})
        </button>
      </div>

      {/* ABA 1: VISÃO GERAL */}
      {tab === 'geral' && (
        <section className="device-overview">
          <div className="page-stack">
            <article className="panel device-health">
              <div className="health-score">
                <div>
                  <strong>98</strong>
                  <span>/100</span>
                </div>
                <p>Saúde excelente</p>
              </div>
              <div className="health-copy">
                <h3>Este dispositivo está seguro e em conformidade</h3>
                <p>
                  Todas as 6 políticas obrigatórias estão ativas, FileVault habilitado e nenhuma
                  ameaça foi detectada nos últimos 30 dias.
                </p>
                <div>
                  <Status tone="green">Criptografia FileVault ativa</Status>
                  <Status tone="green">Firewall corporativo ativo</Status>
                  <Status tone="green">SO atualizado</Status>
                  <Status tone="blue">Agente v4.8.2</Status>
                </div>
              </div>
            </article>

            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3>Informações gerais de inventário</h3>
                  <p>Identificação de hardware e atribuição de usuário</p>
                </div>
                <button className="text-link" onClick={() => setEditModalOpen(true)}>
                  Editar cadastro
                </button>
              </div>
              <div className="info-grid">
                {[
                  ['Nome do dispositivo', deviceName],
                  ['Responsável', owner],
                  ['Número de série', 'C02ZQ0L8MD6R'],
                  ['Modelo', 'MacBook Pro 14-inch, M3 Pro (11-core CPU, 14-core GPU)'],
                  ['Sistema operacional', 'macOS 15.5 (Build 24F74)'],
                  ['Endereço IP', '10.42.18.119 (Wi-Fi 6E)'],
                  ['MAC Address', 'F4:D4:88:51:7A:BC'],
                  ['Departamento', department],
                  ['Unidade / Setor', `${unit} · ${sector}`],
                  ['Data de ativação', '14 de março de 2024'],
                ].map((x) => (
                  <div key={x[0]}>
                    <span>{x[0]}</span>
                    <strong>{x[1]}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3>Armazenamento e memória RAM</h3>
                  <p>Telemetria de utilização em tempo real</p>
                </div>
              </div>
              <div className="resource-grid">
                <div>
                  <div>
                    <span>Armazenamento SSD</span>
                    <strong>284 GB de 512 GB</strong>
                  </div>
                  <div className="progress large">
                    <i className="os-blue" style={{ width: '55%' }} />
                  </div>
                  <small>228 GB livres (45% disponíveis)</small>
                </div>
                <div>
                  <div>
                    <span>Memória Unificada</span>
                    <strong>11,2 GB de 18 GB</strong>
                  </div>
                  <div className="progress large">
                    <i className="os-violet" style={{ width: '62%' }} />
                  </div>
                  <small>6,8 GB livres (Pressão de memória normal)</small>
                </div>
              </div>
            </article>
          </div>

          <aside className="page-stack">
            <article className="panel quick-info">
              <h3>Conexão & Rede</h3>
              <div>
                <span>Última telemetria</span>
                <strong>Agora (WebSocket ativo)</strong>
              </div>
              <div>
                <span>Versão do agente</span>
                <strong>v4.8.2 (Canal estável)</strong>
              </div>
              <div>
                <span>Ponto de acesso</span>
                <strong>
                  Novara-Corp-HQ
                  <small style={{ fontWeight: 500, color: 'var(--muted)', display: 'block', fontSize: '10px' }}>
                    BSSID: 08:ec:f5:12:44:aa
                  </small>
                </strong>
              </div>
              <div>
                <span>Uptime do sistema</span>
                <strong>8d 14h 22m</strong>
              </div>
              <div>
                <span>Bateria</span>
                <strong>94% (Carregador conectado)</strong>
              </div>
            </article>

            <article className="panel timeline-panel">
              <h3>Atividade recente do dispositivo</h3>
              {[
                { title: 'Inventário sincronizado', desc: 'Hardware, portas e 42 softwares conferidos', time: 'Há 5 min' },
                { title: 'Verificação de conformidade', desc: 'Score 98/100 · Nenhuma vulnerabilidade encontrada', time: 'Há 35 min' },
                { title: 'Política sincronizada', desc: 'Baseline corporativa v2.4 aplicada com sucesso', time: 'Hoje, 09:12' },
                { title: 'Conexão restabelecida', desc: 'Autenticado via certificado 802.1x', time: 'Hoje, 08:30' },
              ].map((a) => (
                <div className="timeline-item" key={a.title}>
                  <i />
                  <div>
                    <strong>{a.title}</strong>
                    <p>{a.desc}</p>
                    <time>{a.time}</time>
                  </div>
                </div>
              ))}
            </article>
          </aside>
        </section>
      )}

      {/* ABA 2: HARDWARE & DISCO */}
      {tab === 'hardware' && (
        <section className="tab-content-grid">
          <div className="tab-full-stack">
            {/* Card Processador e Gráficos */}
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3 className="card-section-title">Processador & Arquitetura (Apple Silicon)</h3>
                  <p className="card-section-desc">Chip Apple M3 Pro com 11 núcleos de computação e 14 núcleos gráficos</p>
                </div>
                <span className="badge-tag blue">ARM64 · 3nm</span>
              </div>

              <div className="telemetry-row">
                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>Uso de CPU</span>
                    <strong>18%</strong>
                  </div>
                  <div className="progress">
                    <i className="os-blue" style={{ width: '18%' }} />
                  </div>
                  <span className="telemetry-sub">5 Performance + 6 Eficiência</span>
                </div>

                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>Temperatura SoC</span>
                    <strong>42°C</strong>
                  </div>
                  <div className="progress">
                    <i className="os-green" style={{ width: '38%' }} />
                  </div>
                  <span className="telemetry-sub">Temperatura ideal / Estável</span>
                </div>

                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>GPU Gráfica</span>
                    <strong>14 Cores</strong>
                  </div>
                  <div className="progress">
                    <i className="os-violet" style={{ width: '24%' }} />
                  </div>
                  <span className="telemetry-sub">Ray Tracing por Hardware</span>
                </div>

                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>Neural Engine</span>
                    <strong>16 Cores</strong>
                  </div>
                  <div className="progress">
                    <i className="os-cyan" style={{ width: '12%' }} />
                  </div>
                  <span className="telemetry-sub">Até 38 TOPS de inferência</span>
                </div>
              </div>
            </article>

            {/* Card Memória RAM */}
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3 className="card-section-title">Memória Unificada do Sistema</h3>
                  <p className="card-section-desc">Arquitetura de memória compartilhada de alta largura de banda</p>
                </div>
                <Status tone="green">Pressão Normal</Status>
              </div>

              <div className="resource-grid">
                <div>
                  <div>
                    <span>Alocação Atual</span>
                    <strong>11,2 GB / 18 GB</strong>
                  </div>
                  <div className="progress large">
                    <i className="os-violet" style={{ width: '62%' }} />
                  </div>
                  <small>6,8 GB livres (Apps: 7,4 GB · Arquivos em cache: 3,8 GB)</small>
                </div>

                <div>
                  <div>
                    <span>Taxa de Transferência</span>
                    <strong>150 GB/s</strong>
                  </div>
                  <div className="progress large">
                    <i className="os-blue" style={{ width: '45%' }} />
                  </div>
                  <small>Largura de banda de barramento LPDDR5-6400 unificada</small>
                </div>
              </div>
            </article>

            {/* Card Armazenamento SSD & SMART */}
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3 className="card-section-title">Armazenamento Interno & Saúde SMART</h3>
                  <p className="card-section-desc">Unidade NVMe PCIe 4.0 criptografada por hardware</p>
                </div>
                <span className="badge-tag green">SMART: Verificado</span>
              </div>

              <div className="resource-grid">
                <div>
                  <div>
                    <span>Capacidade Utilizada</span>
                    <strong>284 GB de 512 GB</strong>
                  </div>
                  <div className="progress large">
                    <i className="os-blue" style={{ width: '55%' }} />
                  </div>
                  <small>228 GB livres · Sistema APFS selado (macOS Sequoia)</small>
                </div>

                <div>
                  <div>
                    <span>Velocidades de E/S</span>
                    <strong>3.240 MB/s Leitura</strong>
                  </div>
                  <div className="progress large">
                    <i className="os-green" style={{ width: '85%' }} />
                  </div>
                  <small>Escrita: 2.910 MB/s · 0 blocos defeituosos detectados</small>
                </div>
              </div>

              <div className="info-grid" style={{ marginTop: '20px' }}>
                <div>
                  <span>Identificador do Volume</span>
                  <strong>disk3s1s1 (Macintosh HD)</strong>
                </div>
                <div>
                  <span>Formato de Arquivos</span>
                  <strong>APFS Criptografado (XTS-AES 128)</strong>
                </div>
                <div>
                  <span>Horas de Funcionamento</span>
                  <strong>1.480 horas de operação</strong>
                </div>
                <div>
                  <span>Vida Útil Estimada da Memória NAND</span>
                  <strong>100% restante (Desgaste 0%)</strong>
                </div>
              </div>
            </article>

            {/* Card Bateria e Gerenciamento de Energia */}
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3 className="card-section-title">Bateria & Gerenciamento Térmico</h3>
                  <p className="card-section-desc">Telemetria da célula de íons de lítio e perfil de carregamento</p>
                </div>
                <Status tone="green">Saúde 94%</Status>
              </div>

              <div className="telemetry-row">
                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>Nível de Carga</span>
                    <strong>94%</strong>
                  </div>
                  <div className="progress">
                    <i className="os-green" style={{ width: '94%' }} />
                  </div>
                  <span className="telemetry-sub">MagSafe 3 conectado (70W USB-C)</span>
                </div>

                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>Ciclos de Carga</span>
                    <strong>182 / 1.000</strong>
                  </div>
                  <div className="progress">
                    <i className="os-blue" style={{ width: '18%' }} />
                  </div>
                  <span className="telemetry-sub">Condição: Normal</span>
                </div>

                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>Temperatura Célula</span>
                    <strong>28°C</strong>
                  </div>
                  <div className="progress">
                    <i className="os-cyan" style={{ width: '28%' }} />
                  </div>
                  <span className="telemetry-sub">Refrigeração passiva operante</span>
                </div>

                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>Ventoinhas</span>
                    <strong>0 RPM</strong>
                  </div>
                  <div className="progress">
                    <i className="os-green" style={{ width: '5%' }} />
                  </div>
                  <span className="telemetry-sub">Modo Silencioso Ativo</span>
                </div>
              </div>
            </article>
          </div>

          {/* Coluna Lateral de Portas e Periféricos */}
          <aside className="tab-full-stack">
            <article className="panel quick-info">
              <h3>Portas & Interfaces Físicas</h3>
              <div>
                <span>Thunderbolt 4 / USB-C</span>
                <strong>3 portas (40 Gbps, DP 1.4)</strong>
              </div>
              <div>
                <span>Saída HDMI</span>
                <strong>HDMI 2.1 (até 8K @ 60Hz)</strong>
              </div>
              <div>
                <span>Leitor de Cartão</span>
                <strong>SDXC UHS-II integrado</strong>
              </div>
              <div>
                <span>Áudio P3</span>
                <strong>Jack 3,5 mm alta impedância</strong>
              </div>
              <div>
                <span>Wi-Fi Integrado</span>
                <strong>Wi-Fi 6E (802.11ax) 160MHz</strong>
              </div>
              <div>
                <span>Bluetooth</span>
                <strong>Bluetooth 5.3 LE Audio</strong>
              </div>
              <div>
                <span>Câmera Integrada</span>
                <strong>FaceTime HD 1080p</strong>
              </div>
            </article>

            <article className="panel quick-info">
              <h3>Ações de Diagnóstico</h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
                Solicite testes de integridade física diretamente pelo canal WebSocket do agente.
              </p>
              <div style={{ border: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Button
                  variant="secondary"
                  icon="pulse"
                  onClick={() => {
                    toast.info('Coletando telemetria avançada de barramento PCIe...')
                    setTimeout(() => toast.success('SMART e sensores validados com sucesso!'), 1000)
                  }}
                >
                  Testar Sensores Térmicos
                </Button>
                <Button
                  variant="secondary"
                  icon="download"
                  onClick={() => toast.success('Especificação técnica JSON exportada!')}
                >
                  Exportar Hardware (JSON)
                </Button>
              </div>
            </article>
          </aside>
        </section>
      )}

      {/* ABA 3: APLICATIVOS INSTALADOS */}
      {tab === 'apps' && (
        <section className="page-stack">
          {/* Métricas de Softwares */}
          <div className="mini-metrics">
            <div>
              <div className="mini-icon blue">
                <Icon name="package" />
              </div>
              <div>
                <p>Total de Softwares</p>
                <strong>{softwareList.length}</strong>
              </div>
            </div>
            <div>
              <div className="mini-icon green">
                <Icon name="shield" />
              </div>
              <div>
                <p>Gerenciados pelo MDM</p>
                <strong>{softwareList.filter((s) => s.managed).length}</strong>
              </div>
            </div>
            <div>
              <div className="mini-icon amber">
                <Icon name="warning" />
              </div>
              <div>
                <p>Atualizações Pendentes</p>
                <strong>{softwareList.filter((s) => s.hasUpdate).length}</strong>
              </div>
            </div>
            <div>
              <div className="mini-icon blue">
                <Icon name="check" />
              </div>
              <div>
                <p>Conformidade de Baseline</p>
                <strong>100%</strong>
              </div>
            </div>
          </div>

          {/* Painel da Tabela de Aplicativos */}
          <article className="panel table-panel">
            <div className="table-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div className="table-search" style={{ flex: '1 1 280px' }}>
                <label className="search" style={{ width: '100%' }}>
                  <Icon name="search" />
                  <input
                    placeholder="Buscar aplicativo, fabricante ou versão..."
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div className="segmented" style={{ border: 0 }}>
                  <button
                    className={appFilter === 'all' ? 'active' : ''}
                    onClick={() => setAppFilter('all')}
                  >
                    Todos ({softwareList.length})
                  </button>
                  <button
                    className={appFilter === 'managed' ? 'active' : ''}
                    onClick={() => setAppFilter('managed')}
                  >
                    Gerenciados ({softwareList.filter((s) => s.managed).length})
                  </button>
                  <button
                    className={appFilter === 'updates' ? 'active' : ''}
                    onClick={() => setAppFilter('updates')}
                  >
                    Pendentes ({softwareList.filter((s) => s.hasUpdate).length})
                  </button>
                </div>

                <Button
                  variant="secondary"
                  icon="refresh"
                  onClick={handleScanSoftwares}
                  disabled={scanning}
                >
                  {scanning ? 'Varrendo...' : 'Forçar Varredura'}
                </Button>
                <Button icon="plus" onClick={() => setInstallModalOpen(true)}>
                  Instalar Pacote
                </Button>
              </div>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Nome do Aplicativo</th>
                    <th>Versão Instalada</th>
                    <th>Fabricante</th>
                    <th>Tamanho</th>
                    <th>Instalação</th>
                    <th>Status / Conformidade</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                        Nenhum aplicativo encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredApps.map((app) => (
                      <tr key={app.id}>
                        <td>
                          <div className="device-cell">
                            <span style={{ background: app.managed ? 'var(--primary-soft)' : '#f3f4f6', color: app.managed ? 'var(--primary)' : '#4b5563' }}>
                              <Icon name={getAppIconName(app.name, app.managed)} size={18} />
                            </span>
                            <div>
                              <strong>{app.name}</strong>
                              <small>{app.managed ? 'Empacotado via MDM' : 'Instalado pelo usuário'}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong>{app.version}</strong>
                          {app.hasUpdate && (
                            <small style={{ color: 'var(--amber)', display: 'block', fontWeight: 600 }}>
                              Disponível: v{app.updateVersion}
                            </small>
                          )}
                        </td>
                        <td>{app.vendor}</td>
                        <td>{app.size}</td>
                        <td>{app.installedAt}</td>
                        <td>
                          <Status tone={app.tone}>{app.status}</Status>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {app.hasUpdate ? (
                            <Button variant="secondary" onClick={() => handleUpdateApp(app)}>
                              Atualizar
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              icon="trash"
                              onClick={() => {
                                toast.warning(`Solicitação de desinstalação de ${app.name} enviada ao agente.`)
                              }}
                            >
                              Remover
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {/* ABA 4: SEGURANÇA & POLÍTICAS */}
      {tab === 'security' && (
        <section className="tab-content-grid">
          <div className="tab-full-stack">
            {/* Banner de Conformidade Global */}
            <article className="security-banner">
              <span>
                <Icon name="shield" size={22} />
              </span>
              <div>
                <strong>Dispositivo 100% Conforme com as Diretrizes ISO 27001 & SOC 2</strong>
                <p>
                  Criptografia ativada, EDR CrowdStrike operacional e todas as 6 políticas institucionais
                  aplicadas sem nenhuma violação.
                </p>
              </div>
              <Button
                variant="secondary"
                icon="refresh"
                onClick={handleReapplyPolicies}
                disabled={reapplyingPolicies}
              >
                {reapplyingPolicies ? 'Reaplicando...' : 'Reaplicar Políticas'}
              </Button>
            </article>

            {/* Mecanismos de Proteção Ativos */}
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3 className="card-section-title">Proteções de Sistema e Integridade Operacional</h3>
                  <p className="card-section-desc">Mecanismos nativos do macOS controlados pela console Novara</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '14px' }}>
                <div className="security-check-card">
                  <div className="security-check-icon green">
                    <Icon name="lock" size={20} />
                  </div>
                  <div className="security-check-content">
                    <h4>
                      FileVault 2 Criptografado
                      <Status tone="green">Ativo</Status>
                    </h4>
                    <p>Criptografia de disco integral XTS-AES 128 com chave institucional armazenada no Novara Vault.</p>
                  </div>
                </div>

                <div className="security-check-card">
                  <div className="security-check-icon green">
                    <Icon name="shield" size={20} />
                  </div>
                  <div className="security-check-content">
                    <h4>
                      Firewall em Modo Stealth
                      <Status tone="green">Ativo</Status>
                    </h4>
                    <p>Bloqueio preventivo de todas as conexões de entrada não-solicitadas e sondagens ICMP/Ping.</p>
                  </div>
                </div>

                <div className="security-check-card">
                  <div className="security-check-icon green">
                    <Icon name="check" size={20} />
                  </div>
                  <div className="security-check-content">
                    <h4>
                      System Integrity Protection (SIP)
                      <Status tone="green">Habilitado</Status>
                    </h4>
                    <p>Proteção do kernel e diretórios críticos do sistema restritos a nível de hardware Apple Silicon.</p>
                  </div>
                </div>

                <div className="security-check-card">
                  <div className="security-check-icon blue">
                    <Icon name="pulse" size={20} />
                  </div>
                  <div className="security-check-content">
                    <h4>
                      EDR CrowdStrike Falcon Sensor
                      <Status tone="blue">Protegido</Status>
                    </h4>
                    <p>Detecção comportamental baseada em IA e resposta contínua a ameaças de endpoint ativadas.</p>
                  </div>
                </div>

                <div className="security-check-card">
                  <div className="security-check-icon green">
                    <Icon name="user" size={20} />
                  </div>
                  <div className="security-check-content">
                    <h4>
                      Biometria & Política de Senhas
                      <Status tone="green">Conforme</Status>
                    </h4>
                    <p>Touch ID autorizado com senha alfanumérica de 12+ caracteres e bloqueio de tela automático em 5 min.</p>
                  </div>
                </div>

                <div className="security-check-card">
                  <div className="security-check-icon blue">
                    <Icon name="sliders" size={20} />
                  </div>
                  <div className="security-check-content">
                    <h4>
                      Controle de Mídias USB (DLP)
                      <Status tone="blue">Restrito</Status>
                    </h4>
                    <p>Gravação em pendrives desconhecidos bloqueada. Apenas leitura permitida sob auditoria forense.</p>
                  </div>
                </div>
              </div>
            </article>

            {/* Políticas MDM Aplicadas */}
            <article className="panel table-panel">
              <div className="table-header">
                <div>
                  <h3 className="card-section-title">Políticas Corporativas Atribuídas</h3>
                  <p className="card-section-desc" style={{ marginBottom: 0 }}>
                    Perfis de configuração instalados e gerenciados remotamente
                  </p>
                </div>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Nome da Política</th>
                      <th>Escopo</th>
                      <th>Versão</th>
                      <th>Última Aplicação</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Baseline Corporativa de Segurança macOS', scope: 'Dispositivo', ver: 'v2.4', time: 'Hoje, 09:12', tone: 'green', status: 'Conforme' },
                      { name: 'Certificado Corporativo Wi-Fi 802.1X EAP-TLS', scope: 'Rede', ver: 'v1.2', time: '14/03/2024', tone: 'green', status: 'Válido até 2027' },
                      { name: 'Túnel de Rede WireGuard Always-On VPN', scope: 'Rede', ver: 'v3.0', time: 'Hoje, 08:30', tone: 'green', status: 'Ativo' },
                      { name: 'Restrição de Senhas & Biometria Touch ID', scope: 'Usuário', ver: 'v2.0', time: 'Hoje, 09:12', tone: 'green', status: 'Conforme' },
                      { name: 'Proteção de Dados em Mídias Externas (DLP)', scope: 'Dispositivo', ver: 'v1.5', time: 'Hoje, 09:12', tone: 'green', status: 'Conforme' },
                      { name: 'Atualizações Automáticas XProtect / MRT', scope: 'Sistema', ver: 'v1.0', time: 'Hoje, 04:00', tone: 'blue', status: 'Em dia' },
                    ].map((p) => (
                      <tr key={p.name}>
                        <td>
                          <strong>{p.name}</strong>
                        </td>
                        <td>
                          <span className="badge-tag">{p.scope}</span>
                        </td>
                        <td>{p.ver}</td>
                        <td>{p.time}</td>
                        <td>
                          <Status tone={p.tone as any}>{p.status}</Status>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>

          {/* Coluna Lateral de Auditoria de Segurança */}
          <aside className="tab-full-stack">
            <article className="panel quick-info">
              <h3>Custódia de Chaves</h3>
              <div>
                <span>Chave FileVault</span>
                <strong>Custodiada no Vault</strong>
              </div>
              <div>
                <span>ID do Certificado</span>
                <strong>CERT-MAC-98421</strong>
              </div>
              <div>
                <span>Validade do Token</span>
                <strong>14/03/2027</strong>
              </div>
              <div>
                <span>Última Auditoria</span>
                <strong>Há 35 min</strong>
              </div>
            </article>

            <article className="panel quick-info">
              <h3>Ações de Segurança</h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
                Medidas administrativas de contenção e auditoria para resposta a incidentes.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Button
                  variant="secondary"
                  icon="refresh"
                  onClick={() => {
                    toast.info('Solicitando rotação de chave FileVault...')
                    setTimeout(() => toast.success('Nova chave gerada e arquivada com sucesso!'), 1200)
                  }}
                >
                  Rotacionar Chave FileVault
                </Button>
                <Button
                  variant="danger"
                  icon="lock"
                  onClick={() => {
                    toast.warning('Comando de bloqueio remoto (Lost Mode) disponível na aba de comandos.')
                    go('commands')
                  }}
                >
                  Bloquear Dispositivo
                </Button>
              </div>
            </article>
          </aside>
        </section>
      )}

      {/* ABA 5: TRILHA DE EVENTOS */}
      {tab === 'activity' && (
        <section className="page-stack">
          <article className="panel table-panel">
            <div className="table-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div className="table-search" style={{ flex: '1 1 280px' }}>
                <label className="search" style={{ width: '100%' }}>
                  <Icon name="search" />
                  <input
                    placeholder="Filtrar por evento, descrição técnica ou IP..."
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div className="segmented" style={{ border: 0 }}>
                  <button
                    className={eventFilter === 'all' ? 'active' : ''}
                    onClick={() => setEventFilter('all')}
                  >
                    Todos ({eventLogs.length})
                  </button>
                  <button
                    className={eventFilter === 'security' ? 'active' : ''}
                    onClick={() => setEventFilter('security')}
                  >
                    Segurança
                  </button>
                  <button
                    className={eventFilter === 'policy' ? 'active' : ''}
                    onClick={() => setEventFilter('policy')}
                  >
                    Políticas
                  </button>
                  <button
                    className={eventFilter === 'auth' ? 'active' : ''}
                    onClick={() => setEventFilter('auth')}
                  >
                    Autenticação
                  </button>
                </div>

                <Button variant="secondary" icon="download" onClick={handleExportAuditCSV}>
                  Exportar CSV
                </Button>
              </div>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Data & Hora</th>
                    <th>Categoria</th>
                    <th>Evento / Descrição Técnica</th>
                    <th>Origem / IP</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                        Nenhum evento registrado com os termos pesquisados.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((evt) => (
                      <tr key={evt.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <strong>{evt.time}</strong>
                        </td>
                        <td>
                          <span className="badge-tag blue">{evt.category.toUpperCase()}</span>
                        </td>
                        <td>
                          <strong>{evt.title}</strong>
                          <p style={{ color: 'var(--muted)', fontSize: '11px', margin: '2px 0 0' }}>
                            {evt.desc}
                          </p>
                        </td>
                        <td>
                          <code>{evt.ip}</code>
                        </td>
                        <td>
                          <Status tone={evt.tone}>{evt.tone === 'green' ? 'Sucesso' : evt.tone === 'amber' ? 'Atenção' : 'Info'}</Status>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Button variant="ghost" onClick={() => setEventDetailModal(evt)}>
                            Ver JSON
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {/* MODAL 1: EDITAR CADASTRO DO ATIVO */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Cadastro do Dispositivo"
        subtitle="Atualize as informações cadastrais e atribuição deste ativo"
        icon="edit"
        maxWidth={580}
      >
        <form onSubmit={handleSaveEdit} className="page-stack">
          <div className="form-grid">
            <label className="field full">
              <span>Nome de Identificação do Ativo</span>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Usuário Responsável</span>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Etiqueta de Patrimônio</span>
              <input
                type="text"
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Departamento</span>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Unidade Corporativa</span>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
              />
            </label>

            <label className="field full">
              <span>Setor / Localização Fisiográfica</span>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                required
              />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar Alterações</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: INSTALAR APLICATIVO DO CATÁLOGO */}
      <Modal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        title="Instalar Pacote de Aplicativo"
        subtitle="Selecione um pacote aprovado para envio silencioso via agente"
        icon="package"
        maxWidth={560}
      >
        <div className="page-stack">
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
            O pacote selecionado será transmitido pelo daemon e instalado sem interromper a sessão de {owner}.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { name: 'Docker Desktop v4.35', size: '1,8 GB', vendor: 'Docker Inc' },
              { name: 'Postman Enterprise v11.16', size: '190 MB', vendor: 'Postman Inc' },
              { name: 'Notion Desktop v2.44', size: '135 MB', vendor: 'Notion Labs' },
              { name: 'Wireshark Network Analyzer v4.4', size: '85 MB', vendor: 'Wireshark Foundation' },
            ].map((p) => (
              <div
                key={p.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  background: '#fafbfc',
                }}
              >
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>{p.name}</strong>
                  <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>
                    {p.vendor} · {p.size}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setInstallModalOpen(false)
                    toast.info(`Ordem de instalação de ${p.name} enfileirada no servidor...`)
                    setTimeout(() => {
                      toast.success(`${p.name} foi instalado com sucesso no dispositivo!`)
                    }, 1500)
                  }}
                >
                  Instalar
                </Button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
            <Button variant="secondary" onClick={() => setInstallModalOpen(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: VISUALIZAR PAYLOAD DO EVENTO */}
      <Modal
        isOpen={eventDetailModal !== null}
        onClose={() => setEventDetailModal(null)}
        title="Detalhes Técnicos do Evento"
        subtitle={eventDetailModal?.title}
        icon="terminal"
        maxWidth={580}
      >
        {eventDetailModal && (
          <div className="page-stack">
            <div style={{ background: 'var(--nav)', color: '#dce2f0', borderRadius: '10px', padding: '16px', fontFamily: 'monospace', fontSize: '12px', overflowX: 'auto' }}>
              <pre style={{ margin: 0 }}>
                {JSON.stringify(
                  {
                    eventId: eventDetailModal.id,
                    timestamp: eventDetailModal.time,
                    category: eventDetailModal.category,
                    clientIp: eventDetailModal.ip,
                    deviceSerial: 'C02ZQ0L8MD6R',
                    payload: eventDetailModal.payload,
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                variant="secondary"
                icon="copy"
                onClick={() => {
                  navigator.clipboard?.writeText(JSON.stringify(eventDetailModal.payload, null, 2))
                  toast.success('Payload copiado para a área de transferência!')
                }}
              >
                Copiar JSON
              </Button>
              <Button onClick={() => setEventDetailModal(null)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
