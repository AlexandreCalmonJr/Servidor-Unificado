import { useState, useMemo } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status, MetricCard } from '../components/UI'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import type { PageId, StatusTone } from '../types'

interface MobileItem {
  id: string
  name: string
  model: string
  owner: string
  department: string
  os: string
  imei: string
  carrier: string
  signal: string
  battery: number
  storage: string
  passcodeCompliant: boolean
  lostMode: boolean
  status: 'Conforme' | 'Modo Perdido' | 'Atenção'
  tone: StatusTone
  lastSync: string
}

const initialMobiles: MobileItem[] = [
  {
    id: 'MOB-IOS-0031',
    name: 'iPhone 16 Pro 256GB',
    model: 'Apple iPhone 16 Pro (A3293)',
    owner: 'Sofia Alves',
    department: 'Diretoria Executiva',
    os: 'iOS 18.5',
    imei: '354892110482910',
    carrier: 'Vivo Empresas 5G',
    signal: 'Excelente (-68 dBm)',
    battery: 84,
    storage: '68 GB usados / 256 GB',
    passcodeCompliant: true,
    lostMode: false,
    status: 'Conforme',
    tone: 'green',
    lastSync: 'Há 4 min',
  },
  {
    id: 'MOB-AND-0015',
    name: 'Samsung Galaxy S25 Enterprise',
    model: 'Galaxy S25 5G (SM-S931B)',
    owner: 'Bruno Rocha',
    department: 'Operações de Campo',
    os: 'Android 15 (One UI 7)',
    imei: '864910283910294',
    carrier: 'Claro Corporativo 5G',
    signal: 'Bom (-75 dBm)',
    battery: 92,
    storage: '42 GB usados / 128 GB',
    passcodeCompliant: true,
    lostMode: false,
    status: 'Conforme',
    tone: 'green',
    lastSync: 'Há 12 min',
  },
  {
    id: 'MOB-IOS-0044',
    name: 'iPad Pro 11" M4 (Logística)',
    model: 'Apple iPad Pro 11 (2024)',
    owner: 'Almoxarifado Central',
    department: 'Logística & Suprimentos',
    os: 'iPadOS 18.2',
    imei: '359102948192014',
    carrier: 'TIM Corporativo 4G',
    signal: 'Regular (-82 dBm)',
    battery: 45,
    storage: '30 GB usados / 256 GB',
    passcodeCompliant: true,
    lostMode: false,
    status: 'Conforme',
    tone: 'green',
    lastSync: 'Há 22 min',
  },
  {
    id: 'MOB-AND-0028',
    name: 'Motorola ThinkPhone',
    model: 'ThinkPhone by Motorola',
    owner: 'Daniel Silveira',
    department: 'Vendas & Consultoria',
    os: 'Android 14',
    imei: '861928301928491',
    carrier: 'Vivo Empresas 5G',
    signal: 'Sem sinal / Perdido',
    battery: 18,
    storage: '80 GB usados / 256 GB',
    passcodeCompliant: true,
    lostMode: true,
    status: 'Modo Perdido',
    tone: 'red',
    lastSync: 'Há 2 dias',
  },
  {
    id: 'MOB-IOS-0019',
    name: 'iPhone 15 128GB',
    model: 'Apple iPhone 15 (A3090)',
    owner: 'Carla Nogueira',
    department: 'Controladoria & Auditoria',
    os: 'iOS 18.3',
    imei: '351928401928401',
    carrier: 'Claro Corporativo 5G',
    signal: 'Excelente (-64 dBm)',
    battery: 67,
    storage: '54 GB usados / 128 GB',
    passcodeCompliant: true,
    lostMode: false,
    status: 'Conforme',
    tone: 'green',
    lastSync: 'Há 8 min',
  },
]

export function MobileDevices({ go }: { go: (p: PageId) => void }) {
  const [mobiles, setMobiles] = useState<MobileItem[]>(initialMobiles)
  const [subTab, setSubTab] = useState<'devices' | 'emergency' | 'policies'>('devices')
  const [query, setQuery] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('all')

  // Modais
  const [lostModalOpen, setLostModalOpen] = useState(false)
  const [wipeModalOpen, setWipeModalOpen] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [selectedMobile, setSelectedMobile] = useState<MobileItem | null>(null)

  // Form novo mobile
  const [formName, setFormName] = useState('')
  const [formModel, setFormModel] = useState('Apple iPhone 16 Pro')
  const [formOwner, setFormOwner] = useState('')
  const [formImei, setFormImei] = useState('')
  const [formCarrier, setFormCarrier] = useState('Vivo Empresas 5G')
  const [formOs, setFormOs] = useState('iOS 18.5')

  const toast = useToast()

  const filtered = useMemo(() => {
    return mobiles.filter((m) => {
      const matchQuery = `${m.name} ${m.owner} ${m.imei} ${m.carrier} ${m.department}`
        .toLowerCase()
        .includes(query.toLowerCase())
      const matchPlat =
        filterPlatform === 'all' ||
        (filterPlatform === 'ios' && m.os.includes('iOS')) ||
        (filterPlatform === 'android' && m.os.includes('Android'))
      return matchQuery && matchPlat
    })
  }, [mobiles, query, filterPlatform])

  const handleOpenLostMode = (item: MobileItem) => {
    setSelectedMobile(item)
    setLostModalOpen(true)
  }

  const handleOpenWipe = (item: MobileItem) => {
    setSelectedMobile(item)
    setWipeModalOpen(true)
  }

  const handleConfirmLostMode = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMobile) return

    setMobiles((prev) =>
      prev.map((m) =>
        m.id === selectedMobile.id
          ? { ...m, lostMode: !m.lostMode, status: m.lostMode ? 'Conforme' : 'Modo Perdido', tone: m.lostMode ? 'green' : 'red' }
          : m
      )
    )

    setLostModalOpen(false)
    toast.warning(
      `Comando emitido via APNs/FCM: Modo Perdido ${selectedMobile.lostMode ? 'DESATIVADO' : 'ATIVADO'} para ${selectedMobile.name} com mensagem de contato na tela!`
    )
  }

  const handleConfirmSelectiveWipe = () => {
    if (!selectedMobile) return
    setWipeModalOpen(false)
    toast.success(
      `Wipe Seletivo Corporativo executado com sucesso em ${selectedMobile.name}! Aplicativos, certificados e VPN corporativos foram expurgados.`
    )
  }

  const handleAddMobile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formImei.trim()) {
      toast.warning('Nome e IMEI são obrigatórios.')
      return
    }

    const newItem: MobileItem = {
      id: `MOB-${Date.now().toString().slice(-4)}`,
      name: formName,
      model: formModel,
      owner: formOwner || 'Colaborador',
      department: 'Operações Corporativas',
      os: formOs,
      imei: formImei,
      carrier: formCarrier,
      signal: 'Excelente (-70 dBm)',
      battery: 100,
      storage: '18 GB usados / 128 GB',
      passcodeCompliant: true,
      lostMode: false,
      status: 'Conforme',
      tone: 'green',
      lastSync: 'Agora mesmo',
    }

    setMobiles((prev) => [newItem, ...prev])
    setNewModalOpen(false)
    toast.success(`Dispositivo móvel "${formName}" cadastrado com perfil EMM ativo!`)
  }

  return (
    <div className="page-stack">
      {/* Cabeçalho */}
      <div className="action-row">
        <div>
          <p className="eyebrow">MOBILIDADE & EMM CORPORATIVO</p>
          <h2>Módulo Smartphones & Tablets (Mobile)</h2>
          <p>Gestão centralizada de frotas iOS e Android, Modo Perdido, IMEI, operadoras de dados e wipe corporativo.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            icon="rocket"
            onClick={() => setQrModalOpen(true)}
          >
            QR de Matrícula
          </Button>
          <Button icon="plus" onClick={() => setNewModalOpen(true)}>
            Cadastrar Mobile
          </Button>
        </div>
      </div>

      {/* Métricas Mobile */}
      <section className="metrics-grid">
        <MetricCard
          label="Total de Mobiles"
          value={mobiles.length}
          delta="100%"
          detail="smartphones e tablets"
          icon="phone"
          tone="blue"
        />
        <MetricCard
          label="Em Conformidade EMM"
          value={mobiles.filter((m) => m.status === 'Conforme').length}
          delta="Senha e Biometria"
          detail="políticas ativas"
          icon="check"
          tone="green"
        />
        <MetricCard
          label="Modo Perdido / Alerta"
          value={mobiles.filter((m) => m.lostMode).length}
          delta="Rastreamento"
          detail="bloqueio de tela ativo"
          icon="warning"
          tone="amber"
        />
        <MetricCard
          label="Conexão Celular 5G"
          value="92%"
          delta="Vivo / Claro"
          detail="chips M2M corporativos"
          icon="wifi"
          tone="violet"
        />
      </section>

      {/* Barra de Abas */}
      <div className="detail-tabs">
        <button
          className={subTab === 'devices' ? 'active' : ''}
          onClick={() => setSubTab('devices')}
        >
          Dispositivos Móveis ({mobiles.length})
        </button>
        <button
          className={subTab === 'emergency' ? 'active' : ''}
          onClick={() => setSubTab('emergency')}
        >
          Central de Emergência (Modo Perdido & Wipe)
        </button>
        <button
          className={subTab === 'policies' ? 'active' : ''}
          onClick={() => setSubTab('policies')}
        >
          Políticas EMM & Conteinerização (Knox / Apple ABM)
        </button>
      </div>

      {/* ABA 1: LISTA DE MOBILES */}
      {subTab === 'devices' && (
        <section className="panel table-panel">
          <div className="table-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
            <label className="search table-search" style={{ flex: '1 1 280px' }}>
              <Icon name="search" />
              <input
                placeholder="Buscar por colaborador, modelo, IMEI ou operadora..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            <select
              style={{ border: '1px solid var(--line)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
            >
              <option value="all">Todas as Plataformas</option>
              <option value="ios">Apple iOS / iPadOS</option>
              <option value="android">Google Android Enterprise</option>
            </select>

            <Button
              variant="secondary"
              icon="download"
              onClick={() => toast.success('Inventário de celulares e tablets exportado (CSV)!')}
            >
              Exportar CSV
            </Button>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Dispositivo Móvel</th>
                  <th>Sistema & Versão</th>
                  <th>IMEI do Aparelho</th>
                  <th>Operadora & Chip 5G</th>
                  <th>Bateria & Armazenamento</th>
                  <th>Último Sync</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <button
                        type="button"
                        className="device-cell device-link"
                        onClick={() => go('mobileDetail')}
                      >
                        <span style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                          <Icon name="phone" />
                        </span>
                        <div>
                          <strong>{m.name}</strong>
                          <small>{m.owner} · {m.department}</small>
                        </div>
                      </button>
                    </td>
                    <td>
                      <strong>{m.os}</strong>
                      <br />
                      <small style={{ color: 'var(--muted)', fontSize: '10px' }}>{m.model}</small>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--ink)' }}>{m.imei}</span>
                    </td>
                    <td>
                      <strong>{m.carrier}</strong>
                      <br />
                      <small style={{ color: 'var(--muted)', fontSize: '10px' }}>{m.signal}</small>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="progress" style={{ width: '50px', height: '6px' }}>
                          <i
                            className={m.battery < 20 ? 'os-amber' : 'os-green'}
                            style={{ width: `${m.battery}%` }}
                          />
                        </div>
                        <strong style={{ fontSize: '11px' }}>{m.battery}%</strong>
                      </div>
                      <small style={{ color: 'var(--muted)', fontSize: '10px' }}>{m.storage}</small>
                    </td>
                    <td>{m.lastSync}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Status tone={m.tone}>{m.status}</Status>
                        <Button
                          variant="ghost"
                          icon="warning"
                          onClick={() => handleOpenLostMode(m)}
                          title="Modo Perdido / Bloqueio Remoto"
                        >
                          {m.lostMode ? 'Desativar' : 'Bloquear'}
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

      {/* ABA 2: EMERGÊNCIA & WIPE */}
      {subTab === 'emergency' && (
        <article className="panel form-panel">
          <div className="form-heading">
            <span>RESPOSTA A INCIDENTES DE SEGURANÇA</span>
            <h3>Ações Remotas para Aparelhos Extraviados ou Furtados</h3>
            <p>
              Em caso de perda ou desligamento de colaborador, execute o bloqueio imediato com localização GPS ou expurgo seletivo de dados corporativos.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {mobiles.map((m) => (
              <div key={m.id} className="panel" style={{ padding: '18px', background: '#fafbfc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{m.name}</strong>
                  <Status tone={m.tone}>{m.status}</Status>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '4px 0 14px' }}>
                  Responsável: <strong>{m.owner}</strong> · {m.department} · IMEI: {m.imei}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant={m.lostMode ? 'primary' : 'secondary'}
                    icon="warning"
                    onClick={() => handleOpenLostMode(m)}
                  >
                    {m.lostMode ? 'Desativar Modo Perdido' : 'Modo Perdido (GPS)'}
                  </Button>
                  <Button
                    variant="danger"
                    icon="trash"
                    onClick={() => handleOpenWipe(m)}
                  >
                    Wipe Corporativo
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* ABA 3: POLÍTICAS EMM */}
      {subTab === 'policies' && (
        <div className="tab-full-stack">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <article className="panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Conteinerização de Dados (BYOD vs Corporativo)</h3>
                <Status tone="green">Ativo</Status>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '6px' }}>
                Isolamento criptográfico do perfil de trabalho (Work Profile). Impede cópia de texto ou anexos corporativos para apps pessoais como WhatsApp ou redes sociais.
              </p>
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className="badge-tag green">Criptografia de Arquivos em Repouso</span>
                <span className="badge-tag blue">Bloqueio de Captura de Tela em Apps da Empresa</span>
                <span className="badge-tag blue">Exigência de Senha Alfanumérica de 6 Dígitos</span>
              </div>
            </article>

            <article className="panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Apple Business Manager & Samsung Knox</h3>
                <span className="badge-tag green">Zero-Touch Ativo</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '6px' }}>
                Dispositivos novos são provisionados automaticamente na primeira inicialização logo após a conexão ao Wi-Fi, sem necessidade de configuração manual pelo colaborador.
              </p>
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className="badge-tag blue">Supervision Mode Ativado no iOS</span>
                <span className="badge-tag green">Knox Mobile Enrollment (KME) Sincronizado</span>
              </div>
            </article>
          </div>
        </div>
      )}

      {/* MODAL MODO PERDIDO */}
      <Modal
        isOpen={lostModalOpen}
        onClose={() => setLostModalOpen(false)}
        title={selectedMobile?.lostMode ? 'Desativar Modo Perdido' : 'Ativar Modo Perdido & Rastreamento'}
        subtitle={`Dispositivo: ${selectedMobile?.name} (${selectedMobile?.owner})`}
        icon="warning"
        maxWidth={500}
      >
        <form onSubmit={handleConfirmLostMode} className="page-stack">
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Ao ativar o Modo Perdido, o dispositivo é travado com senha e uma mensagem personalizada é exibida com o telefone do suporte para devolução.
          </p>

          <label className="field full">
            <span>Mensagem de Tela de Bloqueio</span>
            <input defaultValue="Propriedade Corporativa Novara. Por favor, devolva ao departamento de TI." />
          </label>

          <label className="field full">
            <span>Telefone de Contato Exibido na Tela</span>
            <input defaultValue="+55 (11) 3042-8900" />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
            <Button variant="secondary" onClick={() => setLostModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {selectedMobile?.lostMode ? 'Confirmar Desbloqueio' : 'Ativar Modo Perdido Agora'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL WIPE CORPORATIVO */}
      <Modal
        isOpen={wipeModalOpen}
        onClose={() => setWipeModalOpen(false)}
        title="Confirmar Wipe Seletivo Corporativo"
        subtitle={`Dispositivo: ${selectedMobile?.name}`}
        icon="trash"
        maxWidth={480}
      >
        <div className="page-stack">
          <div className="security-banner" style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
            <span>
              <Icon name="warning" />
            </span>
            <div>
              <strong style={{ color: '#991b1b' }}>Ação Irreversível</strong>
              <p style={{ color: '#7f1d1d' }}>
                Todos os e-mails, certificados corporativos, VPN e documentos do espaço de trabalho serão apagados remotamente.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
            <Button variant="secondary" onClick={() => setWipeModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleConfirmSelectiveWipe}>
              Executar Wipe Corporativo
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL QR CODE DE MATRÍCULA */}
      <Modal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="QR Code de Provisionamento Mobile"
        subtitle="Aponte a câmera do smartphone na tela de boas-vindas para matricular no MDM"
        icon="rocket"
        maxWidth={460}
      >
        <div className="page-stack" style={{ alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: '200px', height: '200px', background: '#f1f5f9', border: '1px solid var(--line)', borderRadius: '12px', display: 'grid', placeItems: 'center', margin: '14px 0' }}>
            <Icon name="blocks" size={64} />
          </div>
          <p style={{ fontSize: '11px', color: 'var(--muted)', maxWidth: '320px' }}>
            Contém o token seguro de registro do servidor com associação direta ao perfil empresarial.
          </p>
          <Button onClick={() => setQrModalOpen(false)}>Concluir</Button>
        </div>
      </Modal>

      {/* MODAL CADASTRO DE MOBILE */}
      <Modal
        isOpen={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title="Cadastrar Aparelho Celular ou Tablet"
        subtitle="Adicione um dispositivo móvel ao catálogo EMM"
        icon="phone"
        maxWidth={520}
      >
        <form onSubmit={handleAddMobile} className="page-stack">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="field">
              <span>Nome do Aparelho</span>
              <input
                placeholder="Ex.: iPhone 16 Pro"
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
              <span>Número de IMEI</span>
              <input
                placeholder="Ex.: 354892110482910"
                value={formImei}
                onChange={(e) => setFormImei(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Sistema Operacional</span>
              <select
                value={formOs}
                onChange={(e) => setFormOs(e.target.value)}
              >
                <option value="iOS 18.5">Apple iOS 18.5</option>
                <option value="iPadOS 18.2">Apple iPadOS 18.2</option>
                <option value="Android 15">Android 15 Enterprise</option>
                <option value="Android 14">Android 14 Enterprise</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="field">
              <span>Colaborador</span>
              <input
                placeholder="Nome do usuário"
                value={formOwner}
                onChange={(e) => setFormOwner(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Operadora de Chip M2M</span>
              <select
                value={formCarrier}
                onChange={(e) => setFormCarrier(e.target.value)}
              >
                <option value="Vivo Empresas 5G">Vivo Empresas 5G</option>
                <option value="Claro Corporativo 5G">Claro Corporativo 5G</option>
                <option value="TIM Corporativo 4G">TIM Corporativo 4G</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <Button variant="secondary" onClick={() => setNewModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Cadastrar Aparelho</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
