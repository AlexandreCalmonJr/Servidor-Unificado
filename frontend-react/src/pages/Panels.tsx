import { useState, useMemo } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status, MetricCard } from '../components/UI'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import type { PageId, StatusTone } from '../types'

interface PanelItem {
  id: string
  name: string
  location: string
  resolution: string
  orientation: 'Paisagem' | 'Retrato'
  playerType: string
  currentChannel: string
  hdmiStatus: 'Ligado (HDMI-CEC)' | 'Standby / Tela Apagada' | 'Sem Sinal HDMI'
  ip: string
  mac: string
  volume: number
  brightness: number
  emergencyAlertActive: boolean
  status: 'Online' | 'Alerta' | 'Offline'
  tone: StatusTone
  lastPing: string
}

interface ChannelItem {
  id: string
  name: string
  type: string
  mediaCount: number
  loopDuration: string
  assignedPanels: number
  resolution: string
  active: boolean
}

const initialPanels: PanelItem[] = [
  {
    id: 'PNL-TRI-001',
    name: 'Painel Triagem & Chamada de Senhas',
    location: 'Prédio Matriz — Térreo (Hall Principal)',
    resolution: '4K UHD (3840×2160)',
    orientation: 'Paisagem',
    playerType: 'Intel NUC Mini PC (Windows 11 IoT)',
    currentChannel: 'Canal 01 — Chamada de Senhas & Triagem Médica',
    hdmiStatus: 'Ligado (HDMI-CEC)',
    ip: '10.42.30.12',
    mac: '70:85:C2:A1:04:1E',
    volume: 65,
    brightness: 90,
    emergencyAlertActive: false,
    status: 'Online',
    tone: 'green',
    lastPing: 'Agora (3s)',
  },
  {
    id: 'PNL-REC-002',
    name: 'Video Wall Institucional 3x3',
    location: 'Prédio Matriz — Entrada Corporativa',
    resolution: 'Ultrawide 32:9 (5120×1440)',
    orientation: 'Paisagem',
    playerType: 'Workstation Display Controller (NVIDIA Quadro)',
    currentChannel: 'Canal 02 — Institucional, Marcas & Metas 2026',
    hdmiStatus: 'Ligado (HDMI-CEC)',
    ip: '10.42.30.15',
    mac: '00:1B:21:99:FA:44',
    volume: 0,
    brightness: 85,
    emergencyAlertActive: false,
    status: 'Online',
    tone: 'green',
    lastPing: 'Agora (5s)',
  },
  {
    id: 'PNL-CAFE-003',
    name: 'Menuboard Digital Cafeteria Gourmet',
    location: 'Edifício Anexo — 2º Andar (Espaço Convivência)',
    resolution: '4K UHD (3840×2160)',
    orientation: 'Retrato',
    playerType: 'Samsung Tizen Signage SSSP 10',
    currentChannel: 'Canal 03 — Cardápio Interativo & Ofertas',
    hdmiStatus: 'Ligado (HDMI-CEC)',
    ip: '10.42.30.18',
    mac: '44:6D:57:38:2B:10',
    volume: 30,
    brightness: 80,
    emergencyAlertActive: false,
    status: 'Online',
    tone: 'green',
    lastPing: 'Há 12s',
  },
  {
    id: 'PNL-AUD-004',
    name: 'Totem Vertical Indicador de Auditório',
    location: 'Centro de Convenções — Foyer Auditório A',
    resolution: 'Full HD (1080×1920)',
    orientation: 'Retrato',
    playerType: 'Android TV Signage Box 4K',
    currentChannel: 'Canal 04 — Grade de Palestras & Ocupação',
    hdmiStatus: 'Ligado (HDMI-CEC)',
    ip: '10.42.30.22',
    mac: 'AC:7F:3E:91:AA:60',
    volume: 0,
    brightness: 75,
    emergencyAlertActive: false,
    status: 'Online',
    tone: 'green',
    lastPing: 'Há 20s',
  },
  {
    id: 'PNL-RH-005',
    name: 'TV Comunicação Interna & Endomarketing',
    location: 'Prédio Matriz — 4º Andar (Ala RH & People)',
    resolution: '4K UHD (3840×2160)',
    orientation: 'Paisagem',
    playerType: 'Raspberry Pi 5 CM4 Signage',
    currentChannel: 'Canal 05 — Aniversariantes & Notícias RH',
    hdmiStatus: 'Ligado (HDMI-CEC)',
    ip: '10.42.30.30',
    mac: '28:CD:C1:55:7E:9A',
    volume: 20,
    brightness: 70,
    emergencyAlertActive: false,
    status: 'Online',
    tone: 'green',
    lastPing: 'Há 45s',
  },
  {
    id: 'PNL-SL101-006',
    name: 'Display Sala de Reunião Alpha (Agendamento)',
    location: 'Prédio Executivo — Sala 101',
    resolution: 'Full HD (1920×1080)',
    orientation: 'Paisagem',
    playerType: 'Android Room Panel POE 10"',
    currentChannel: 'Canal 06 — Microsoft 365 Room Schedule',
    hdmiStatus: 'Standby / Tela Apagada',
    ip: '10.42.30.41',
    mac: '00:04:4B:99:31:02',
    volume: 0,
    brightness: 50,
    emergencyAlertActive: false,
    status: 'Alerta',
    tone: 'amber',
    lastPing: 'Há 3 min (Standby)',
  },
]

const initialChannels: ChannelItem[] = [
  {
    id: 'CHN-01',
    name: 'Canal 01 — Chamada de Senhas & Triagem Médica',
    type: 'WebSocket Live Feed + Mídia Informativa',
    mediaCount: 14,
    loopDuration: 'Tempo Real / Dinâmico',
    assignedPanels: 3,
    resolution: '4K UHD (3840×2160)',
    active: true,
  },
  {
    id: 'CHN-02',
    name: 'Canal 02 — Institucional, Marcas & Metas 2026',
    type: 'Vídeos MP4 4K H.265 60fps + Widgets Clima',
    mediaCount: 8,
    loopDuration: '4 min 30 seg',
    assignedPanels: 4,
    resolution: 'Ultrawide & 4K',
    active: true,
  },
  {
    id: 'CHN-03',
    name: 'Canal 03 — Cardápio Interativo & Ofertas Cafeteria',
    type: 'HTML5 Dynamic Menuboard + Preços em Tempo Real',
    mediaCount: 6,
    loopDuration: '2 min 15 seg',
    assignedPanels: 2,
    resolution: 'Retrato 4K',
    active: true,
  },
  {
    id: 'CHN-04',
    name: 'Canal 04 — Grade de Palestras & Ocupação de Auditórios',
    type: 'Integração Google Calendar & Outlook Room Finder',
    mediaCount: 10,
    loopDuration: 'Tempo Real',
    assignedPanels: 3,
    resolution: 'Retrato Full HD',
    active: true,
  },
  {
    id: 'CHN-05',
    name: 'Canal 05 — Aniversariantes & Notícias RH',
    type: 'Slideshow PPTX / Canva Automático + RSS Feed',
    mediaCount: 12,
    loopDuration: '3 min 40 seg',
    assignedPanels: 2,
    resolution: '4K UHD Paisagem',
    active: true,
  },
]

export function Panels({ go }: { go: (p: PageId) => void }) {
  const [panels, setPanels] = useState<PanelItem[]>(initialPanels)
  const [channels, setChannels] = useState<ChannelItem[]>(initialChannels)
  const [activeTab, setActiveTab] = useState<'panels' | 'channels' | 'power'>('panels')
  const [query, setQuery] = useState('')

  // Modais
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false)
  const [emergencyText, setEmergencyText] = useState('ATENÇÃO: Simulação de Evacuação de Emergência em Andamento. Dirija-se à saída mais próxima com calma.')
  const [emergencySeverity, setEmergencySeverity] = useState<'CRÍTICO' | 'ALERTA' | 'COMUNICADO'>('CRÍTICO')

  const [channelModalOpen, setChannelModalOpen] = useState(false)
  const [selectedPanel, setSelectedPanel] = useState<PanelItem | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState('')

  const [newPanelModalOpen, setNewPanelModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newResolution, setNewResolution] = useState('4K UHD (3840×2160)')
  const [newOrientation, setNewOrientation] = useState<'Paisagem' | 'Retrato'>('Paisagem')
  const [newPlayer, setNewPlayer] = useState('Android TV Signage Box 4K')
  const [newIp, setNewIp] = useState('10.42.30.')

  const toast = useToast()

  const filteredPanels = useMemo(() => {
    return panels.filter((p) => {
      const q = query.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.currentChannel.toLowerCase().includes(q) ||
        p.ip.includes(q) ||
        p.id.toLowerCase().includes(q)
      )
    })
  }, [panels, query])

  const stats = useMemo(() => {
    const total = 14
    const online = panels.filter((p) => p.status === 'Online').length + 8 // 13 ativos no total geral
    const alertCount = panels.filter((p) => p.emergencyAlertActive).length
    return { total, online, alertCount, uhd: 8 }
  }, [panels])

  // Ligar/Desligar via HDMI-CEC
  const handleToggleCecPower = (id: string) => {
    setPanels((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const isCurrentlyOn = p.hdmiStatus === 'Ligado (HDMI-CEC)'
        const newStatus = isCurrentlyOn ? 'Standby / Tela Apagada' : 'Ligado (HDMI-CEC)'
        if (isCurrentlyOn) {
          toast.warning(`Comando CEC: Tela ${p.name} colocada em standby.`)
        } else {
          toast.success(`Comando CEC: Tela ${p.name} ligada com sucesso.`)
        }
        return {
          ...p,
          hdmiStatus: newStatus,
          status: isCurrentlyOn ? 'Alerta' : 'Online',
          tone: isCurrentlyOn ? 'amber' : 'green',
        }
      })
    )
  }

  // Disparo de Alerta de Emergência em Massa
  const handleBroadcastEmergency = () => {
    setPanels((prev) =>
      prev.map((p) => ({
        ...p,
        emergencyAlertActive: true,
        status: 'Alerta',
        tone: 'red',
      }))
    )
    setEmergencyModalOpen(false)
    toast.error('Alerta de Emergência Transmitido: Mensagem enviada com prioridade máxima para todos os 14 painéis ativos.')
  }

  // Cancelar Alerta de Emergência
  const handleDismissEmergency = () => {
    setPanels((prev) =>
      prev.map((p) => ({
        ...p,
        emergencyAlertActive: false,
        status: 'Online',
        tone: 'green',
      }))
    )
    toast.success('Alerta de Emergência Encerrado: Todos os painéis retornaram à programação normal de canais.')
  }

  // Trocar canal de um painel
  const handleOpenChannelModal = (panel: PanelItem) => {
    setSelectedPanel(panel)
    const found = channels.find((c) => panel.currentChannel.includes(c.id))
    setSelectedChannelId(found ? found.id : channels[0].id)
    setChannelModalOpen(true)
  }

  const handleSaveChannelChange = () => {
    if (!selectedPanel) return
    const ch = channels.find((c) => c.id === selectedChannelId)
    if (!ch) return

    setPanels((prev) =>
      prev.map((p) =>
        p.id === selectedPanel.id
          ? { ...p, currentChannel: ch.name }
          : p
      )
    )
    setChannelModalOpen(false)
    toast.success(`Canal de Signage Atualizado: ${selectedPanel.name} agora exibe ${ch.name}.`)
  }

  // Cadastro de novo painel
  const handleCreatePanel = () => {
    if (!newName.trim() || !newLocation.trim()) {
      toast.error('Por favor, preencha o nome do painel e sua localização.')
      return
    }

    const newId = `PNL-SIG-${String(panels.length + 1).padStart(3, '0')}`
    const item: PanelItem = {
      id: newId,
      name: newName,
      location: newLocation,
      resolution: newResolution,
      orientation: newOrientation,
      playerType: newPlayer,
      currentChannel: channels[0].name,
      hdmiStatus: 'Ligado (HDMI-CEC)',
      ip: newIp,
      mac: '52:54:00:AB:12:' + Math.floor(10 + Math.random() * 89),
      volume: 40,
      brightness: 80,
      emergencyAlertActive: false,
      status: 'Online',
      tone: 'green',
      lastPing: 'Agora',
    }

    setPanels((prev) => [item, ...prev])
    setNewPanelModalOpen(false)
    setNewName('')
    setNewLocation('')
    toast.success(`Painel Cadastrado com Sucesso: ${item.name} (${item.id}) registrado e sincronizado.`)
  }

  const isAnyEmergencyActive = panels.some((p) => p.emergencyAlertActive)

  return (
    <div className="page-stack">
      {/* Banner de Alerta Crítico Ativo */}
      {isAnyEmergencyActive && (
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
                TRANSMISSÃO DE EMERGÊNCIA ATIVA EM TODOS OS PAINÉIS
              </strong>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                As telas estão exibindo a mensagem prioritária de evacuação e áudio de alerta.
              </p>
            </div>
          </div>
          <Button variant="danger" icon="check" onClick={handleDismissEmergency}>
            Encerrar Alerta & Restaurar Mídia
          </Button>
        </div>
      )}

      {/* Cartões de Indicadores */}
      <section className="metrics-grid">
        <MetricCard
          label="Total de Painéis & Signage"
          value={stats.total}
          icon="blocks"
          delta="100%"
          detail="integrados via HDMI-CEC"
          tone="blue"
        />
        <MetricCard
          label="Telas Ativas & Exibindo"
          value={`${stats.online} / ${stats.total}`}
          icon="check"
          delta="Operação"
          detail="ininterrupta"
          tone="green"
        />
        <MetricCard
          label="Transmissões 4K UHD"
          value={stats.uhd}
          icon="sliders"
          delta="Ultra HD"
          detail="máxima resolução H.265"
          tone="blue"
        />
        <MetricCard
          label="Alertas Corporativos"
          value={isAnyEmergencyActive ? 'TRANSMITINDO' : 'Normal'}
          icon="shield"
          delta={isAnyEmergencyActive ? 'Prioritário' : 'Seguro'}
          detail={isAnyEmergencyActive ? 'ação em curso' : 'nenhuma emergência'}
          tone={isAnyEmergencyActive ? 'red' : 'green'}
        />
      </section>

      {/* Barra de Ações & Abas */}
      <div className="action-row">
        <div className="segmented">
          <button
            className={activeTab === 'panels' ? 'active' : ''}
            onClick={() => setActiveTab('panels')}
          >
            Telas & Painéis Ativos <b>{panels.length}</b>
          </button>
          <button
            className={activeTab === 'channels' ? 'active' : ''}
            onClick={() => setActiveTab('channels')}
          >
            Canais & Playlists <b>{channels.length}</b>
          </button>
          <button
            className={activeTab === 'power' ? 'active' : ''}
            onClick={() => setActiveTab('power')}
          >
            Controle de Energia & Alertas
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="danger"
            icon="warning"
            onClick={() => setEmergencyModalOpen(true)}
          >
            Alerta de Emergência
          </Button>
          <Button
            icon="plus"
            onClick={() => setNewPanelModalOpen(true)}
          >
            Novo Painel
          </Button>
        </div>
      </div>

      {/* ABA 1: TELAS & PAINÉIS ATIVOS */}
      {activeTab === 'panels' && (
        <section className="panel table-panel">
          <div className="table-header">
            <label className="search table-search">
              <Icon name="search" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome do painel, local, canal, IP ou resolução..."
              />
            </label>
            <Button
              variant="secondary"
              icon="refresh"
              onClick={() => {
                toast.info('Comando HDMI-CEC Global: Sinal de despertar enviado para todos os painéis em standby.')
              }}
            >
              Ligar Todos (CEC)
            </Button>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Painel & Localização</th>
                  <th>Canal Atual</th>
                  <th>Resolução / Orientação</th>
                  <th>Player Hardware</th>
                  <th>Rede & IP</th>
                  <th>Status HDMI</th>
                  <th>Status Geral</th>
                </tr>
              </thead>
              <tbody>
                {filteredPanels.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <button
                        className="device-cell device-link"
                        onClick={() => go('panelDetail')}
                      >
                        <span>
                          <Icon name="blocks" />
                        </span>
                        <div>
                          <strong>{p.name}</strong>
                          <small>{p.location} • ID: {p.id}</small>
                        </div>
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => handleOpenChannelModal(p)}
                        style={{
                          background: 'rgba(59, 130, 246, 0.08)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#3b82f6',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        title="Clique para alternar o canal"
                      >
                        {p.currentChannel}
                      </button>
                    </td>
                    <td>
                      <div>
                        <strong>{p.resolution}</strong>
                        <small style={{ display: 'block', color: 'var(--text-secondary)' }}>
                          {p.orientation}
                        </small>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px' }}>{p.playerType}</span>
                    </td>
                    <td>
                      <div>
                        <strong>{p.ip}</strong>
                        <small style={{ display: 'block', color: 'var(--text-secondary)' }}>
                          MAC: {p.mac}
                        </small>
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleCecPower(p.id)}
                        style={{
                          background: p.hdmiStatus.includes('Ligado') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                          border: `1px solid ${p.hdmiStatus.includes('Ligado') ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: p.hdmiStatus.includes('Ligado') ? '#22c55e' : '#eab308',
                          cursor: 'pointer',
                        }}
                        title="Alternar Standby / Ligado via HDMI-CEC"
                      >
                        {p.hdmiStatus}
                      </button>
                    </td>
                    <td>
                      <Status tone={p.tone}>{p.status}</Status>
                      <small style={{ display: 'block', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {p.lastPing}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span>Exibindo {filteredPanels.length} de {panels.length} telas ativas no signage</span>
          </div>
        </section>
      )}

      {/* ABA 2: CANAIS & PLAYLISTS */}
      {activeTab === 'channels' && (
        <section className="panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Canais de Transmissão Corporativa</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Configure as listas de reprodução, integração com sistemas de senhas e calendários.
              </p>
            </div>
            <Button
              variant="secondary"
              icon="plus"
              onClick={() => {
                toast.info('O assistente de criação de canal de mídia será aberto.')
              }}
            >
              Criar Canal
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            {channels.map((ch) => (
              <div
                key={ch.id}
                style={{
                  background: 'var(--surface-sunken)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '14px', display: 'block' }}>{ch.name}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID: {ch.id}</span>
                  </div>
                  <span
                    style={{
                      background: 'rgba(34, 197, 94, 0.1)',
                      color: '#22c55e',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    ATIVO
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div><strong>Tipo de Fonte:</strong> {ch.type}</div>
                  <div><strong>Duração do Loop:</strong> {ch.loopDuration}</div>
                  <div><strong>Mídias Cadastradas:</strong> {ch.mediaCount} itens de vídeo/imagem</div>
                  <div><strong>Resolução Otimizada:</strong> {ch.resolution}</div>
                </div>

                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                    {ch.assignedPanels} telas vinculadas
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      toast.info(`Gerenciando itens do canal ${ch.name}.`)
                    }}
                  >
                    Gerenciar Mídias
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ABA 3: CONTROLE DE ENERGIA & ALERTAS */}
      {activeTab === 'power' && (
        <section className="panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '16px' }}>Gestão Energética e Segurança Patrimonial</h3>
          <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Comandos de barramento HDMI-CEC para economia de energia fora do expediente e sistema de transmissão de emergência.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Card HDMI-CEC */}
            <div
              style={{
                background: 'var(--surface-sunken)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '20px',
              }}
            >
              <h4 style={{ margin: '0 0 10px', fontSize: '15px' }}>Automação HDMI-CEC (Horário Comercial)</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Programa o acendimento e apagamento automático dos painéis comerciais para prolongar a vida útil das matrizes de LED e reduzir o consumo elétrico.
              </p>
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px' }}>Ligar displays automaticamente</span>
                  <strong>07:00 (Seg a Sex)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px' }}>Colocar em standby</span>
                  <strong>21:30 (Seg a Sex)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px' }}>Finais de semana</span>
                  <strong>Desligados (Standby Total)</strong>
                </div>
              </div>
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <Button
                  variant="secondary"
                  icon="refresh"
                  onClick={() => {
                    toast.warning('Comando HDMI-CEC: Todas as telas foram colocadas em standby imediato.')
                  }}
                >
                  Apagar Todas
                </Button>
                <Button
                  icon="check"
                  onClick={() => {
                    toast.success('Comando HDMI-CEC: Todas as telas foram despertadas com sucesso.')
                  }}
                >
                  Acender Todas
                </Button>
              </div>
            </div>

            {/* Card Transmissão de Emergência */}
            <div
              style={{
                background: 'var(--surface-sunken)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '20px',
              }}
            >
              <h4 style={{ margin: '0 0 10px', fontSize: '15px', color: '#ef4444' }}>
                Transmissor de Alerta em Massa (Broadcast)
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Em caso de incêndio, simulados da CIPA, risco ambiental ou comunicados críticos de segurança, sobrescreva imediatamente todas as telas corporativas.
              </p>
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px',
                  padding: '12px',
                  margin: '16px 0',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                }}
              >
                <strong>Prioridade de Camada:</strong> Sobrescreve vídeo wall, menuboards e totens com sirene visual e mensagem em vermelho com letras de alta visibilidade.
              </div>
              <Button
                variant="danger"
                icon="warning"
                onClick={() => setEmergencyModalOpen(true)}
              >
                Configurar & Disparar Alerta
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* MODAL 1: ALERTA DE EMERGÊNCIA */}
      <Modal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        title="Disparo de Alerta Corporativo de Emergência"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px 14px',
              fontSize: '13px',
              color: '#ef4444',
            }}
          >
            <strong>Atenção:</strong> Esta ação suspenderá instantaneamente a reprodução de mídia em todos os 14 painéis corporativos.
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Nível de Severidade
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['CRÍTICO', 'ALERTA', 'COMUNICADO'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setEmergencySeverity(sev)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: `1px solid ${emergencySeverity === sev ? '#ef4444' : 'var(--border-subtle)'}`,
                    background: emergencySeverity === sev ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface-sunken)',
                    color: emergencySeverity === sev ? '#ef4444' : 'var(--text-primary)',
                    fontWeight: emergencySeverity === sev ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Texto em Destaque na Tela
            </label>
            <textarea
              rows={4}
              value={emergencyText}
              onChange={(e) => setEmergencyText(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-sunken)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setEmergencyModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" icon="warning" onClick={handleBroadcastEmergency}>
              Transmitir Agora para Todas as Telas
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: TROCAR CANAL DE TRANSMISSÃO */}
      <Modal
        isOpen={channelModalOpen}
        onClose={() => setChannelModalOpen(false)}
        title={`Vincular Canal: ${selectedPanel?.name || 'Painel'}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Selecione qual grade de programação deve ser exibida neste painel:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {channels.map((ch) => (
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
                  name="channelRadio"
                  checked={selectedChannelId === ch.id}
                  onChange={() => setSelectedChannelId(ch.id)}
                />
                <div>
                  <strong style={{ fontSize: '13px', display: 'block' }}>{ch.name}</strong>
                  <small style={{ color: 'var(--text-secondary)' }}>
                    {ch.type} • {ch.resolution}
                  </small>
                </div>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setChannelModalOpen(false)}>
              Cancelar
            </Button>
            <Button icon="check" onClick={handleSaveChannelChange}>
              Salvar Alteração
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: NOVO PAINEL */}
      <Modal
        isOpen={newPanelModalOpen}
        onClose={() => setNewPanelModalOpen(false)}
        title="Cadastrar Novo Painel / Signage"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Identificação do Painel
            </label>
            <input
              type="text"
              placeholder="Ex: Painel Sala de Espera Pediatria"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-sunken)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Localização Física / Pavilhão
            </label>
            <input
              type="text"
              placeholder="Ex: Bloco B — 1º Andar"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-sunken)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Resolução da Matriz
              </label>
              <select
                value={newResolution}
                onChange={(e) => setNewResolution(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-sunken)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="4K UHD (3840×2160)">4K UHD (3840×2160)</option>
                <option value="Full HD (1920×1080)">Full HD (1920×1080)</option>
                <option value="Ultrawide 32:9 (5120×1440)">Ultrawide 32:9 (5120×1440)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Orientação da Tela
              </label>
              <select
                value={newOrientation}
                onChange={(e) => setNewOrientation(e.target.value as 'Paisagem' | 'Retrato')}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-sunken)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="Paisagem">Paisagem (Horizontal)</option>
                <option value="Retrato">Retrato (Vertical)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Hardware do Player
              </label>
              <select
                value={newPlayer}
                onChange={(e) => setNewPlayer(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-sunken)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="Android TV Signage Box 4K">Android TV Signage Box 4K</option>
                <option value="Intel NUC Mini PC (Windows 11 IoT)">Intel NUC Mini PC (Windows 11 IoT)</option>
                <option value="Samsung Tizen Signage SSSP 10">Samsung Tizen Signage SSSP 10</option>
                <option value="Raspberry Pi 5 CM4 Signage">Raspberry Pi 5 CM4 Signage</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Endereço IP Estático
              </label>
              <input
                type="text"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-sunken)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setNewPanelModalOpen(false)}>
              Cancelar
            </Button>
            <Button icon="plus" onClick={handleCreatePanel}>
              Cadastrar Painel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
