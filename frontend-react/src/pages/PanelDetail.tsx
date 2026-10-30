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

interface ChannelOption {
  id: string
  name: string
  type: string
  resolution: string
}

function getAppIconName(name: string, managed: boolean): import('../types').IconName {
  if (name.includes('Chromium') || name.includes('Browser')) return 'search'
  if (name.includes('Signage') || name.includes('Player')) return 'blocks'
  if (name.includes('Watchdog') || name.includes('Daemon')) return 'shield'
  if (name.includes('WebSocket') || name.includes('Queue')) return 'pulse'
  return managed ? 'shield' : 'package'
}

const availableChannels: ChannelOption[] = [
  { id: 'CHN-01', name: 'Canal 01 — Chamada de Senhas & Triagem Médica', type: 'WebSocket Live Feed + Mídia Informativa', resolution: '4K UHD' },
  { id: 'CHN-02', name: 'Canal 02 — Institucional, Marcas & Metas 2026', type: 'Vídeos MP4 4K H.265 60fps + Clima', resolution: '4K UHD' },
  { id: 'CHN-03', name: 'Canal 03 — Cardápio Interativo Cafeteria', type: 'HTML5 Dynamic Menuboard', resolution: 'Retrato 4K' },
  { id: 'CHN-04', name: 'Canal 04 — Grade de Palestras & Ocupação', type: 'Google Calendar & Outlook Room Finder', resolution: 'Retrato Full HD' },
  { id: 'CHN-05', name: 'Canal 05 — Notícias RH & Endomarketing', type: 'Slideshow PPTX / Canva Automático', resolution: '4K UHD' },
]

export function PanelDetail({ go }: { go: (p: PageId) => void }) {
  const [tab, setTab] = useState<'geral' | 'hardware' | 'apps' | 'security' | 'activity'>('geral')
  const toast = useToast()

  // Estados do Painel
  const [isCecOn, setIsCecOn] = useState(true)
  const [brightness, setBrightness] = useState(90)
  const [volume, setVolume] = useState(65)
  const [currentChannel, setCurrentChannel] = useState(availableChannels[0].name)
  const [emergencyAlertActive, setEmergencyAlertActive] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [reapplyingPolicies, setReapplyingPolicies] = useState(false)

  // Modais
  const [channelModalOpen, setChannelModalOpen] = useState(false)
  const [selectedChannelId, setSelectedChannelId] = useState('CHN-01')
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false)
  const [emergencyText, setEmergencyText] = useState('SIMULADO DE EVACUAÇÃO: Dirija-se à saída de emergência mais próxima.')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [installModalOpen, setInstallModalOpen] = useState(false)
  const [eventDetailModal, setEventDetailModal] = useState<EventLogItem | null>(null)

  // Dados Cadastrais
  const [name, setName] = useState('Painel Triagem & Chamada de Senhas')
  const [location, setLocation] = useState('Prédio Matriz — Térreo (Hall Principal)')
  const [unit, setUnit] = useState('Matriz — São Paulo')
  const [resolution, setResolution] = useState('4K UHD (3840×2160 @ 60Hz)')
  const [orientation, setOrientation] = useState<'Paisagem' | 'Retrato'>('Paisagem')
  const [playerType, setPlayerType] = useState('Intel NUC 13 Pro Mini PC (Core i5-1340P)')
  const [assetTag, setAssetTag] = useState('PNL-TRI-001')
  const [ip, setIp] = useState('10.42.30.12')
  const [mac, setMac] = useState('70:85:C2:A1:04:1E')

  // Filtros
  const [appSearch, setAppSearch] = useState('')
  const [appFilter, setAppFilter] = useState<'all' | 'managed' | 'updates'>('all')
  const [eventSearch, setEventSearch] = useState('')
  const [eventFilter, setEventFilter] = useState<'all' | 'policy' | 'security' | 'auth' | 'software' | 'network'>('all')

  // Softwares do Player Signage
  const [softwareList, setSoftwareList] = useState<SoftwareItem[]>([
    { id: 'p-sw-1', name: 'Novara Signage Player Engine', vendor: 'Novara MDM', version: '5.2.0', size: '120 MB', installedAt: '20/10/2026', managed: true, hasUpdate: false, status: 'Conforme', tone: 'green' },
    { id: 'p-sw-2', name: 'Chromium Embedded Framework (CEF)', vendor: 'Google LLC', version: '126.0.6478.182', size: '380 MB', installedAt: '15/10/2026', managed: true, hasUpdate: false, status: 'Conforme', tone: 'green' },
    { id: 'p-sw-3', name: 'WebSocket Live Queue Daemon', vendor: 'Novara Systems', version: '2.4.1', size: '42 MB', installedAt: '28/10/2026', managed: true, hasUpdate: true, updateVersion: '2.5.0', status: 'Atualização pendente', tone: 'amber' },
    { id: 'p-sw-4', name: 'Hardware Video Decoder (H.265/HEVC)', vendor: 'Intel Corp', version: '31.0.101', size: '210 MB', installedAt: '12/09/2026', managed: true, hasUpdate: false, status: 'Conforme', tone: 'green' },
    { id: 'p-sw-5', name: 'Watchdog & HDMI-CEC Controller', vendor: 'Novara IoT Core', version: '1.8.4', size: '18 MB', installedAt: '30/10/2026', managed: true, hasUpdate: false, status: 'Controlador Ativo', tone: 'blue' },
  ])

  // Trilha de Eventos e Auditoria
  const eventLogs: EventLogItem[] = [
    { id: 'evt-1', time: 'Hoje, 07:00:02', category: 'network', title: 'Comando HDMI-CEC Despertar Executado', desc: 'Display de LED 4K aceso automaticamente conforme cronograma matutino de expediente.', ip: '10.42.30.12', tone: 'green', payload: { cecCommand: 'POWER_ON', bus: 'HDMI_1', result: 'DISPLAY_ACTIVE' } },
    { id: 'evt-2', time: 'Hoje, 07:01:10', category: 'software', title: 'Canal de Senhas Sincronizado', desc: 'Conexão WebSocket com o servidor de triagem médica estabelecida com 18ms de latência.', ip: '10.42.30.12', tone: 'blue', payload: { channel: 'CHN-01', socketStatus: 'OPEN', latencyMs: 18 } },
    { id: 'evt-3', time: 'Hoje, 11:30:00', category: 'policy', title: 'Proteção contra Burn-in Executada', desc: 'Deslocamento de 3 pixels acionado sutilmente para preservar a matriz de fósforo/LED.', ip: '10.42.30.12', tone: 'green', payload: { shiftX: 3, shiftY: 2, intervalMin: 15 } },
    { id: 'evt-4', time: 'Ontem, 21:30:00', category: 'network', title: 'Comando HDMI-CEC Standby Noturno', desc: 'Display colocado em suspensão de tela para economia de energia fora do expediente.', ip: '10.42.30.12', tone: 'amber', payload: { cecCommand: 'STANDBY', powerSavingWatts: 140 } },
  ]

  const handleToggleCec = () => {
    const next = !isCecOn
    setIsCecOn(next)
    if (next) {
      toast.success('Comando HDMI-CEC: Display aceso com sucesso.')
    } else {
      toast.warning('Comando HDMI-CEC: Display colocado em Standby (Tela apagada).')
    }
  }

  const handleSaveChannel = () => {
    const ch = availableChannels.find((c) => c.id === selectedChannelId)
    if (ch) {
      setCurrentChannel(ch.name)
      setChannelModalOpen(false)
      toast.success(`Canal alterado para: ${ch.name}`)
    }
  }

  const handleBroadcastEmergency = () => {
    setEmergencyAlertActive(true)
    setEmergencyModalOpen(false)
    toast.error('Alerta de Emergência transmitido: Tela sobrescrita com mensagem de aviso prioritário!')
  }

  const handleDismissEmergency = () => {
    setEmergencyAlertActive(false)
    toast.success('Alerta de Emergência finalizado: Programação normal restaurada.')
  }

  const handleScanSoftwares = () => {
    setScanning(true)
    toast.info('Verificando integridade do engine Chromium e cache de mídias...')
    setTimeout(() => {
      setScanning(false)
      toast.success('Varredura concluída: Player 100% íntegro e sincronizado.')
    }, 1200)
  }

  const handleReapplyPolicies = () => {
    setReapplyingPolicies(true)
    toast.info('Reaplicando políticas de Kiosk e horários HDMI-CEC...')
    setTimeout(() => {
      setReapplyingPolicies(false)
      toast.success('Políticas do painel sincronizadas com sucesso!')
    }, 1200)
  }

  const handleUpdateApp = (app: SoftwareItem) => {
    toast.info(`Atualizando ${app.name} para v${app.updateVersion}...`)
    setTimeout(() => {
      setSoftwareList((prev) =>
        prev.map((item) =>
          item.id === app.id
            ? { ...item, version: item.updateVersion || item.version, hasUpdate: false, status: 'Conforme', tone: 'green' }
            : item
        )
      )
      toast.success(`${app.name} atualizado com sucesso no player!`)
    }, 1500)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    setEditModalOpen(false)
    toast.success('Cadastro do painel de signage atualizado com sucesso!')
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
      {/* Banner de Emergência */}
      {emergencyAlertActive && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ color: '#ef4444', display: 'flex' }}>
              <Icon name="warning" />
            </span>
            <div>
              <strong style={{ color: '#ef4444', fontSize: '15px' }}>
                ALERTA DE EMERGÊNCIA ATIVO NESTA TELA
              </strong>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {emergencyText}
              </p>
            </div>
          </div>
          <Button variant="danger" icon="check" onClick={handleDismissEmergency}>
            Encerrar Alerta
          </Button>
        </div>
      )}

      {/* Cabeçalho do Ativo */}
      <div className="detail-heading">
        <button onClick={() => go('panels')}>
          <Icon name="arrow" size={16} /> Voltar para inventário de painéis & signage
        </button>

        <div className="detail-device">
          <span className="detail-device-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Icon name="blocks" size={26} />
          </span>
          <div className="detail-device-info">
            <div className="detail-device-title-row">
              <h2>{name}</h2>
              <Status tone={isCecOn ? 'green' : 'amber'}>
                {isCecOn ? 'HDMI-CEC Ligado (4K UHD)' : 'Standby / Tela Apagada'}
              </Status>
            </div>
            <p>
              {assetTag} · {resolution} · {orientation} · {location}
            </p>
          </div>
        </div>

        <div className="detail-actions">
          <Button variant="secondary" icon="refresh" onClick={handleToggleCec}>
            {isCecOn ? 'Standby (CEC)' : 'Acender Tela (CEC)'}
          </Button>
          <Button variant="secondary" icon="blocks" onClick={() => setChannelModalOpen(true)}>
            Alterar Canal
          </Button>
          <Button variant="danger" icon="warning" onClick={() => setEmergencyModalOpen(true)}>
            Alerta de Emergência
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
          Hardware do Player, Tela & HDMI
        </button>
        <button className={tab === 'apps' ? 'active' : ''} onClick={() => setTab('apps')}>
          Softwares do Player ({softwareList.length})
        </button>
        <button className={tab === 'security' ? 'active' : ''} onClick={() => setTab('security')}>
          Segurança Kiosk & Horários
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
                <h3>Painel digital de sinalização operando com máxima estabilidade</h3>
                <p>
                  Barramento HDMI-CEC ativo, decodificador 4K por hardware sem engasgos, conexão WebSocket em tempo real e proteção anti burn-in habilitada.
                </p>
                <div>
                  <Status tone="green">HDMI-CEC Ligado</Status>
                  <Status tone="green">Resolução 4K UHD 60Hz</Status>
                  <Status tone="green">Latência WebSocket 18ms</Status>
                  <Status tone="blue">Engine CEF v126</Status>
                </div>
              </div>
            </article>

            {/* Informações de Inventário */}
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3>Informações gerais de inventário signage</h3>
                  <p>Identificação física, localização predial e canal atribuído</p>
                </div>
                <button className="text-link" onClick={() => setEditModalOpen(true)}>
                  Editar cadastro
                </button>
              </div>
              <div className="info-grid">
                {[
                  ['Identificação do Painel', name],
                  ['Localização Física', location],
                  ['Unidade / Pavilhão', unit],
                  ['Canal Ativo em Exibição', currentChannel],
                  ['Resolução Nativa da Matriz', resolution],
                  ['Orientação Física', orientation],
                  ['Hardware do Microcomputador', playerType],
                  ['Endereço IP Estático', `${ip} (VLAN 30 - Mídia)`],
                  ['Endereço MAC da Interface', mac],
                  ['Uptime Contínuo do Player', '34 dias sem reinicializações'],
                ].map((x) => (
                  <div key={x[0]}>
                    <span>{x[0]}</span>
                    <strong>{x[1]}</strong>
                  </div>
                ))}
              </div>
            </article>

            {/* Prévia da Tela & Armazenamento */}
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3>Prévia ao Vivo do Feed & Armazenamento de Cache</h3>
                  <p>Simulação em tempo real da tela e ocupação do SSD local</p>
                </div>
              </div>

              {/* Feed Simulado */}
              <div
                style={{
                  background: '#090d16',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '20px',
                  color: '#ffffff',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                    <strong style={{ fontSize: '13px', letterSpacing: '0.5px' }}>NOVARA HOSPITAL & CLINICS — TRIAGEM CENTRAL</strong>
                  </div>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>17:42 • 24°C Ensolarado</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'center', marginTop: '14px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>ÚLTIMA SENHA CHAMADA</span>
                    <div style={{ fontSize: '42px', fontWeight: 900, color: '#38bdf8', margin: '4px 0' }}>A — 894</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>CONSULTÓRIO 04 · TRIAGEM MÉDICA</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <strong style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Senhas Recentes</strong>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Senha #A-893</span>
                      <strong style={{ color: '#94a3b8' }}>Guichê 02</strong>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Senha #P-042</span>
                      <strong style={{ color: '#94a3b8' }}>Prioritário 01</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="resource-grid">
                <div>
                  <div>
                    <span>Cache de Vídeos e Mídias</span>
                    <strong>42 GB de 256 GB</strong>
                  </div>
                  <div className="progress large">
                    <i className="os-blue" style={{ width: '16%' }} />
                  </div>
                  <small>214 GB livres no SSD do Mini PC</small>
                </div>
                <div>
                  <div>
                    <span>Memória RAM do Player</span>
                    <strong>3.4 GB de 16 GB</strong>
                  </div>
                  <div className="progress large">
                    <i className="os-green" style={{ width: '21%' }} />
                  </div>
                  <small>12.6 GB livres (Execução suave sem travamentos)</small>
                </div>
              </div>
            </article>
          </div>

          {/* Aside Lateral */}
          <aside className="page-stack">
            <article className="panel quick-info">
              <h3>Conexão & Barramento HDMI</h3>
              <div>
                <span>Status HDMI-CEC</span>
                <strong>{isCecOn ? 'Ligado (Painel ativo)' : 'Standby / Tela apagada'}</strong>
              </div>
              <div>
                <span>Brilho da Tela</span>
                <strong>{brightness}%</strong>
              </div>
              <div>
                <span>Volume de Áudio</span>
                <strong>{volume}%</strong>
              </div>
              <div>
                <span>Automação Horária</span>
                <strong>07:00 Ligar · 21:30 Standby</strong>
              </div>
              <div>
                <span>Uptime do Sistema</span>
                <strong>34 dias contínuos</strong>
              </div>
            </article>

            <article className="panel timeline-panel">
              <h3>Atividade recente do painel</h3>
              {[
                { title: 'Senha #A-894 transmitida', desc: 'Sinal sonoro disparado no volume 65%', time: 'Há 2 min' },
                { title: 'Playlist dinâmica atualizada', desc: 'Feed WebSocket sincronizado com sucesso', time: 'Há 12 min' },
                { title: 'Burn-in protection executada', desc: 'Deslocamento de 3 pixels concluído', time: 'Há 30 min' },
                { title: 'Acendimento automático CEC', desc: 'Display ligado pontualmente às 07:00', time: 'Hoje, 07:00' },
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

      {/* ABA 2: HARDWARE DO PLAYER, TELA & HDMI */}
      {tab === 'hardware' && (
        <section className="tab-content-grid">
          <div className="tab-full-stack">
            {/* CPU e Decoder */}
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3 className="card-section-title">Hardware do Player & Desempenho</h3>
                  <p className="card-section-desc">Intel NUC 13 Pro Mini PC com decodificação de vídeo 4K por hardware</p>
                </div>
                <span className="badge-tag blue">Core i5-1340P · 16GB RAM</span>
              </div>

              <div className="telemetry-row">
                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>Uso da CPU</span>
                    <strong>14%</strong>
                  </div>
                  <div className="progress">
                    <i className="os-blue" style={{ width: '14%' }} />
                  </div>
                  <span className="telemetry-sub">Decodificação H.265 fluida</span>
                </div>

                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>Temperatura Mini PC</span>
                    <strong>44°C</strong>
                  </div>
                  <div className="progress">
                    <i className="os-green" style={{ width: '40%' }} />
                  </div>
                  <span className="telemetry-sub">Operação silenciosa contínua</span>
                </div>

                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>Brilho da Matriz</span>
                    <strong>{brightness}%</strong>
                  </div>
                  <div className="progress">
                    <i className="os-cyan" style={{ width: `${brightness}%` }} />
                  </div>
                  <span className="telemetry-sub">Sensor ambiente integrado</span>
                </div>

                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>Volume de Áudio</span>
                    <strong>{volume}%</strong>
                  </div>
                  <div className="progress">
                    <i className="os-violet" style={{ width: `${volume}%` }} />
                  </div>
                  <span className="telemetry-sub">Chimes de senhas audíveis</span>
                </div>
              </div>
            </article>

            {/* Ajustes de Display */}
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3 className="card-section-title">Ajustes Finos de Iluminação e Áudio</h3>
                  <p className="card-section-desc">Controle remoto de hardware transmitido via barramento HDMI-CEC</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                    <span>Brilho da Tela:</span>
                    <strong>{brightness}%</strong>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={brightness}
                    onChange={(e) => {
                      setBrightness(Number(e.target.value))
                      toast.info(`Brilho ajustado para ${e.target.value}% via HDMI-CEC`)
                    }}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                    <span>Volume dos Chamadores de Senha:</span>
                    <strong>{volume}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => {
                      setVolume(Number(e.target.value))
                      toast.info(`Volume ajustado para ${e.target.value}%`)
                    }}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </article>
          </div>

          <aside className="tab-full-stack">
            <article className="panel quick-info">
              <h3>Portas & Interfaces Físicas</h3>
              <div>
                <span>Saída HDMI</span>
                <strong>HDMI 2.1 com HDMI-CEC ativo</strong>
              </div>
              <div>
                <span>Interface Ethernet</span>
                <strong>Intel I226-V 2.5 GbE (PoE+)</strong>
              </div>
              <div>
                <span>USB do Player</span>
                <strong>4x USB 3.2 Gen 2 (10 Gbps)</strong>
              </div>
              <div>
                <span>Áudio Out</span>
                <strong>HDMI Audio + 3.5mm estéreo</strong>
              </div>
            </article>

            <article className="panel quick-info">
              <h3>Ações de Diagnóstico</h3>
              <div style={{ border: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Button
                  variant="secondary"
                  icon="pulse"
                  onClick={() => {
                    toast.info('Testando handshake HDMI-CEC com a tela...')
                    setTimeout(() => toast.success('Tela respondeu OK ao comando CEC!'), 1000)
                  }}
                >
                  Testar Barramento HDMI-CEC
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

      {/* ABA 3: SOFTWARES DO PLAYER */}
      {tab === 'apps' && (
        <section className="page-stack">
          <div className="mini-metrics">
            <div>
              <div className="mini-icon blue">
                <Icon name="package" />
              </div>
              <div>
                <p>Módulos do Player</p>
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
                <p>Watchdog Ativo</p>
                <strong>100% Online</strong>
              </div>
            </div>
          </div>

          <article className="panel table-panel">
            <div className="table-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div className="table-search" style={{ flex: '1 1 280px' }}>
                <label className="search" style={{ width: '100%' }}>
                  <Icon name="search" />
                  <input
                    placeholder="Buscar módulo de reprodução ou biblioteca..."
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
                  Distribuir Mídia / Pacote
                </Button>
              </div>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Módulo / Software</th>
                    <th>Versão Instalada</th>
                    <th>Fabricante</th>
                    <th>Tamanho</th>
                    <th>Instalação</th>
                    <th>Status / Conformidade</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <div className="device-cell">
                          <span style={{ background: app.managed ? 'var(--primary-soft)' : '#f3f4f6', color: app.managed ? 'var(--primary)' : '#4b5563' }}>
                            <Icon name={getAppIconName(app.name, app.managed)} size={18} />
                          </span>
                          <div>
                            <strong>{app.name}</strong>
                            <small>{app.managed ? 'Gerenciado via Novara Signage' : 'Instalado localmente'}</small>
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
                            onClick={() => toast.warning(`Comando de remoção de ${app.name} enviado.`)}
                          >
                            Remover
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {/* ABA 4: SEGURANÇA KIOSK & HORÁRIOS */}
      {tab === 'security' && (
        <section className="tab-content-grid">
          <div className="tab-full-stack">
            <article className="security-banner">
              <span>
                <Icon name="shield" size={22} />
              </span>
              <div>
                <strong>Modo Kiosk Seguro de Exibição Pública Ativo</strong>
                <p>
                  Sistema operacional bloqueado para público, atalhos de teclado desativados e watchdog ativo para recuperação imediata em caso de falha.
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
                  <h3 className="card-section-title">Proteções e Parâmetros de Exibição Pública</h3>
                  <p className="card-section-desc">Regras de integridade para displays comerciais</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '14px' }}>
                <div className="security-check-card">
                  <div className="security-check-icon green">
                    <Icon name="lock" size={20} />
                  </div>
                  <div className="security-check-content">
                    <h4>
                      Kiosk Shell Lock
                      <Status tone="green">Travado</Status>
                    </h4>
                    <p>Área de trabalho do Windows inacessível. O player inicia diretamente em tela cheia na inicialização.</p>
                  </div>
                </div>

                <div className="security-check-card">
                  <div className="security-check-icon green">
                    <Icon name="pulse" size={20} />
                  </div>
                  <div className="security-check-content">
                    <h4>
                      Watchdog de Auto-Recuperação
                      <Status tone="green">Ativo</Status>
                    </h4>
                    <p>Reinicializa a página web da grade de mídia em até 5 segundos caso haja travamento de JavaScript.</p>
                  </div>
                </div>

                <div className="security-check-card">
                  <div className="security-check-icon green">
                    <Icon name="check" size={20} />
                  </div>
                  <div className="security-check-content">
                    <h4>
                      Proteção Anti Burn-in
                      <Status tone="green">Habilitada</Status>
                    </h4>
                    <p>Deslocamento sutil de pixels a cada 15 minutos para evitar retenção permanente de imagem na matriz de LED.</p>
                  </div>
                </div>
              </div>
            </article>

            {/* Tabela de Políticas */}
            <article className="panel table-panel">
              <div className="table-header">
                <div>
                  <h3 className="card-section-title">Políticas de Sinalização Digital Atribuídas</h3>
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
                      { name: 'Baseline Signage Kiosk Windows 11 IoT', scope: 'Dispositivo', ver: 'v2.1', time: 'Hoje, 07:00', tone: 'green', status: 'Conforme' },
                      { name: 'Cronograma HDMI-CEC de Economia de Energia', scope: 'Hardware', ver: 'v1.4', time: 'Hoje, 07:00', tone: 'green', status: 'Ativo' },
                      { name: 'Certificado de Criptografia SSL/TLS WebSocket', scope: 'Rede', ver: 'v2.0', time: '14/03/2026', tone: 'green', status: 'Válido' },
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
              <h3>Automação de Energia</h3>
              <div>
                <span>Horário de Ligar</span>
                <strong>07:00 (Segunda a Sexta)</strong>
              </div>
              <div>
                <span>Horário de Standby</span>
                <strong>21:30 (Segunda a Sexta)</strong>
              </div>
              <div>
                <span>Finais de Semana</span>
                <strong>Standby contínuo</strong>
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
                  HDMI & Rede
                </button>
                <button
                  className={eventFilter === 'security' ? 'active' : ''}
                  onClick={() => setEventFilter('security')}
                >
                  Segurança
                </button>
                <button
                  className={eventFilter === 'software' ? 'active' : ''}
                  onClick={() => setEventFilter('software')}
                >
                  Transmissões
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

      {/* MODAL 1: ALTERAR CANAL */}
      <Modal
        isOpen={channelModalOpen}
        onClose={() => setChannelModalOpen(false)}
        title="Alternar Canal de Transmissão"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Selecione qual grade de mídia este display deve reproduzir:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {availableChannels.map((ch) => (
              <label
                key={ch.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${selectedChannelId === ch.id ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  background: selectedChannelId === ch.id ? 'rgba(59, 130, 246, 0.08)' : 'var(--surface-sunken)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="detailChannelRadio"
                  checked={selectedChannelId === ch.id}
                  onChange={() => setSelectedChannelId(ch.id)}
                />
                <div>
                  <strong style={{ fontSize: '13px', display: 'block' }}>{ch.name}</strong>
                  <small style={{ color: 'var(--text-secondary)' }}>{ch.type} • {ch.resolution}</small>
                </div>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setChannelModalOpen(false)}>Cancelar</Button>
            <Button icon="check" onClick={handleSaveChannel}>Confirmar e Sincronizar</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: ALERTA DE EMERGÊNCIA */}
      <Modal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        title="Disparar Alerta de Emergência nesta Tela"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#ef4444' }}>
            <strong>Atenção:</strong> O alerta sobrescreverá o canal atual com aviso visual prioritário em letras garrafais.
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Texto em Destaque na Tela
            </label>
            <textarea
              rows={3}
              value={emergencyText}
              onChange={(e) => setEmergencyText(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-primary)', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setEmergencyModalOpen(false)}>Cancelar</Button>
            <Button variant="danger" icon="warning" onClick={handleBroadcastEmergency}>Transmitir Alerta Agora</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: EDITAR CADASTRO */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Cadastro do Painel"
      >
        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Identificação do Painel
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Localização Física
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-primary)' }}
            />
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
                Endereço MAC
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

      {/* MODAL 4: DISTRIBUIR PACOTE DE MÍDIA */}
      <Modal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        title="Distribuir Novo Pacote de Mídia"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Selecione o pacote de mídia institucional para cache offline no SSD do painel:
          </p>
          <select style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-primary)' }}>
            <option>Campanha Institucional 2026 (Vídeo 4K 60fps)</option>
            <option>Avisos de Segurança do Trabalho (CIPA)</option>
            <option>Cardápio da Semana em HTML5 Dinâmico</option>
          </select>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setInstallModalOpen(false)}>Cancelar</Button>
            <Button icon="check" onClick={() => { setInstallModalOpen(false); toast.success('Ordem de sincronização de mídia transmitida!'); }}>
              Sincronizar no Player
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: PAYLOAD DO EVENTO */}
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
