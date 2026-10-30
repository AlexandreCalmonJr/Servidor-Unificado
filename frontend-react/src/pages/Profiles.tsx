import { useState, useMemo } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import type { PageId } from '../types'

interface ConfigProfile {
  id: string
  name: string
  identifier: string
  platform: 'macos' | 'windows' | 'ios' | 'kiosk' | 'linux'
  description: string
  version: string
  status: 'active' | 'draft'
  devicesCount: number
  updatedAt: string
  payloads: {
    wifi: boolean
    vpn: boolean
    restrictions: boolean
    passcode: boolean
  }
  settings: {
    wifiSsid?: string
    wifiSecurity?: string
    vpnServer?: string
    vpnProtocol?: string
    vpnAlwaysOn?: boolean
    blockUsbWrite?: boolean
    blockCamera?: boolean
    blockScreenCapture?: boolean
    minPasswordLength?: number
    autoLockMinutes?: number
    allowBiometrics?: boolean
  }
}

export function Profiles({ go }: { go: (p: PageId) => void }) {
  const toast = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string>('all')

  // Lista de Perfis MDM
  const [profiles, setProfiles] = useState<ConfigProfile[]>([
    {
      id: 'prof-1',
      name: 'Baseline Corporativa macOS — Wi-Fi & VPN Segura',
      identifier: 'com.novara.mdm.macos.baseline-v2',
      platform: 'macos',
      description: 'Configuração obrigatória para notebooks Apple: Wi-Fi WPA3 Enterprise, VPN WireGuard Always-On e restrições DLP.',
      version: 'v2.4',
      status: 'active',
      devicesCount: 142,
      updatedAt: 'Ontem, 16:30',
      payloads: { wifi: true, vpn: true, restrictions: true, passcode: true },
      settings: {
        wifiSsid: 'Novara-Corp-HQ',
        wifiSecurity: 'WPA3 Enterprise (802.1X EAP-TLS)',
        vpnServer: 'vpn.novara.corp:51820',
        vpnProtocol: 'WireGuard',
        vpnAlwaysOn: true,
        blockUsbWrite: true,
        blockCamera: false,
        blockScreenCapture: false,
        minPasswordLength: 12,
        autoLockMinutes: 5,
        allowBiometrics: true,
      },
    },
    {
      id: 'prof-2',
      name: 'Restrições Rígidas & Kiosk — Totens de Autoatendimento',
      identifier: 'com.novara.mdm.windows.kiosk-lockdown',
      platform: 'kiosk',
      description: 'Bloqueio total de área de trabalho Windows 11 IoT: apenas app Kiosk em tela cheia, USB bloqueado e Wi-Fi dedicado.',
      version: 'v1.8',
      status: 'active',
      devicesCount: 18,
      updatedAt: '24/10/2026',
      payloads: { wifi: true, vpn: false, restrictions: true, passcode: true },
      settings: {
        wifiSsid: 'Novara-Kiosk-Net',
        wifiSecurity: 'WPA2 Enterprise',
        blockUsbWrite: true,
        blockCamera: true,
        blockScreenCapture: true,
        minPasswordLength: 16,
        autoLockMinutes: 1,
        allowBiometrics: false,
      },
    },
    {
      id: 'prof-3',
      name: 'Perfil Seguro Windows 11 — Estações Corporativas',
      identifier: 'com.novara.mdm.windows.workstation-v3',
      platform: 'windows',
      description: 'BitLocker obrigatório, política de senhas complexas Windows Hello, VPN IPsec corporativa e bloqueio de USB DLP.',
      version: 'v3.1',
      status: 'active',
      devicesCount: 87,
      updatedAt: '28/10/2026',
      payloads: { wifi: true, vpn: true, restrictions: true, passcode: true },
      settings: {
        wifiSsid: 'Novara-Corp-HQ',
        wifiSecurity: 'WPA3 Enterprise',
        vpnServer: 'gateway.novara.corp:443',
        vpnProtocol: 'IPsec IKEv2',
        vpnAlwaysOn: true,
        blockUsbWrite: true,
        blockCamera: false,
        blockScreenCapture: false,
        minPasswordLength: 12,
        autoLockMinutes: 5,
        allowBiometrics: true,
      },
    },
    {
      id: 'prof-4',
      name: 'Perfil Mobile Seguro — iPhones & iPads Corporativos',
      identifier: 'com.novara.mdm.ios.supervision-v1',
      platform: 'ios',
      description: 'Supervisão Apple MDM, certificado EAP-TLS corporativo, bloqueio de AirDrop não gerenciado e senha de 6 dígitos.',
      version: 'v1.4',
      status: 'active',
      devicesCount: 34,
      updatedAt: '15/10/2026',
      payloads: { wifi: true, vpn: true, restrictions: true, passcode: true },
      settings: {
        wifiSsid: 'Novara-Corp-HQ',
        wifiSecurity: 'WPA3 Enterprise',
        vpnServer: 'vpn.novara.corp:51820',
        vpnProtocol: 'WireGuard',
        vpnAlwaysOn: false,
        blockUsbWrite: false,
        blockCamera: false,
        blockScreenCapture: true,
        minPasswordLength: 6,
        autoLockMinutes: 2,
        allowBiometrics: true,
      },
    },
  ])

  // Modais
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState<'general' | 'wifi' | 'vpn' | 'restrictions' | 'passcode'>('general')
  const [editingProfile, setEditingProfile] = useState<ConfigProfile | null>(null)

  // Estado do formulário no modal
  const [formName, setFormName] = useState('')
  const [formIdentifier, setFormIdentifier] = useState('')
  const [formPlatform, setFormPlatform] = useState<'macos' | 'windows' | 'ios' | 'kiosk' | 'linux'>('macos')
  const [formDescription, setFormDescription] = useState('')
  const [formVersion, setFormVersion] = useState('v1.0')

  // Payloads
  const [formPayloadWifi, setFormPayloadWifi] = useState(true)
  const [formWifiSsid, setFormWifiSsid] = useState('Novara-Corp-HQ')
  const [formWifiSecurity, setFormWifiSecurity] = useState('WPA3 Enterprise (802.1X EAP-TLS)')

  const [formPayloadVpn, setFormPayloadVpn] = useState(true)
  const [formVpnProtocol, setFormVpnProtocol] = useState('WireGuard')
  const [formVpnServer, setFormVpnServer] = useState('vpn.novara.corp:51820')
  const [formVpnAlwaysOn, setFormVpnAlwaysOn] = useState(true)

  const [formPayloadRestrictions, setFormPayloadRestrictions] = useState(true)
  const [formBlockUsb, setFormBlockUsb] = useState(true)
  const [formBlockCamera, setFormBlockCamera] = useState(false)
  const [formBlockScreenCapture, setFormBlockScreenCapture] = useState(false)

  const [formPayloadPasscode, setFormPayloadPasscode] = useState(true)
  const [formMinPassLength, setFormMinPassLength] = useState(12)
  const [formAutoLockMinutes, setFormAutoLockMinutes] = useState(5)
  const [formAllowBiometrics, setFormAllowBiometrics] = useState(true)

  // Modal de Exclusão
  const [deleteTarget, setDeleteTarget] = useState<ConfigProfile | null>(null)

  // Abertura para novo perfil
  const handleOpenNewProfile = () => {
    setEditingProfile(null)
    setFormName('')
    setFormIdentifier('com.novara.mdm.custom-profile')
    setFormPlatform('macos')
    setFormDescription('')
    setFormVersion('v1.0')

    setFormPayloadWifi(true)
    setFormWifiSsid('Novara-Corp-HQ')
    setFormWifiSecurity('WPA3 Enterprise (802.1X EAP-TLS)')

    setFormPayloadVpn(true)
    setFormVpnProtocol('WireGuard')
    setFormVpnServer('vpn.novara.corp:51820')
    setFormVpnAlwaysOn(true)

    setFormPayloadRestrictions(true)
    setFormBlockUsb(true)
    setFormBlockCamera(false)
    setFormBlockScreenCapture(false)

    setFormPayloadPasscode(true)
    setFormMinPassLength(12)
    setFormAutoLockMinutes(5)
    setFormAllowBiometrics(true)

    setModalTab('general')
    setProfileModalOpen(true)
  }

  // Abertura para editar perfil existente
  const handleOpenEditProfile = (p: ConfigProfile) => {
    setEditingProfile(p)
    setFormName(p.name)
    setFormIdentifier(p.identifier)
    setFormPlatform(p.platform)
    setFormDescription(p.description)
    setFormVersion(p.version)

    setFormPayloadWifi(p.payloads.wifi)
    setFormWifiSsid(p.settings.wifiSsid || 'Novara-Corp-HQ')
    setFormWifiSecurity(p.settings.wifiSecurity || 'WPA3 Enterprise')

    setFormPayloadVpn(p.payloads.vpn)
    setFormVpnProtocol(p.settings.vpnProtocol || 'WireGuard')
    setFormVpnServer(p.settings.vpnServer || 'vpn.novara.corp:51820')
    setFormVpnAlwaysOn(!!p.settings.vpnAlwaysOn)

    setFormPayloadRestrictions(p.payloads.restrictions)
    setFormBlockUsb(!!p.settings.blockUsbWrite)
    setFormBlockCamera(!!p.settings.blockCamera)
    setFormBlockScreenCapture(!!p.settings.blockScreenCapture)

    setFormPayloadPasscode(p.payloads.passcode)
    setFormMinPassLength(p.settings.minPasswordLength || 12)
    setFormAutoLockMinutes(p.settings.autoLockMinutes || 5)
    setFormAllowBiometrics(!!p.settings.allowBiometrics)

    setModalTab('general')
    setProfileModalOpen(true)
  }

  // Salvar perfil
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast.warning('O nome do perfil é obrigatório.')
      return
    }

    if (editingProfile) {
      setProfiles((prev) =>
        prev.map((item) =>
          item.id === editingProfile.id
            ? {
                ...item,
                name: formName,
                identifier: formIdentifier,
                platform: formPlatform,
                description: formDescription,
                version: formVersion,
                updatedAt: 'Agora',
                payloads: {
                  wifi: formPayloadWifi,
                  vpn: formPayloadVpn,
                  restrictions: formPayloadRestrictions,
                  passcode: formPayloadPasscode,
                },
                settings: {
                  wifiSsid: formWifiSsid,
                  wifiSecurity: formWifiSecurity,
                  vpnServer: formVpnServer,
                  vpnProtocol: formVpnProtocol,
                  vpnAlwaysOn: formVpnAlwaysOn,
                  blockUsbWrite: formBlockUsb,
                  blockCamera: formBlockCamera,
                  blockScreenCapture: formBlockScreenCapture,
                  minPasswordLength: formMinPassLength,
                  autoLockMinutes: formAutoLockMinutes,
                  allowBiometrics: formAllowBiometrics,
                },
              }
            : item
        )
      )
      toast.success(`Perfil MDM "${formName}" atualizado com sucesso!`)
    } else {
      const newProf: ConfigProfile = {
        id: `prof-${Date.now()}`,
        name: formName,
        identifier: formIdentifier,
        platform: formPlatform,
        description: formDescription || 'Perfil de configuração criado pelo console.',
        version: formVersion,
        status: 'active',
        devicesCount: 0,
        updatedAt: 'Agora',
        payloads: {
          wifi: formPayloadWifi,
          vpn: formPayloadVpn,
          restrictions: formPayloadRestrictions,
          passcode: formPayloadPasscode,
        },
        settings: {
          wifiSsid: formWifiSsid,
          wifiSecurity: formWifiSecurity,
          vpnServer: formVpnServer,
          vpnProtocol: formVpnProtocol,
          vpnAlwaysOn: formVpnAlwaysOn,
          blockUsbWrite: formBlockUsb,
          blockCamera: formBlockCamera,
          blockScreenCapture: formBlockScreenCapture,
          minPasswordLength: formMinPassLength,
          autoLockMinutes: formAutoLockMinutes,
          allowBiometrics: formAllowBiometrics,
        },
      }
      setProfiles((prev) => [newProf, ...prev])
      toast.success(`Perfil MDM "${formName}" criado com sucesso!`)
    }

    setProfileModalOpen(false)
  }

  // Push remoto
  const handlePushProfile = (p: ConfigProfile) => {
    toast.info(`Iniciando transmissão remota de "${p.name}" para ${p.devicesCount} dispositivos...`)
    setTimeout(() => {
      toast.success(`Perfil ${p.name} sincronizado e instalado com sucesso na frota!`)
    }, 1400)
  }

  // Duplicar perfil
  const handleDuplicateProfile = (p: ConfigProfile) => {
    const copy: ConfigProfile = {
      ...p,
      id: `prof-${Date.now()}`,
      name: `${p.name} (Cópia)`,
      identifier: `${p.identifier}.copy`,
      devicesCount: 0,
      updatedAt: 'Agora',
    }
    setProfiles((prev) => [copy, ...prev])
    toast.success(`Perfil duplicado com sucesso!`)
  }

  // Confirmar exclusão
  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    setProfiles((prev) => prev.filter((p) => p.id !== deleteTarget.id))
    toast.success(`Perfil "${deleteTarget.name}" removido com sucesso.`)
    setDeleteTarget(null)
  }

  // Filtragem
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      if (!matchSearch) return false
      if (platformFilter !== 'all' && p.platform !== platformFilter) return false
      return true
    })
  }, [profiles, searchTerm, platformFilter])

  return (
    <div className="page-stack">
      {/* Cabeçalho */}
      <div className="welcome-row">
        <div>
          <p className="eyebrow">GERENCIAMENTO DE DISPOSITIVOS</p>
          <h2>Perfis de Configuração MDM</h2>
          <p>
            Criação e distribuição remota de perfis de segurança, Wi-Fi 802.1X, VPNs e restrições de hardware
          </p>
        </div>

        <Button icon="plus" onClick={handleOpenNewProfile}>
          Novo Perfil de Configuração
        </Button>
      </div>

      {/* Mini Métricas */}
      <div className="mini-metrics">
        <div>
          <div className="mini-icon blue">
            <Icon name="sliders" />
          </div>
          <div>
            <p>Perfis Ativos</p>
            <strong>{profiles.length}</strong>
          </div>
        </div>

        <div>
          <div className="mini-icon green">
            <Icon name="laptop" />
          </div>
          <div>
            <p>Dispositivos Cobertos</p>
            <strong>281</strong>
          </div>
        </div>

        <div>
          <div className="mini-icon amber">
            <Icon name="shield" />
          </div>
          <div>
            <p>Regras de Restrição</p>
            <strong>100% Conforme</strong>
          </div>
        </div>

        <div>
          <div className="mini-icon blue">
            <Icon name="check" />
          </div>
          <div>
            <p>Assinatura Criptográfica</p>
            <strong>SHA-256 MDM</strong>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="table-header panel" style={{ borderRadius: '12px', flexWrap: 'wrap', gap: '12px' }}>
        <div className="table-search" style={{ flex: '1 1 280px' }}>
          <label className="search" style={{ width: '100%' }}>
            <Icon name="search" />
            <input
              placeholder="Buscar perfil por nome, identificador ou payload..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
        </div>

        <div className="segmented" style={{ border: 0 }}>
          <button
            className={platformFilter === 'all' ? 'active' : ''}
            onClick={() => setPlatformFilter('all')}
          >
            Todas ({profiles.length})
          </button>
          <button
            className={platformFilter === 'macos' ? 'active' : ''}
            onClick={() => setPlatformFilter('macos')}
          >
            macOS
          </button>
          <button
            className={platformFilter === 'windows' ? 'active' : ''}
            onClick={() => setPlatformFilter('windows')}
          >
            Windows
          </button>
          <button
            className={platformFilter === 'kiosk' ? 'active' : ''}
            onClick={() => setPlatformFilter('kiosk')}
          >
            Totens / Kiosks
          </button>
          <button
            className={platformFilter === 'ios' ? 'active' : ''}
            onClick={() => setPlatformFilter('ios')}
          >
            Mobile (iOS)
          </button>
        </div>
      </div>

      {/* Grade de Perfis */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        {filteredProfiles.length === 0 ? (
          <div className="panel" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
            Nenhum perfil de configuração encontrado.
          </div>
        ) : (
          filteredProfiles.map((p) => (
            <article key={p.id} className="panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      display: 'grid',
                      placeItems: 'center',
                      background: p.platform === 'macos' ? 'var(--primary-soft)' : p.platform === 'kiosk' ? 'var(--amber-soft)' : '#f0f2f5',
                      color: p.platform === 'macos' ? 'var(--primary)' : p.platform === 'kiosk' ? 'var(--amber)' : '#4b5563',
                    }}
                  >
                    <Icon name={p.platform === 'kiosk' ? 'totem' : 'laptop'} size={22} />
                  </span>
                  <div>
                    <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{p.name}</strong>
                    <code style={{ display: 'block', fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
                      {p.identifier}
                    </code>
                  </div>
                </div>

                <Status tone="green">{p.version}</Status>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.5', margin: 0 }}>
                {p.description}
              </p>

              {/* Badges de Payloads */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {p.payloads.wifi && (
                  <span className="badge-tag green">
                    <Icon name="wifi" size={12} /> Wi-Fi Seguro
                  </span>
                )}
                {p.payloads.vpn && (
                  <span className="badge-tag blue">
                    <Icon name="shield" size={12} /> VPN Always-On
                  </span>
                )}
                {p.payloads.restrictions && (
                  <span className="badge-tag amber">
                    <Icon name="lock" size={12} /> Restrições Hardware
                  </span>
                )}
                {p.payloads.passcode && (
                  <span className="badge-tag">
                    <Icon name="check" size={12} /> Senha & Biometria
                  </span>
                )}
              </div>

              {/* Rodapé do Card */}
              <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  <strong>{p.devicesCount}</strong> dispositivos vinculados
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <Button variant="secondary" icon="refresh" title="Enviar Push Remoto" onClick={() => handlePushProfile(p)}>
                    Push
                  </Button>
                  <Button variant="ghost" icon="edit" title="Editar Perfil" onClick={() => handleOpenEditProfile(p)}>
                    Editar
                  </Button>
                  <Button variant="ghost" icon="copy" title="Duplicar Perfil" onClick={() => handleDuplicateProfile(p)} />
                  <Button variant="ghost" icon="trash" title="Excluir Perfil" onClick={() => setDeleteTarget(p)} />
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* MODAL COM ABAS DE PAYLOADS MDM */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title={editingProfile ? 'Editar Perfil de Configuração MDM' : 'Criar Novo Perfil de Configuração MDM'}
        subtitle="Defina os payloads corporativos (.mobileconfig / OMA-URI) enviados silenciosamente aos dispositivos"
        icon="sliders"
        maxWidth={680}
      >
        <form onSubmit={handleSaveProfile} className="page-stack">
          {/* Navegação entre abas do modal */}
          <div className="admin-tabs" style={{ marginBottom: '14px' }}>
            <button
              type="button"
              className={modalTab === 'general' ? 'active' : ''}
              onClick={() => setModalTab('general')}
            >
              Geral
            </button>
            <button
              type="button"
              className={modalTab === 'wifi' ? 'active' : ''}
              onClick={() => setModalTab('wifi')}
            >
              Wi-Fi Seguro {formPayloadWifi && '•'}
            </button>
            <button
              type="button"
              className={modalTab === 'vpn' ? 'active' : ''}
              onClick={() => setModalTab('vpn')}
            >
              VPN Corporativa {formPayloadVpn && '•'}
            </button>
            <button
              type="button"
              className={modalTab === 'restrictions' ? 'active' : ''}
              onClick={() => setModalTab('restrictions')}
            >
              Restrições {formPayloadRestrictions && '•'}
            </button>
            <button
              type="button"
              className={modalTab === 'passcode' ? 'active' : ''}
              onClick={() => setModalTab('passcode')}
            >
              Senhas & Bloqueio {formPayloadPasscode && '•'}
            </button>
          </div>

          {/* ABA GERAL */}
          {modalTab === 'general' && (
            <div className="page-stack">
              <label className="field full">
                <span>Nome de Exibição do Perfil</span>
                <input
                  type="text"
                  placeholder="Ex: Política de Rede & Segurança Matriz"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </label>

              <div className="form-grid">
                <label className="field">
                  <span>Plataforma Alvo</span>
                  <select
                    value={formPlatform}
                    onChange={(e) => setFormPlatform(e.target.value as any)}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  >
                    <option value="macos">macOS (Apple Silicon / Intel)</option>
                    <option value="windows">Windows 11 / 10 Enterprise</option>
                    <option value="kiosk">Totens & Kiosks de Atendimento</option>
                    <option value="ios">Apple iOS / iPadOS</option>
                    <option value="linux">Linux Desktop (Ubuntu / Debian)</option>
                  </select>
                </label>

                <label className="field">
                  <span>Versão do Perfil</span>
                  <input
                    type="text"
                    placeholder="v1.0"
                    value={formVersion}
                    onChange={(e) => setFormVersion(e.target.value)}
                  />
                </label>

                <label className="field full">
                  <span>Identificador Único de Domínio (PayloadIdentifier)</span>
                  <input
                    type="text"
                    placeholder="com.novara.mdm.config"
                    value={formIdentifier}
                    onChange={(e) => setFormIdentifier(e.target.value)}
                    required
                  />
                </label>

                <label className="field full">
                  <span>Descrição da Finalidade</span>
                  <textarea
                    placeholder="Descreva as diretrizes de segurança aplicadas por este perfil..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    style={{ height: '70px' }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* ABA WI-FI SEGURO */}
          {modalTab === 'wifi' && (
            <div className="page-stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8f9fc', borderRadius: '10px', border: '1px solid var(--line)' }}>
                <div>
                  <strong>Habilitar Configuração de Wi-Fi</strong>
                  <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>
                    Conecta os dispositivos automaticamente às redes corporativas seguras
                  </p>
                </div>
                <button
                  type="button"
                  className={`toggle ${formPayloadWifi ? 'on' : ''}`}
                  onClick={() => setFormPayloadWifi(!formPayloadWifi)}
                >
                  <i />
                </button>
              </div>

              {formPayloadWifi && (
                <div className="form-grid" style={{ marginTop: '10px' }}>
                  <label className="field full">
                    <span>SSID da Rede Sem Fio</span>
                    <input
                      type="text"
                      placeholder="Ex: Novara-Corp-HQ"
                      value={formWifiSsid}
                      onChange={(e) => setFormWifiSsid(e.target.value)}
                    />
                  </label>

                  <label className="field full">
                    <span>Tipo de Segurança</span>
                    <select
                      value={formWifiSecurity}
                      onChange={(e) => setFormWifiSecurity(e.target.value)}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
                    >
                      <option value="WPA3 Enterprise (802.1X EAP-TLS)">WPA3 Enterprise (802.1X EAP-TLS com certificado)</option>
                      <option value="WPA2 Enterprise (PEAP-MSCHAPv2)">WPA2 Enterprise (PEAP-MSCHAPv2 com credencial de domínio)</option>
                      <option value="WPA3 Personal">WPA3 Personal (SAE)</option>
                      <option value="WPA2 Personal">WPA2 Personal (Pre-shared key)</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* ABA VPN */}
          {modalTab === 'vpn' && (
            <div className="page-stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8f9fc', borderRadius: '10px', border: '1px solid var(--line)' }}>
                <div>
                  <strong>Habilitar Túnel VPN Corporativo</strong>
                  <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>
                    Criptografia de tráfego ponta-a-ponta para acesso à intranet
                  </p>
                </div>
                <button
                  type="button"
                  className={`toggle ${formPayloadVpn ? 'on' : ''}`}
                  onClick={() => setFormPayloadVpn(!formPayloadVpn)}
                >
                  <i />
                </button>
              </div>

              {formPayloadVpn && (
                <div className="form-grid" style={{ marginTop: '10px' }}>
                  <label className="field">
                    <span>Protocolo VPN</span>
                    <select
                      value={formVpnProtocol}
                      onChange={(e) => setFormVpnProtocol(e.target.value)}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
                    >
                      <option value="WireGuard">WireGuard (Alta Performance / Chaves Públicas)</option>
                      <option value="IPsec IKEv2">IPsec IKEv2 (Suporte nativo a múltiplos SOs)</option>
                      <option value="OpenVPN">OpenVPN SSL (TCP / UDP)</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>Gateway / Servidor VPN</span>
                    <input
                      type="text"
                      placeholder="vpn.novara.corp:51820"
                      value={formVpnServer}
                      onChange={(e) => setFormVpnServer(e.target.value)}
                    />
                  </label>

                  <div className="field full" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      id="vpn-always"
                      checked={formVpnAlwaysOn}
                      onChange={(e) => setFormVpnAlwaysOn(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                    />
                    <label htmlFor="vpn-always" style={{ fontSize: '12px', color: 'var(--ink)' }}>
                      <strong>Always-On VPN (Conexão obrigatória contínua)</strong>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)' }}>
                        Bloqueia qualquer conexão à internet caso o túnel corporativo caia.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA RESTRIÇÕES */}
          {modalTab === 'restrictions' && (
            <div className="page-stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8f9fc', borderRadius: '10px', border: '1px solid var(--line)' }}>
                <div>
                  <strong>Restrições de Hardware & Proteção de Dados (DLP)</strong>
                  <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>
                    Controle de periféricos externos, captura de tela e mídias removíveis
                  </p>
                </div>
                <button
                  type="button"
                  className={`toggle ${formPayloadRestrictions ? 'on' : ''}`}
                  onClick={() => setFormPayloadRestrictions(!formPayloadRestrictions)}
                >
                  <i />
                </button>
              </div>

              {formPayloadRestrictions && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }}>
                    <input
                      type="checkbox"
                      checked={formBlockUsb}
                      onChange={(e) => setFormBlockUsb(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                    />
                    <div>
                      <strong style={{ fontSize: '12px' }}>Bloquear Gravação em Armazenamento USB (DLP)</strong>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>
                        Permite apenas leitura em pendrives desconhecidos; impede vazamento de dados.
                      </p>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }}>
                    <input
                      type="checkbox"
                      checked={formBlockCamera}
                      onChange={(e) => setFormBlockCamera(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                    />
                    <div>
                      <strong style={{ fontSize: '12px' }}>Desativar Câmera e Microfone em Modo Kiosk</strong>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>
                        Recomendado para totens e terminais públicos de autoatendimento.
                      </p>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }}>
                    <input
                      type="checkbox"
                      checked={formBlockScreenCapture}
                      onChange={(e) => setFormBlockScreenCapture(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                    />
                    <div>
                      <strong style={{ fontSize: '12px' }}>Bloquear Capturas de Tela (Screenshots / Gravação)</strong>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>
                        Impede captura de tela não autorizada de dados sigilosos e relatórios confidenciais.
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* ABA SENHAS & BLOQUEIO */}
          {modalTab === 'passcode' && (
            <div className="page-stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8f9fc', borderRadius: '10px', border: '1px solid var(--line)' }}>
                <div>
                  <strong>Políticas de Senha & Bloqueio Automático</strong>
                  <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>
                    Requisitos mínimos de complexidade e tempo limite de inatividade
                  </p>
                </div>
                <button
                  type="button"
                  className={`toggle ${formPayloadPasscode ? 'on' : ''}`}
                  onClick={() => setFormPayloadPasscode(!formPayloadPasscode)}
                >
                  <i />
                </button>
              </div>

              {formPayloadPasscode && (
                <div className="form-grid" style={{ marginTop: '10px' }}>
                  <label className="field">
                    <span>Comprimento Mínimo de Senha</span>
                    <select
                      value={formMinPassLength}
                      onChange={(e) => setFormMinPassLength(Number(e.target.value))}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
                    >
                      <option value={8}>8 caracteres</option>
                      <option value={10}>10 caracteres</option>
                      <option value={12}>12 caracteres (Recomendado Corporativo)</option>
                      <option value={16}>16 caracteres (Rigoroso / Alta Segurança)</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>Bloqueio de Tela por Inatividade</span>
                    <select
                      value={formAutoLockMinutes}
                      onChange={(e) => setFormAutoLockMinutes(Number(e.target.value))}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
                    >
                      <option value={1}>1 minuto (Totens / Kiosks)</option>
                      <option value={2}>2 minutos</option>
                      <option value={5}>5 minutos (Padrão Corporativo)</option>
                      <option value={10}>10 minutos</option>
                    </select>
                  </label>

                  <div className="field full" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      id="pass-bio"
                      checked={formAllowBiometrics}
                      onChange={(e) => setFormAllowBiometrics(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                    />
                    <label htmlFor="pass-bio" style={{ fontSize: '12px', color: 'var(--ink)' }}>
                      <strong>Permitir Biometria Rápida (Touch ID / Windows Hello)</strong>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)' }}>
                        O usuário pode utilizar a biometria para desbloqueio diário, respeitando a senha mestre.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rodapé do Modal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              Assinatura: <code>SHA-256 MDM Automated Push</code>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button variant="secondary" onClick={() => setProfileModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingProfile ? 'Salvar Alterações' : 'Criar Perfil MDM'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Confirmar Exclusão de Perfil MDM"
        subtitle="Remoção permanente de diretrizes de configuração dos dispositivos"
        icon="warning"
        maxWidth={460}
      >
        <div className="page-stack">
          <p style={{ fontSize: '13px', color: 'var(--ink)' }}>
            Tem certeza de que deseja remover o perfil <strong>{deleteTarget?.name}</strong>?
          </p>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
            O perfil será revogado dos {deleteTarget?.devicesCount} dispositivos vinculados na próxima sincronização.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Confirmar Exclusão
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
