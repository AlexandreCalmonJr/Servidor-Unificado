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

interface MonitorItem {
  id: string
  model: string
  resolution: string
  refreshRate: string
  connection: string
  isPrimary: boolean
  serial: string
}

function getAppIconName(name: string, managed: boolean): import('../types').IconName {
  if (name.includes('AutoCAD') || name.includes('Revit')) return 'sliders'
  if (name.includes('Adobe') || name.includes('Photoshop')) return 'blocks'
  if (name.includes('1Password')) return 'lock'
  if (name.includes('Code') || name.includes('Terminal')) return 'terminal'
  if (name.includes('Falcon') || name.includes('CrowdStrike')) return 'shield'
  if (name.includes('Slack')) return 'agent'
  if (name.includes('Chrome')) return 'search'
  if (name.includes('Copilot') || name.includes('Microsoft')) return 'grid'
  return managed ? 'shield' : 'package'
}

export function DesktopDetail({ go }: { go: (p: PageId) => void }) {
  const [tab, setTab] = useState<'geral' | 'hardware' | 'apps' | 'security' | 'activity'>('geral')
  const toast = useToast()

  // Estados de ações
  const [wolSending, setWolSending] = useState(false)
  const [rebooting, setRebooting] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [reapplyingPolicies, setReapplyingPolicies] = useState(false)

  // Modais
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [installModalOpen, setInstallModalOpen] = useState(false)
  const [wolModalOpen, setWolModalOpen] = useState(false)
  const [eventDetailModal, setEventDetailModal] = useState<EventLogItem | null>(null)

  // Dados Cadastrais da Estação
  const [hostname, setHostname] = useState('WS-ENG-CAD01')
  const [model, setModel] = useState('Dell Precision 5860 Tower Workstation')
  const [user, setUser] = useState('Felipe Alcantara')
  const [dept, setDept] = useState('Engenharia de Estruturas & CAD')
  const [unit, setUnit] = useState('Matriz — São Paulo')
  const [sector, setSector] = useState('Prédio Engenharia · 3º Andar, Baia 14')
  const [assetTag, setAssetTag] = useState('DSK-ENG-001')
  const [ip, setIp] = useState('10.42.10.45')
  const [mac, setMac] = useState('B4:2E:99:A1:77:20')

  // Filtros
  const [appSearch, setAppSearch] = useState('')
  const [appFilter, setAppFilter] = useState<'all' | 'managed' | 'updates'>('all')
  const [eventSearch, setEventSearch] = useState('')
  const [eventFilter, setEventFilter] = useState<'all' | 'policy' | 'security' | 'auth' | 'software' | 'network'>('all')

  // Monitores
  const monitorsList: MonitorItem[] = [
    { id: 'MON-1', model: 'Dell UltraSharp 32" 6K (U3224KB)', resolution: '6144 × 3456 (6K UHD)', refreshRate: '60 Hz', connection: 'Thunderbolt 4 / DP 1.4', isPrimary: true, serial: 'CN-09381A-74261' },
    { id: 'MON-2', model: 'Dell UltraSharp 27" 4K (U2723QE)', resolution: '3840 × 2160 (4K UHD)', refreshRate: '60 Hz', connection: 'DisplayPort 1.4 Daisy-Chain', isPrimary: false, serial: 'CN-07742B-18492' },
    { id: 'MON-3', model: 'LG DualUp 28" (28MQ780) Formato 16:18', resolution: '2560 × 2880 (SDQ Vertical)', refreshRate: '60 Hz', connection: 'HDMI 2.1', isPrimary: false, serial: '904NDQJ38102' },
  ]

  // Softwares Instalados
  const [softwareList, setSoftwareList] = useState<SoftwareItem[]>([
    { id: 'sw-1', name: 'Autodesk AutoCAD 2026', vendor: 'Autodesk Inc', version: '2026.1.2', size: '4.8 GB', installedAt: '12/03/2026', managed: true, hasUpdate: false, status: 'Conforme', tone: 'green' },
    { id: 'sw-2', name: 'Autodesk Revit Structural BIM', vendor: 'Autodesk Inc', version: '2026.0.4', size: '12.4 GB', installedAt: '14/03/2026', managed: true, hasUpdate: true, updateVersion: '2026.1.0', status: 'Atualização pendente', tone: 'amber' },
    { id: 'sw-3', name: 'NVIDIA RTX Enterprise Drivers', vendor: 'NVIDIA Corp', version: '552.86 WHQL', size: '820 MB', installedAt: '20/10/2026', managed: true, hasUpdate: false, status: 'Conforme', tone: 'green' },
    { id: 'sw-4', name: 'CrowdStrike Falcon Sensor', vendor: 'CrowdStrike Inc', version: '7.18.18204', size: '95 MB', installedAt: '30/10/2026', managed: true, hasUpdate: false, status: 'EDR Operacional', tone: 'blue' },
    { id: 'sw-5', name: '1Password 8 Enterprise', vendor: 'AgileBits Inc', version: '8.10.36', size: '180 MB', installedAt: '01/10/2026', managed: true, hasUpdate: false, status: 'Conforme', tone: 'green' },
    { id: 'sw-6', name: 'Microsoft 365 Copilot Suite', vendor: 'Microsoft Corp', version: '16.89', size: '2.4 GB', installedAt: '28/10/2026', managed: true, hasUpdate: false, status: 'Conforme', tone: 'green' },
    { id: 'sw-7', name: 'Google Chrome Enterprise', vendor: 'Google LLC', version: '130.0.6723.70', size: '480 MB', installedAt: '25/10/2026', managed: true, hasUpdate: false, status: 'Conforme', tone: 'green' },
    { id: 'sw-8', name: 'Novara Agent Daemon (Workstation)', vendor: 'Novara MDM', version: '4.8.2', size: '38 MB', installedAt: '30/10/2026', managed: true, hasUpdate: false, status: 'Agente Oficial', tone: 'blue' },
  ])

  // Trilha de Eventos e Auditoria
  const eventLogs: EventLogItem[] = [
    { id: 'evt-1', time: 'Hoje, 07:15:22', category: 'network', title: 'Wake-on-LAN recebido com sucesso', desc: 'Placa Intel X550-T2 processou Magic Packet broadcast e despertou a estação do estado S5.', ip: '10.42.10.45', tone: 'green', payload: { mac: 'B4:2E:99:A1:77:20', port: 9, trigger: 'SCHEDULED_SHIFT' } },
    { id: 'evt-2', time: 'Hoje, 07:16:04', category: 'auth', title: 'Autenticação Kerberos de Domínio', desc: 'Login efetuado por Felipe Alcantara no Active Directory corporativo com sucesso.', ip: '10.42.10.45', tone: 'blue', payload: { user: 'felipe.alcantara@novara.corp', domain: 'NOVARA.CORP', authType: 'KERBEROS_V5' } },
    { id: 'evt-3', time: 'Hoje, 09:30:15', category: 'policy', title: 'Verificação de Conformidade CAD', desc: 'Drivers certificados NVIDIA Quadro Studio validados sem desvios de compatibilidade.', ip: '10.42.10.45', tone: 'green', payload: { driverVer: '552.86', isWhql: true, directX: '12 Ultimate' } },
    { id: 'evt-4', time: 'Hoje, 12:44:00', category: 'security', title: 'Sensor de Intrusão de Gabinete Verificado', desc: 'Chassis Switch reportou lacre físico intacto. Sem violação mecânica do gabinete.', ip: '10.42.10.45', tone: 'green', payload: { switchState: 'CLOSED', tamperDetected: false } },
    { id: 'evt-5', time: 'Ontem, 19:00:10', category: 'software', title: 'Varredura EDR CrowdStrike Falcon', desc: '0 arquivos maliciosos ou processos suspeitos encontrados nos 2 volumes NVMe.', ip: '10.42.10.45', tone: 'green', payload: { scannedFiles: 489210, threatsFound: 0, status: 'CLEAN' } },
    { id: 'evt-6', time: '28/10, 18:30:00', category: 'security', title: 'Suspensão programada de energia (S3)', desc: 'Estação entrou em modo de baixo consumo noturno mantendo o Wake-on-LAN armado.', ip: '10.42.10.45', tone: 'blue', payload: { sleepState: 'S3_STANDBY', wolArmed: true } },
  ]

  const handleSendWol = () => {
    setWolSending(true)
    setTimeout(() => {
      setWolSending(false)
      setWolModalOpen(false)
      toast.success(`Pacote Mágico Wake-on-LAN enviado para ${mac} (Broadcast UDP Porta 9).`)
    }, 800)
  }

  const handleReboot = () => {
    setRebooting(true)
    toast.info(`Comando de reinicialização remota enviado para ${hostname}.`)
    setTimeout(() => {
      setRebooting(false)
      toast.success(`Estação ${hostname} reiniciada e com telemetria restabelecida.`)
    }, 2200)
  }

  const handleScanSoftwares = () => {
    setScanning(true)
    toast.info('Varredura profunda de softwares em execução e drivers GPU iniciada...')
    setTimeout(() => {
      setScanning(false)
      toast.success('Varredura concluída: 54 softwares e licenças CAD conferidos.')
    }, 1200)
  }

  const handleReapplyPolicies = () => {
    setReapplyingPolicies(true)
    toast.info('Reaplicando políticas corporativas de Workstation...')
    setTimeout(() => {
      setReapplyingPolicies(false)
      toast.success('Políticas de firewall, RAID e restrição de BIOS sincronizadas!')
    }, 1200)
  }

  const handleUpdateApp = (app: SoftwareItem) => {
    toast.info(`Iniciando atualização de ${app.name} para v${app.updateVersion}...`)
    setTimeout(() => {
      setSoftwareList((prev) =>
        prev.map((item) =>
          item.id === app.id
            ? { ...item, version: item.updateVersion || item.version, hasUpdate: false, status: 'Conforme', tone: 'green' }
            : item
        )
      )
      toast.success(`${app.name} atualizado com sucesso!`)
    }, 1500)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    setEditModalOpen(false)
    toast.success('Cadastro da estação de trabalho atualizado com sucesso!')
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
        <button onClick={() => go('desktops')}>
          <Icon name="arrow" size={16} /> Voltar para estações e desktops
        </button>

        <div className="detail-device">
          <span className="detail-device-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Icon name="server" size={26} />
          </span>
          <div className="detail-device-info">
            <div className="detail-device-title-row">
              <h2>{hostname} — {model}</h2>
              <Status tone="green">Online (10 Gbps Fibra)</Status>
            </div>
            <p>
              {assetTag} · Windows 11 Pro for Workstations · Intel Xeon w5-2455X · {dept}
            </p>
          </div>
        </div>

        <div className="detail-actions">
          <Button variant="secondary" icon="refresh" onClick={() => setWolModalOpen(true)}>
            Wake-on-LAN
          </Button>
          <Button variant="secondary" icon="pulse" disabled={rebooting} onClick={handleReboot}>
            {rebooting ? 'Reiniciando...' : 'Reiniciar Estação'}
          </Button>
          <Button variant="secondary" icon="pulse" onClick={() => go('diagnostics')}>
            Diagnosticar
          </Button>
          <Button icon="terminal" onClick={() => go('commands')}>
            Executar Comando
          </Button>
          <Button variant="secondary" icon="edit" onClick={() => setEditModalOpen(true)}>
            Editar Cadastro
          </Button>
        </div>
      </div>

      {/* Barra de Abas */}
      <div className="detail-tabs">
        <button className={tab === 'geral' ? 'active' : ''} onClick={() => setTab('geral')}>
          Visão geral
        </button>
        <button className={tab === 'hardware' ? 'active' : ''} onClick={() => setTab('hardware')}>
          Hardware, Placas & Monitores (3)
        </button>
        <button className={tab === 'apps' ? 'active' : ''} onClick={() => setTab('apps')}>
          Softwares & CAD ({softwareList.length})
        </button>
        <button className={tab === 'security' ? 'active' : ''} onClick={() => setTab('security')}>
          Segurança Física & Políticas
        </button>
        <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>
          Trilha de eventos ({eventLogs.length})
        </button>
      </div>

      {/* ABA 1: VISÃO GERAL */}
      {tab === 'geral' && (
        <section className="device-overview">
          <div className="page-stack">
            {/* Health Score */}
            <article className="panel device-health">
              <div className="health-score">
                <div>
                  <strong>99</strong>
                  <span>/100</span>
                </div>
                <p>Saúde excelente</p>
              </div>
              <div className="health-copy">
                <h3>Estação de trabalho de alta performance em conformidade plena</h3>
                <p>
                  Array RAID 1 NVMe verificado, sensor óptico de intrusão fechado, drivers NVIDIA WHQL atualizados e Wake-on-LAN operacional.
                </p>
                <div>
                  <Status tone="green">Link 10 Gbps Fibra ativo</Status>
                  <Status tone="green">RAID 1 Saudável (99%)</Status>
                  <Status tone="green">TPM 2.0 Ativo</Status>
                  <Status tone="blue">Agente v4.8.2 Workstation</Status>
                </div>
              </div>
            </article>

            {/* Informações de Inventário */}
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3>Informações gerais de inventário</h3>
                  <p>Identificação física, alocação de rede e usuário responsável</p>
                </div>
                <button className="text-link" onClick={() => setEditModalOpen(true)}>
                  Editar cadastro
                </button>
              </div>
              <div className="info-grid">
                {[
                  ['Hostname na Rede', hostname],
                  ['Responsável', user],
                  ['Patrimônio / Tag', assetTag],
                  ['Modelo do Gabinete', model],
                  ['Sistema Operacional', 'Windows 11 Pro for Workstations 23H2 (Build 22631)'],
                  ['Endereço IP Estático', `${ip} (VLAN 10 - Engenharia)`],
                  ['Endereço MAC', mac],
                  ['Departamento', dept],
                  ['Unidade / Baia', `${unit} · ${sector}`],
                  ['Porta de Switch Mapeada', 'SW-ENG-CORE-01 / Gi1/0/24 (Cat6A Blindado)'],
                ].map((x) => (
                  <div key={x[0]}>
                    <span>{x[0]}</span>
                    <strong>{x[1]}</strong>
                  </div>
                ))}
              </div>
            </article>

            {/* Armazenamento e Memória */}
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3>Armazenamento RAID 1 & Memória RAM ECC</h3>
                  <p>Telemetria de utilização em tempo real</p>
                </div>
              </div>
              <div className="resource-grid">
                <div>
                  <div>
                    <span>Espaço em Disco RAID 1 NVMe</span>
                    <strong>612 GB de 1.86 TB</strong>
                  </div>
                  <div className="progress large">
                    <i className="os-blue" style={{ width: '33%' }} />
                  </div>
                  <small>1.25 TB livres (67% disponíveis · Intel VROC RAID 1)</small>
                </div>
                <div>
                  <div>
                    <span>Memória RAM DDR5 ECC</span>
                    <strong>28,4 GB de 64 GB</strong>
                  </div>
                  <div className="progress large">
                    <i className="os-green" style={{ width: '44%' }} />
                  </div>
                  <small>35,6 GB livres (4 canais ativos · Correção de erros ECC)</small>
                </div>
              </div>
            </article>
          </div>

          {/* Aside Lateral */}
          <aside className="page-stack">
            <article className="panel quick-info">
              <h3>Conexão & Rede Cabeada</h3>
              <div>
                <span>Link Ethernet</span>
                <strong>10.000 Mbps Full-Duplex (Fibra)</strong>
              </div>
              <div>
                <span>Versão do agente</span>
                <strong>v4.8.2 Workstation Daemon</strong>
              </div>
              <div>
                <span>Wake-on-LAN</span>
                <strong>
                  Habilitado (UEFI + Driver)
                  <small style={{ fontWeight: 500, color: 'var(--muted)', display: 'block', fontSize: '10px' }}>
                    Portas UDP 9 e 7
                  </small>
                </strong>
              </div>
              <div>
                <span>Uptime da estação</span>
                <strong>14 dias, 06:42 contínuos</strong>
              </div>
              <div>
                <span>Fonte redundante</span>
                <strong>1350W Platinum (184W em uso)</strong>
              </div>
            </article>

            <article className="panel timeline-panel">
              <h3>Atividade recente da estação</h3>
              {[
                { title: 'Telemetria de sensores recebida', desc: 'CPU 42°C, GPU 51°C e 3 monitores sincronizados', time: 'Há 3 min' },
                { title: 'Conformidade de licenças CAD', desc: 'AutoCAD 2026 e Revit verificados com licença de rede', time: 'Há 45 min' },
                { title: 'Backup de projetos concluído', desc: 'Sincronização com storage NAS corporativo (32 GB)', time: 'Hoje, 12:30' },
                { title: 'Wake-on-LAN matutino disparado', desc: 'Despertar automático agendado executado', time: 'Hoje, 07:15' },
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

      {/* ABA 2: HARDWARE, PLACAS & MONITORES */}
      {tab === 'hardware' && (
        <section className="tab-content-grid">
          <div className="tab-full-stack">
            {/* Card Processador e GPU */}
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3 className="card-section-title">Processador Workstation & GPU Profissional</h3>
                  <p className="card-section-desc">Intel Xeon w5-2455X (16 núcleos/32 threads) + NVIDIA RTX A4500 20GB GDDR6 ECC</p>
                </div>
                <span className="badge-tag blue">LGA4677 · ECC Ativo</span>
              </div>

              <div className="telemetry-row">
                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>Uso da CPU Xeon</span>
                    <strong>24%</strong>
                  </div>
                  <div className="progress">
                    <i className="os-blue" style={{ width: '24%' }} />
                  </div>
                  <span className="telemetry-sub">Clock Turbo: 4.6 GHz</span>
                </div>

                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>Temperatura CPU</span>
                    <strong>42°C</strong>
                  </div>
                  <div className="progress">
                    <i className="os-green" style={{ width: '38%' }} />
                  </div>
                  <span className="telemetry-sub">Refrigeração Líquida (1.420 RPM)</span>
                </div>

                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>VRAM GPU RTX</span>
                    <strong>8.2 GB / 20 GB</strong>
                  </div>
                  <div className="progress">
                    <i className="os-violet" style={{ width: '41%' }} />
                  </div>
                  <span className="telemetry-sub">Drivers Quadro Studio 552.86</span>
                </div>

                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>Temperatura GPU</span>
                    <strong>51°C</strong>
                  </div>
                  <div className="progress">
                    <i className="os-green" style={{ width: '48%' }} />
                  </div>
                  <span className="telemetry-sub">Hotspot: 58°C (Normal)</span>
                </div>
              </div>
            </article>

            {/* Card Monitores Multi-Display */}
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3 className="card-section-title">Arranjo Multi-Display Conectado ({monitorsList.length} Telas)</h3>
                  <p className="card-section-desc">Área total de trabalho combinada de 15.360 × 2.880 pixels</p>
                </div>
                <Button
                  variant="secondary"
                  icon="sliders"
                  onClick={() => toast.success('Calibração de cores DCI-P3 enviada aos 3 monitores!')}
                >
                  Calibrar Perfis ICC
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '14px' }}>
                {monitorsList.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      background: 'var(--surface-sunken)',
                      border: `1px solid ${m.isPrimary ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      borderRadius: '8px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: '13px' }}>{m.model}</strong>
                      <span className={`badge-tag ${m.isPrimary ? 'blue' : 'gray'}`}>
                        {m.isPrimary ? 'PRIMÁRIO' : 'SECUNDÁRIO'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div><strong>Resolução:</strong> {m.resolution} @ {m.refreshRate}</div>
                      <div><strong>Porta:</strong> {m.connection}</div>
                      <div><strong>Serial:</strong> <code>{m.serial}</code></div>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            {/* Card Armazenamento RAID 1 */}
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3 className="card-section-title">Subsistema de Disco RAID 1 Espelhado</h3>
                  <p className="card-section-desc">2x 2TB Kioxia XG8 NVMe PCIe 4.0 via Intel VROC Hardware Key</p>
                </div>
                <span className="badge-tag green">RAID 1: Espelhado & Sincronizado</span>
              </div>
              <div className="info-grid">
                <div>
                  <span>Saúde dos Discos</span>
                  <strong>99% (TBW: 24 TB gravados)</strong>
                </div>
                <div>
                  <span>Velocidade de Leitura</span>
                  <strong>7.000 MB/s Sequencial</strong>
                </div>
                <div>
                  <span>Velocidade de Escrita</span>
                  <strong>5.800 MB/s Sequencial</strong>
                </div>
                <div>
                  <span>Temperatura M.2</span>
                  <strong>36°C com dissipador de alumínio</strong>
                </div>
              </div>
            </article>
          </div>

          {/* Coluna Lateral de Portas e Diagnósticos */}
          <aside className="tab-full-stack">
            <article className="panel quick-info">
              <h3>Portas & Interfaces Físicas</h3>
              <div>
                <span>Rede 10GbE</span>
                <strong>1x RJ45 10Gbps (Intel X550)</strong>
              </div>
              <div>
                <span>Saídas de Vídeo</span>
                <strong>4x DisplayPort 1.4a c/ trava</strong>
              </div>
              <div>
                <span>Portas USB Frontais</span>
                <strong>2x USB-C 3.2 20Gbps + 2x USB-A</strong>
              </div>
              <div>
                <span>Portas USB Traseiras</span>
                <strong>6x USB-A 3.2 + 2x USB-C</strong>
              </div>
              <div>
                <span>Áudio Profissional</span>
                <strong>Realtek ALC3246-CG HD Audio</strong>
              </div>
              <div>
                <span>Leitor de Mídia</span>
                <strong>SD Express 7.0 frontal</strong>
              </div>
            </article>

            <article className="panel quick-info">
              <h3>Ações de Diagnóstico</h3>
              <div style={{ border: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Button
                  variant="secondary"
                  icon="pulse"
                  onClick={() => {
                    toast.info('Coletando telemetria de sensores da placa-mãe...')
                    setTimeout(() => toast.success('Tensões e sensores térmicos 100% aprovados!'), 1000)
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

          <article className="panel table-panel">
            <div className="table-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div className="table-search" style={{ flex: '1 1 280px' }}>
                <label className="search" style={{ width: '100%' }}>
                  <Icon name="search" />
                  <input
                    placeholder="Buscar software CAD, driver ou utilitário..."
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
                        Nenhum software encontrado para o filtro.
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
                              <small>{app.managed ? 'Empacotado via MDM' : 'Instalado pelo técnico'}</small>
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
                              onClick={() => toast.warning(`Solicitação de desinstalação de ${app.name} enviada.`)}
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
            <article className="security-banner">
              <span>
                <Icon name="shield" size={22} />
              </span>
              <div>
                <strong>Workstation 100% Conforme com as Diretrizes ISO 27001 & SOC 2</strong>
                <p>
                  Chassis lacrado, TPM 2.0 ativo, EDR CrowdStrike operacional e políticas de firewall aplicadas sem desvios.
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

            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3 className="card-section-title">Proteções Físicas, Hardware & Integridade Operacional</h3>
                  <p className="card-section-desc">Mecanismos de hardware e BIOS UEFI monitorados pelo agente</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '14px' }}>
                <div className="security-check-card">
                  <div className="security-check-icon green">
                    <Icon name="lock" size={20} />
                  </div>
                  <div className="security-check-content">
                    <h4>
                      BitLocker Hardware Crypto
                      <Status tone="green">Ativo</Status>
                    </h4>
                    <p>Criptografia TPM 2.0 nos 2 volumes NVMe espelhados com chave PCR 7 validada.</p>
                  </div>
                </div>

                <div className="security-check-card">
                  <div className="security-check-icon green">
                    <Icon name="shield" size={20} />
                  </div>
                  <div className="security-check-content">
                    <h4>
                      Sensor de Intrusão de Gabinete
                      <Status tone="green">Lacrado</Status>
                    </h4>
                    <p>Chassis fechado. O switch mecânico não registrou abertura da tampa nos últimos 180 dias.</p>
                  </div>
                </div>

                <div className="security-check-card">
                  <div className="security-check-icon green">
                    <Icon name="check" size={20} />
                  </div>
                  <div className="security-check-content">
                    <h4>
                      Secure Boot UEFI & Senha BIOS
                      <Status tone="green">Habilitado</Status>
                    </h4>
                    <p>Boot protegido por senha de supervisor na BIOS. Boot por pendrive externo bloqueado.</p>
                  </div>
                </div>

                <div className="security-check-card">
                  <div className="security-check-icon blue">
                    <Icon name="pulse" size={20} />
                  </div>
                  <div className="security-check-content">
                    <h4>
                      EDR CrowdStrike Falcon
                      <Status tone="blue">Protegido</Status>
                    </h4>
                    <p>Sensor v7.18 conectado na nuvem CrowdStrike com prevenção comportamental ativa.</p>
                  </div>
                </div>
              </div>
            </article>

            {/* Tabela de Políticas */}
            <article className="panel table-panel">
              <div className="table-header">
                <div>
                  <h3 className="card-section-title">Políticas de Workstation Atribuídas</h3>
                  <p className="card-section-desc" style={{ marginBottom: 0 }}>
                    Perfis de configuração instalados e mantidos remotamente
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
                      { name: 'Baseline Workstation Windows 11 Enterprise', scope: 'Dispositivo', ver: 'v3.1', time: 'Hoje, 07:16', tone: 'green', status: 'Conforme' },
                      { name: 'Regras de Wake-on-LAN & Economia de Energia', scope: 'Hardware', ver: 'v2.0', time: 'Hoje, 07:15', tone: 'green', status: 'Ativo' },
                      { name: 'Controle de Mídias USB e Discos Externos', scope: 'Segurança', ver: 'v1.4', time: 'Hoje, 07:16', tone: 'green', status: 'Conforme' },
                      { name: 'Certificação de Drivers Gráficos NVIDIA Quadro', scope: 'Software', ver: 'v2.2', time: 'Ontem, 18:00', tone: 'green', status: 'Homologado' },
                    ].map((p) => (
                      <tr key={p.name}>
                        <td><strong>{p.name}</strong></td>
                        <td><span className="badge-tag">{p.scope}</span></td>
                        <td>{p.ver}</td>
                        <td>{p.time}</td>
                        <td><Status tone={p.tone as any}>{p.status}</Status></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>

          <aside className="tab-full-stack">
            <article className="panel quick-info">
              <h3>Custódia de Chaves & Certificados</h3>
              <div>
                <span>Chave BitLocker</span>
                <strong>Custodiada no Novara Vault</strong>
              </div>
              <div>
                <span>Certificado da Estação</span>
                <strong>CERT-WS-ENG-001 (Válido até 2028)</strong>
              </div>
              <div>
                <span>Integridade de Lacre</span>
                <strong>Conferida hoje às 07:15</strong>
              </div>
            </article>
          </aside>
        </section>
      )}

      {/* ABA 5: TRILHA DE EVENTOS & AUDITORIA */}
      {tab === 'activity' && (
        <section className="page-stack">
          <div className="table-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div className="table-search" style={{ flex: '1 1 280px' }}>
              <label className="search" style={{ width: '100%' }}>
                <Icon name="search" />
                <input
                  placeholder="Buscar eventos por título, descrição ou IP..."
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
                  className={eventFilter === 'network' ? 'active' : ''}
                  onClick={() => setEventFilter('network')}
                >
                  Rede & WOL
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
              </div>

              <Button
                variant="secondary"
                icon="download"
                onClick={() => toast.success('Relatório de auditoria CSV exportado com sucesso!')}
              >
                Exportar CSV
              </Button>
            </div>
          </div>

          <article className="panel table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Horário</th>
                    <th>Categoria</th>
                    <th>Título do Evento</th>
                    <th>Detalhes da Operação</th>
                    <th>Endereço IP</th>
                    <th style={{ textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((evt) => (
                    <tr key={evt.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>{evt.time}</td>
                      <td>
                        <span className={`badge-tag ${evt.tone === 'green' ? 'green' : evt.tone === 'blue' ? 'blue' : 'amber'}`}>
                          {evt.category.toUpperCase()}
                        </span>
                      </td>
                      <td><strong>{evt.title}</strong></td>
                      <td style={{ maxWidth: '420px', color: 'var(--text-secondary)', fontSize: '13px' }}>{evt.desc}</td>
                      <td><code>{evt.ip}</code></td>
                      <td style={{ textAlign: 'right' }}>
                        <Button
                          variant="ghost"
                          icon="eye"
                          onClick={() => setEventDetailModal(evt)}
                        >
                          Payload
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {/* MODAL 1: EDITAR CADASTRO */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Cadastro da Estação de Trabalho"
      >
        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Hostname na Rede
            </label>
            <input
              type="text"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-primary)' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Usuário / Responsável
              </label>
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Departamento
              </label>
              <input
                type="text"
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Endereço IP Estático
              </label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Endereço MAC Ethernet
              </label>
              <input
                type="text"
                value={mac}
                onChange={(e) => setMac(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancelar</Button>
            <Button type="submit" icon="check">Salvar Alterações</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ENVIAR WAKE-ON-LAN */}
      <Modal
        isOpen={wolModalOpen}
        onClose={() => setWolModalOpen(false)}
        title="Disparar Pacote Mágico Wake-on-LAN"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            O sinal de despertar será transmitido via broadcast UDP na porta 9 para a interface cabeada da estação.
          </p>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Endereço MAC Alvo
            </label>
            <input
              type="text"
              readOnly
              value={mac}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setWolModalOpen(false)}>Cancelar</Button>
            <Button icon="refresh" disabled={wolSending} onClick={handleSendWol}>
              {wolSending ? 'Enviando...' : 'Transmitir Magic Packet'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: INSTALAR PACOTE */}
      <Modal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        title="Distribuir Novo Pacote de Software"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Selecione um pacote aprovado no Catálogo Corporativo para instalação silenciosa na estação:
          </p>
          <select style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-primary)' }}>
            <option>Autodesk 3ds Max 2026 (Instalação Silenciosa)</option>
            <option>Blender 4.2 LTS Enterprise Pack</option>
            <option>Visual Studio Enterprise 2024</option>
            <option>Wireshark Network Analyzer v4.4</option>
          </select>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setInstallModalOpen(false)}>Cancelar</Button>
            <Button icon="check" onClick={() => { setInstallModalOpen(false); toast.success('Ordem de instalação transmitida para o agente!'); }}>
              Instalar Silenciosamente
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: PAYLOAD DO EVENTO */}
      <Modal
        isOpen={!!eventDetailModal}
        onClose={() => setEventDetailModal(null)}
        title={`Evento de Auditoria: ${eventDetailModal?.title || ''}`}
      >
        {eventDetailModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              <strong>Timestamp:</strong> {eventDetailModal.time} • <strong>IP de Origem:</strong> <code>{eventDetailModal.ip}</code>
            </div>
            <p style={{ margin: 0, fontSize: '13px' }}>{eventDetailModal.desc}</p>
            <pre style={{ background: '#090d16', color: '#38bdf8', padding: '14px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto' }}>
              {JSON.stringify(eventDetailModal.payload, null, 2)}
            </pre>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button variant="secondary" onClick={() => setEventDetailModal(null)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
