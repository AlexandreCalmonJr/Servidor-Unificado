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
  if (name.includes('Falcon') || name.includes('CrowdStrike')) return 'shield'
  if (name.includes('Outlook') || name.includes('Teams') || name.includes('Slack')) return 'agent'
  if (name.includes('Salesforce')) return 'sliders'
  if (name.includes('Chrome') || name.includes('Edge')) return 'search'
  return managed ? 'shield' : 'package'
}

export function MobileDetail({ go }: { go: (p: PageId) => void }) {
  const [tab, setTab] = useState<'geral' | 'hardware' | 'apps' | 'security' | 'activity'>('geral')
  const toast = useToast()

  // Estados de ações
  const [syncing, setSyncing] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [reapplyingPolicies, setReapplyingPolicies] = useState(false)
  const [lostModeActive, setLostModeActive] = useState(false)

  // Modais
  const [lostModeModalOpen, setLostModeModalOpen] = useState(false)
  const [lostMessage, setLostMessage] = useState('Este smartphone corporativo foi extraviado. Por favor, entre em contato imediatamente com o TI da Novara.')
  const [lostPhone, setLostPhone] = useState('+55 (11) 3090-4400')
  const [wipeModalOpen, setWipeModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [installModalOpen, setInstallModalOpen] = useState(false)
  const [eventDetailModal, setEventDetailModal] = useState<EventLogItem | null>(null)

  // Dados do Dispositivo Móvel
  const [name, setName] = useState('iPhone 16 Pro 256GB')
  const [owner, setOwner] = useState('Sofia Alves')
  const [dept, setDept] = useState('Diretoria Executiva & Relações')
  const [unit, setUnit] = useState('Matriz — São Paulo')
  const [assetTag, setAssetTag] = useState('MOB-IOS-0031')
  const [os, setOs] = useState('iOS 18.5 (Supervisionado Apple ABM)')
  const [imei, setImei] = useState('354892110482910')
  const [phoneLine, setPhoneLine] = useState('+55 (11) 98452-9901')
  const [carrier, setCarrier] = useState('Vivo Empresas 5G SA (eSIM)')
  const [battery, setBattery] = useState(84)

  // Filtros
  const [appSearch, setAppSearch] = useState('')
  const [appFilter, setAppFilter] = useState<'all' | 'managed' | 'updates'>('all')
  const [eventSearch, setEventSearch] = useState('')
  const [eventFilter, setEventFilter] = useState<'all' | 'policy' | 'security' | 'auth' | 'software' | 'network'>('all')

  // Apps Gerenciados EMM
  const [softwareList, setSoftwareList] = useState<SoftwareItem[]>([
    { id: 'app-1', name: 'Slack Enterprise Grid', vendor: 'Slack Technologies', version: '24.10.10', size: '142 MB', installedAt: '28/10/2026', managed: true, hasUpdate: false, status: 'Conforme', tone: 'green' },
    { id: 'app-2', name: 'Microsoft Outlook 365', vendor: 'Microsoft Corp', version: '4.2440.0', size: '280 MB', installedAt: '25/10/2026', managed: true, hasUpdate: true, updateVersion: '4.2441.2', status: 'Atualização pendente', tone: 'amber' },
    { id: 'app-3', name: 'CrowdStrike Falcon Mobile', vendor: 'CrowdStrike Inc', version: '2.14.2', size: '48 MB', installedAt: '30/10/2026', managed: true, hasUpdate: false, status: 'EDR Operacional', tone: 'blue' },
    { id: 'app-4', name: '1Password Enterprise', vendor: 'AgileBits Inc', version: '8.10.45', size: '92 MB', installedAt: '01/10/2026', managed: true, hasUpdate: false, status: 'Conforme', tone: 'green' },
    { id: 'app-5', name: 'Salesforce Mobile CRM', vendor: 'Salesforce Inc', version: '252.0.0', size: '184 MB', installedAt: '15/10/2026', managed: true, hasUpdate: false, status: 'Conforme', tone: 'green' },
    { id: 'app-6', name: 'Novara Mobile Hub', vendor: 'Novara MDM', version: '3.4.1', size: '22 MB', installedAt: '30/10/2026', managed: true, hasUpdate: false, status: 'Agente EMM', tone: 'blue' },
  ])

  // Trilha de Eventos e Auditoria
  const eventLogs: EventLogItem[] = [
    { id: 'evt-1', time: 'Hoje, 17:34:10', category: 'network', title: 'Handover de Antena 5G Standalone', desc: 'Dispositivo associado à torre ERB-VIVO-SP-FLIMA-42 com RSRP -68 dBm.', ip: '10.42.50.88', tone: 'blue', payload: { carrier: 'Vivo Empresas', band: 'n78 (3.5 GHz)', rsrp: '-68 dBm' } },
    { id: 'evt-2', time: 'Hoje, 15:10:00', category: 'policy', title: 'Check-in de Conformidade EMM', desc: 'Dispositivo supervisionado validou senha de 6 dígitos e integridade de Jailbreak.', ip: '10.42.50.88', tone: 'green', payload: { jailbroken: false, passcodeCompliant: true, abmSupervised: true } },
    { id: 'evt-3', time: 'Hoje, 11:22:45', category: 'auth', title: 'Token de Notificação Push APNs Renovado', desc: 'Canal de push corporativo sincronizado com a infraestrutura da Apple.', ip: '10.42.50.88', tone: 'blue', payload: { pushEnvironment: 'PRODUCTION', apnsTopic: 'com.novara.mdm.push' } },
    { id: 'evt-4', time: 'Ontem, 19:40:12', category: 'security', title: 'Tentativa de Captura de Tela em App Financeiro', desc: 'Política de DLP impediu captura de tela no aplicativo de gestão bancária.', ip: '10.42.50.88', tone: 'amber', payload: { action: 'SCREENSHOT_BLOCKED', container: 'FINANCE_RESTRICTED' } },
    { id: 'evt-5', time: '28/10, 08:30:00', category: 'software', title: 'Perfil de Configuração MDM Sincronizado', desc: 'Perfil v3.4.1 aplicado silenciosamente com novos certificados de VPN.', ip: '10.42.50.88', tone: 'green', payload: { profileVer: '3.4.1', status: 'INSTALLED' } },
  ]

  const handleToggleLostMode = () => {
    const next = !lostModeActive
    setLostModeActive(next)
    setLostModeModalOpen(false)
    if (next) {
      toast.warning('Modo Perdido ATIVADO! Tela bloqueada com mensagem e GPS transmitindo.')
    } else {
      toast.success('Modo Perdido DESATIVADO! Aparelho desbloqueado com sucesso.')
    }
  }

  const handleExecuteSelectiveWipe = () => {
    setWipeModalOpen(false)
    toast.error('Wipe Corporativo executado: Todos os dados corporativos e apps de trabalho foram apagados do aparelho.')
  }

  const handleSyncEmm = () => {
    setSyncing(true)
    toast.info('Sinal APNs enviado: Solicitando check-in de inventário imediato...')
    setTimeout(() => {
      setSyncing(false)
      toast.success('Dispositivo sincronizado com sucesso: Políticas 100% atualizadas.')
    }, 1400)
  }

  const handlePlaySound = () => {
    toast.info('Sinal de alerta sonoro transmitido para o smartphone (toca no volume máximo).')
  }

  const handleScanSoftwares = () => {
    setScanning(true)
    toast.info('Varredura de aplicativos no contêiner corporativo iniciada...')
    setTimeout(() => {
      setScanning(false)
      toast.success('Varredura concluída: 6 apps corporativos conferidos e protegidos.')
    }, 1200)
  }

  const handleReapplyPolicies = () => {
    setReapplyingPolicies(true)
    toast.info('Reaplicando restrições de segurança EMM / Knox...')
    setTimeout(() => {
      setReapplyingPolicies(false)
      toast.success('Políticas EMM sincronizadas com sucesso!')
    }, 1200)
  }

  const handleUpdateApp = (app: SoftwareItem) => {
    toast.info(`Iniciando atualização de ${app.name} via Apple VPP...`)
    setTimeout(() => {
      setSoftwareList((prev) =>
        prev.map((item) =>
          item.id === app.id
            ? { ...item, version: item.updateVersion || item.version, hasUpdate: false, status: 'Conforme', tone: 'green' }
            : item
        )
      )
      toast.success(`${app.name} atualizado com sucesso no aparelho!`)
    }, 1500)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    setEditModalOpen(false)
    toast.success('Cadastro do dispositivo móvel atualizado com sucesso!')
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
      {/* Banner de Modo Perdido Ativo */}
      {lostModeActive && (
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
                MODO PERDIDO (LOST MODE) ATIVADO NESTE SMARTPHONE
              </strong>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {lostMessage} • Telefone na tela: {lostPhone}
              </p>
            </div>
          </div>
          <Button variant="danger" icon="check" onClick={handleToggleLostMode}>
            Desativar Modo Perdido
          </Button>
        </div>
      )}

      {/* Cabeçalho do Ativo */}
      <div className="detail-heading">
        <button onClick={() => go('mobiles')}>
          <Icon name="arrow" size={16} /> Voltar para smartphones e tablets
        </button>

        <div className="detail-device">
          <span className="detail-device-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Icon name="phone" size={26} />
          </span>
          <div className="detail-device-info">
            <div className="detail-device-title-row">
              <h2>{name} — {owner}</h2>
              <Status tone={lostModeActive ? 'red' : 'green'}>
                {lostModeActive ? 'Modo Perdido Ativo' : 'Supervisionado (Apple ABM)'}
              </Status>
            </div>
            <p>
              {assetTag} · {os} · Linha: {phoneLine} · {dept}
            </p>
          </div>
        </div>

        <div className="detail-actions">
          <Button
            variant={lostModeActive ? 'danger' : 'secondary'}
            icon="shield"
            onClick={() => setLostModeModalOpen(true)}
          >
            {lostModeActive ? 'Modo Perdido' : 'Ativar Modo Perdido'}
          </Button>
          <Button variant="danger" icon="trash" onClick={() => setWipeModalOpen(true)}>
            Wipe Corporativo
          </Button>
          <Button variant="secondary" icon="refresh" disabled={syncing} onClick={handleSyncEmm}>
            {syncing ? 'Sincronizando...' : 'Sincronizar EMM'}
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
          Hardware Celular, Modem & Bateria
        </button>
        <button className={tab === 'apps' ? 'active' : ''} onClick={() => setTab('apps')}>
          Aplicativos corporativos ({softwareList.length})
        </button>
        <button className={tab === 'security' ? 'active' : ''} onClick={() => setTab('security')}>
          Segurança EMM & Restrições
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
                  <strong>97</strong>
                  <span>/100</span>
                </div>
                <p>Saúde excelente</p>
              </div>
              <div className="health-copy">
                <h3>Dispositivo móvel corporativo seguro e protegido</h3>
                <p>
                  Supervisão Apple Business Manager ativa, Face ID habilitado, criptografia de hardware Secure Enclave e contêiner DLP sem vazamentos.
                </p>
                <div>
                  <Status tone="green">Sinal 5G SA (-68 dBm)</Status>
                  <Status tone="green">Bateria 84% (Saúde 99%)</Status>
                  <Status tone="green">DLP Contêiner Ativo</Status>
                  <Status tone="blue">Hub EMM v3.4.1</Status>
                </div>
              </div>
            </article>

            {/* Informações de Inventário */}
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3>Informações gerais de inventário móvel</h3>
                  <p>Identificação do aparelho, linhas telefônicas e operadora credenciada</p>
                </div>
                <button className="text-link" onClick={() => setEditModalOpen(true)}>
                  Editar cadastro
                </button>
              </div>
              <div className="info-grid">
                {[
                  ['Modelo do Smartphone', name],
                  ['Colaborador Titular', owner],
                  ['Número da Linha Telefônica', phoneLine],
                  ['Operadora Credenciada', carrier],
                  ['IMEI 1 (eSIM Principal)', imei],
                  ['IMEI 2 (Slot Físico)', '354892110482911'],
                  ['Número Serial', 'K92Q99AA05D'],
                  ['Sistema Operacional', os],
                  ['Departamento / Unidade', `${dept} · ${unit}`],
                  ['Última Localização GPS', 'São Paulo, SP (Prédio Matriz — Precisão 4m)'],
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
                  <h3>Armazenamento Flash & Dados Móveis</h3>
                  <p>Consumo de memória do dispositivo e cota do plano de dados</p>
                </div>
              </div>
              <div className="resource-grid">
                <div>
                  <div>
                    <span>Armazenamento Interno</span>
                    <strong>68 GB de 256 GB</strong>
                  </div>
                  <div className="progress large">
                    <i className="os-blue" style={{ width: '26%' }} />
                  </div>
                  <small>188 GB livres (74% disponíveis)</small>
                </div>
                <div>
                  <div>
                    <span>Franquia 5G Mensal</span>
                    <strong>8.4 GB de 50 GB</strong>
                  </div>
                  <div className="progress large">
                    <i className="os-green" style={{ width: '17%' }} />
                  </div>
                  <small>41.6 GB restantes no ciclo atual</small>
                </div>
              </div>
            </article>
          </div>

          {/* Aside Lateral */}
          <aside className="page-stack">
            <article className="panel quick-info">
              <h3>Conexão & Telefonia Móvel</h3>
              <div>
                <span>Sinal Celular</span>
                <strong>-68 dBm (5 barras 5G SA)</strong>
              </div>
              <div>
                <span>Banda Conectada</span>
                <strong>n78 (3.5 GHz Standalone)</strong>
              </div>
              <div>
                <span>Bateria Atual</span>
                <strong>{battery}% (Saúde 99%)</strong>
              </div>
              <div>
                <span>Modo Perdido</span>
                <strong>{lostModeActive ? 'ATIVADO' : 'Desativado'}</strong>
              </div>
              <div>
                <span>Versão do EMM</span>
                <strong>v3.4.1 (Apple DEP)</strong>
              </div>
            </article>

            <article className="panel timeline-panel">
              <h3>Atividade recente do smartphone</h3>
              {[
                { title: 'Telemetria celular recebida', desc: 'Sinal 5G excelente e bateria em 84%', time: 'Há 4 min' },
                { title: 'Varredura EDR Mobile', desc: 'CrowdStrike Falcon não detectou ameaças', time: 'Há 18 min' },
                { title: 'Conexão Wi-Fi corporativa', desc: 'Associado ao SSID Novara-Corp-HQ', time: 'Há 2 h' },
                { title: 'Check-in de conformidade APNs', desc: 'Políticas validadas sem desvios', time: 'Hoje, 09:12' },
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

      {/* ABA 2: HARDWARE CELULAR, MODEM & BATERIA */}
      {tab === 'hardware' && (
        <section className="tab-content-grid">
          <div className="tab-full-stack">
            {/* Processador e Modem */}
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3 className="card-section-title">Processador Apple A18 Pro & Modem 5G</h3>
                  <p className="card-section-desc">Chipset móvel de 3nm com CPU 6-core, GPU 6-core e Modem Qualcomm Snapdragon X75</p>
                </div>
                <span className="badge-tag green">5G SA · 3nm</span>
              </div>

              <div className="telemetry-row">
                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>Sinal Celular 5G</span>
                    <strong>-68 dBm</strong>
                  </div>
                  <div className="progress">
                    <i className="os-green" style={{ width: '88%' }} />
                  </div>
                  <span className="telemetry-sub">5 Barras / Excelente</span>
                </div>

                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>Velocidade Download</span>
                    <strong>420 Mbps</strong>
                  </div>
                  <div className="progress">
                    <i className="os-blue" style={{ width: '70%' }} />
                  </div>
                  <span className="telemetry-sub">Upload: 68 Mbps</span>
                </div>

                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>Nível de Bateria</span>
                    <strong>{battery}%</strong>
                  </div>
                  <div className="progress">
                    <i className="os-green" style={{ width: `${battery}%` }} />
                  </div>
                  <span className="telemetry-sub">Capacidade: 3.582 mAh</span>
                </div>

                <div className="telemetry-item">
                  <div className="telemetry-item-head">
                    <span>Saúde da Bateria</span>
                    <strong>99%</strong>
                  </div>
                  <div className="progress">
                    <i className="os-cyan" style={{ width: '99%' }} />
                  </div>
                  <span className="telemetry-sub">54 Ciclos Concluídos</span>
                </div>
              </div>
            </article>

            {/* Rastreamento e Alarme */}
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3 className="card-section-title">Geolocalização & Rastreamento de Emergência</h3>
                  <p className="card-section-desc">Coordenadas obtidas através de GPS autônomo e triangulação de antenas celulares</p>
                </div>
                <Button variant="secondary" icon="pulse" onClick={handlePlaySound}>
                  Tocar Alarme Sonoro
                </Button>
              </div>
              <div className="info-grid">
                <div>
                  <span>Coordenadas GPS</span>
                  <strong>-23.586842, -46.682190</strong>
                </div>
                <div>
                  <span>Ponto de Referência</span>
                  <strong>Prédio Matriz — Av. Faria Lima, São Paulo</strong>
                </div>
                <div>
                  <span>Precisão de Raio</span>
                  <strong>± 4 metros</strong>
                </div>
                <div>
                  <span>Última Atualização</span>
                  <strong>Há 8 minutos (Automático)</strong>
                </div>
              </div>
            </article>
          </div>

          <aside className="tab-full-stack">
            <article className="panel quick-info">
              <h3>Bandas e Tecnologias Sem Fio</h3>
              <div>
                <span>Bandas 5G SA</span>
                <strong>n78, n1, n3, n7, n28</strong>
              </div>
              <div>
                <span>Wi-Fi Integrado</span>
                <strong>Wi-Fi 7 (802.11be) 2x2 MIMO</strong>
              </div>
              <div>
                <span>Bluetooth</span>
                <strong>Bluetooth 5.3 com LE Audio</strong>
              </div>
              <div>
                <span>UWB (Ultra-Wideband)</span>
                <strong>Chip U2 de 2ª geração</strong>
              </div>
              <div>
                <span>NFC Corporativo</span>
                <strong>Suporte a crachás virtuais</strong>
              </div>
            </article>

            <article className="panel quick-info">
              <h3>Ações de Diagnóstico</h3>
              <div style={{ border: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Button
                  variant="secondary"
                  icon="pulse"
                  onClick={() => {
                    toast.info('Testando canal de rádio e potência de sinal celular...')
                    setTimeout(() => toast.success('Modem 5G e eSIM certificados com sucesso!'), 1000)
                  }}
                >
                  Testar Sinal 5G
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

      {/* ABA 3: APLICATIVOS CORPORATIVOS */}
      {tab === 'apps' && (
        <section className="page-stack">
          <div className="mini-metrics">
            <div>
              <div className="mini-icon blue">
                <Icon name="package" />
              </div>
              <div>
                <p>Apps no Contêiner</p>
                <strong>{softwareList.length}</strong>
              </div>
            </div>
            <div>
              <div className="mini-icon green">
                <Icon name="shield" />
              </div>
              <div>
                <p>Gerenciados pelo EMM</p>
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
                <p>Conformidade VPP</p>
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
                    placeholder="Buscar aplicativo corporativo..."
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
                  Distribuir App
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
                  {filteredApps.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <div className="device-cell">
                          <span style={{ background: app.managed ? 'var(--primary-soft)' : '#f3f4f6', color: app.managed ? 'var(--primary)' : '#4b5563' }}>
                            <Icon name={getAppIconName(app.name, app.managed)} size={18} />
                          </span>
                          <div>
                            <strong>{app.name}</strong>
                            <small>{app.managed ? 'Gerenciado via Apple VPP' : 'Instalado pelo usuário'}</small>
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

      {/* ABA 4: SEGURANÇA EMM & RESTRIÇÕES */}
      {tab === 'security' && (
        <section className="tab-content-grid">
          <div className="tab-full-stack">
            <article className="security-banner">
              <span>
                <Icon name="shield" size={22} />
              </span>
              <div>
                <strong>Dispositivo Supervisionado via Apple Business Manager (DEP)</strong>
                <p>
                  Políticas EMM aplicadas com isolamento de contêiner DLP, biometria Face ID obrigatória e bloqueio de exportação de dados corporativos.
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
                  <h3 className="card-section-title">Controles de Segurança e Restrições de Sistema</h3>
                  <p className="card-section-desc">Mecanismos nativos do iOS controlados pela console Novara</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '14px' }}>
                <div className="security-check-card">
                  <div className="security-check-icon green">
                    <Icon name="lock" size={20} />
                  </div>
                  <div className="security-check-content">
                    <h4>
                      Código de Bloqueio Alfanumérico
                      <Status tone="green">Conforme</Status>
                    </h4>
                    <p>Senha de 6+ dígitos exigida com expiração a cada 90 dias e bloqueio por inatividade em 5 min.</p>
                  </div>
                </div>

                <div className="security-check-card">
                  <div className="security-check-icon green">
                    <Icon name="shield" size={20} />
                  </div>
                  <div className="security-check-content">
                    <h4>
                      Isolamento de Contêiner (DLP)
                      <Status tone="green">Ativo</Status>
                    </h4>
                    <p>Impossível copiar e colar dados de apps de trabalho para o WhatsApp ou apps pessoais.</p>
                  </div>
                </div>

                <div className="security-check-card">
                  <div className="security-check-icon green">
                    <Icon name="check" size={20} />
                  </div>
                  <div className="security-check-content">
                    <h4>
                      AirDrop Restrito
                      <Status tone="green">Habilitado</Status>
                    </h4>
                    <p>Compartilhamento de arquivos permitido exclusivamente entre aparelhos corporativos autorizados.</p>
                  </div>
                </div>

                <div className="security-check-card">
                  <div className="security-check-icon blue">
                    <Icon name="pulse" size={20} />
                  </div>
                  <div className="security-check-content">
                    <h4>
                      EDR CrowdStrike Mobile
                      <Status tone="blue">Protegido</Status>
                    </h4>
                    <p>Proteção ativa contra ataques de phishing em links SMS, redes Wi-Fi inseguras e perfis maliciosos.</p>
                  </div>
                </div>
              </div>
            </article>

            {/* Tabela de Políticas */}
            <article className="panel table-panel">
              <div className="table-header">
                <div>
                  <h3 className="card-section-title">Políticas EMM Atribuídas</h3>
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
                      { name: 'Baseline Corporativa de Segurança iOS (ABM)', scope: 'Dispositivo', ver: 'v2.4', time: 'Hoje, 09:12', tone: 'green', status: 'Conforme' },
                      { name: 'Perfil Wi-Fi Corporativo WPA3 Enterprise 802.1X', scope: 'Rede', ver: 'v1.2', time: '14/03/2024', tone: 'green', status: 'Válido até 2027' },
                      { name: 'Túnel Per-App VPN WireGuard Corporativo', scope: 'Rede', ver: 'v3.0', time: 'Hoje, 08:30', tone: 'green', status: 'Ativo' },
                      { name: 'Prevenção de Vazamento de Dados (DLP)', scope: 'Contêiner', ver: 'v1.8', time: 'Hoje, 09:12', tone: 'green', status: 'Conforme' },
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
              <h3>Supervisão & Auditoria Mobile</h3>
              <div>
                <span>Modo Supervisionado</span>
                <strong>Sim (Apple ABM)</strong>
              </div>
              <div>
                <span>Status de Jailbreak</span>
                <strong>Íntegro (Não Violado)</strong>
              </div>
              <div>
                <span>Backup Corporativo</span>
                <strong>Criptografado (iCloud Gerenciado)</strong>
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
                  Celular & Rede
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

      {/* MODAL 1: MODO PERDIDO */}
      <Modal
        isOpen={lostModeModalOpen}
        onClose={() => setLostModeModalOpen(false)}
        title={lostModeActive ? 'Desativar Modo Perdido' : 'Ativar Modo Perdido Remoto'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            {lostModeActive
              ? 'Ao desativar o Modo Perdido, a tela do smartphone será desbloqueada e o colaborador poderá utilizá-lo normalmente.'
              : 'O Modo Perdido travará a tela do aparelho, exibindo sua mensagem com telefone de contato do suporte.'}
          </p>

          {!lostModeActive && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  Mensagem exibida na tela do aparelho
                </label>
                <textarea
                  rows={3}
                  value={lostMessage}
                  onChange={(e) => setLostMessage(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  Telefone de Contato (Botão de Chamada na Tela)
                </label>
                <input
                  type="text"
                  value={lostPhone}
                  onChange={(e) => setLostPhone(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-primary)' }}
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setLostModeModalOpen(false)}>Cancelar</Button>
            <Button
              variant={lostModeActive ? 'primary' : 'danger'}
              icon="shield"
              onClick={handleToggleLostMode}
            >
              {lostModeActive ? 'Confirmar Desativação' : 'Bloquear no Modo Perdido'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: WIPE CORPORATIVO SELETIVO */}
      <Modal
        isOpen={wipeModalOpen}
        onClose={() => setWipeModalOpen(false)}
        title="Wipe Corporativo Seletivo"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#ef4444' }}>
            <strong>Atenção:</strong> O Wipe Seletivo desvinculará o aparelho do MDM e apagará todos os e-mails corporativos, documentos confidenciais e apps da empresa. Fotos e dados pessoais NÃO serão afetados.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setWipeModalOpen(false)}>Cancelar</Button>
            <Button variant="danger" icon="trash" onClick={handleExecuteSelectiveWipe}>
              Confirmar e Executar Wipe
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: EDITAR CADASTRO */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Cadastro do Dispositivo Móvel"
      >
        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Identificação do Modelo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-primary)' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Colaborador Titular
              </label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
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
                Número da Linha Telefônica
              </label>
              <input
                type="text"
                value={phoneLine}
                onChange={(e) => setPhoneLine(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Operadora / Plano
              </label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
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

      {/* MODAL 4: DISTRIBUIR APP */}
      <Modal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        title="Distribuir Novo App Corporativo"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Selecione um aplicativo licenciado via Apple Volume Purchase Program (VPP):
          </p>
          <select style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-primary)' }}>
            <option>Microsoft Teams Enterprise</option>
            <option>Zoom Workplace Mobile</option>
            <option>SAP Mobile Concur</option>
            <option>Cisco AnyConnect Secure Mobility</option>
          </select>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setInstallModalOpen(false)}>Cancelar</Button>
            <Button icon="check" onClick={() => { setInstallModalOpen(false); toast.success('Ordem de instalação transmitida via APNs!'); }}>
              Distribuir para o Smartphone
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
