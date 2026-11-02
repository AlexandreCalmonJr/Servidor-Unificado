import { useState } from 'react'
import PageIcon, { type PageIconName } from '../components/PageIcon'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import type { PageId } from '../types'
import '../styles/cybersecurity.css'

interface SecurityAlert {
  id: string
  severity: 'Crítico' | 'Alto' | 'Médio' | 'Baixo'
  tone: 'critical' | 'high' | 'medium' | 'low'
  title: string
  server: string
  source: string
  time: string
  icon: PageIconName
  status: 'active' | 'investigating' | 'quarantined' | 'resolved'
}

interface QuarantinedDevice {
  id: string
  name: string
  ip: string
  reason: string
  quarantinedAt: string
  mac: string
}

export function CyberSecurity({ go }: { go?: (p: PageId) => void }) {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'alerts' | 'quarantine' | 'firewall' | 'terminal'>('alerts')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null)
  const [isQuarantineModalOpen, setIsQuarantineModalOpen] = useState(false)
  const [totpToken, setTotpToken] = useState('')
  const [totpError, setTotpError] = useState('')

  const [alerts, setAlerts] = useState<SecurityAlert[]>([
    {
      id: 'alt-01',
      severity: 'Crítico',
      tone: 'critical',
      title: 'Tentativa de acesso privilegiado (Brute Force SSH)',
      server: 'SRV-AUTH-01',
      source: '185.220.101.42',
      time: 'Há 3 min',
      icon: 'key',
      status: 'active'
    },
    {
      id: 'alt-02',
      severity: 'Alto',
      tone: 'high',
      title: 'Comportamento anômalo detectado (Injeção de Processo)',
      server: 'SRV-API-03',
      source: 'Processo powershell.exe (-enc)',
      time: 'Há 18 min',
      icon: 'pulse',
      status: 'active'
    },
    {
      id: 'alt-03',
      severity: 'Médio',
      tone: 'medium',
      title: 'Múltiplas falhas consecutivas de autenticação PAM',
      server: 'SRV-FILES-02',
      source: '10.42.8.91 (Bancada Técnica)',
      time: 'Há 42 min',
      icon: 'lock',
      status: 'investigating'
    },
    {
      id: 'alt-04',
      severity: 'Baixo',
      tone: 'low',
      title: 'Varredura de portas TCP (Port scan sintético)',
      server: 'SRV-MON-01',
      source: '10.0.4.15 (Totem Hall B)',
      time: 'Há 1h',
      icon: 'shield',
      status: 'resolved'
    }
  ])

  const [quarantinedDevices, setQuarantinedDevices] = useState<QuarantinedDevice[]>([
    {
      id: 'dev-totem-12',
      name: 'TOTEM-QUIOSQUE-02',
      ip: '10.42.12.102',
      reason: 'Tráfego malicioso detectado em porta não padrão (65532)',
      quarantinedAt: 'Hoje, 14:22',
      mac: 'E4:5F:01:2B:99:1C'
    },
    {
      id: 'dev-desk-09',
      name: 'DESK-FINANCEIRO-03',
      ip: '10.0.2.88',
      reason: 'Tentativa de conexão USB não autorizada (DLP Trigger)',
      quarantinedAt: 'Ontem, 18:05',
      mac: 'A8:20:66:D1:43:55'
    }
  ])

  const filteredAlerts = alerts.filter(a => {
    if (severityFilter === 'all') return true
    return a.tone === severityFilter
  })

  const handleOpenQuarantineModal = (alert: SecurityAlert) => {
    setSelectedAlert(alert)
    setTotpToken('')
    setTotpError('')
    setIsQuarantineModalOpen(true)
  }

  const handleConfirmQuarantine = () => {
    if (!totpToken || totpToken.length < 6) {
      setTotpError('Insira o código TOTP de 6 dígitos do autenticador de segurança.')
      return
    }

    if (selectedAlert) {
      setAlerts(prev =>
        prev.map(a => (a.id === selectedAlert.id ? { ...a, status: 'quarantined' } : a))
      )

      setQuarantinedDevices(prev => [
        {
          id: `dev-${Date.now()}`,
          name: selectedAlert.server,
          ip: selectedAlert.source,
          reason: `Isolamento preventivo: ${selectedAlert.title}`,
          quarantinedAt: 'Agora mesmo',
          mac: 'AUTO:DETECTED:VLAN'
        },
        ...prev
      ])

      toast.success(
        `Dispositivo ${selectedAlert.server} isolado em quarentena de rede. Trilha de auditoria registrada.`
      )
    }

    setIsQuarantineModalOpen(false)
  }

  const handleReleaseQuarantine = (devId: string, name: string) => {
    setQuarantinedDevices(prev => prev.filter(d => d.id !== devId))
    toast.info(`Dispositivo ${name} liberado da quarentena de rede com sucesso.`)
  }

  return (
    <div className="cyber-container">
      {/* Hero Header de Cibersegurança & Postura SOC */}
      <section className="cyber-hero">
        <div className="cyber-hero-info">
          <h2>
            <PageIcon name="shield" size={28} />
            Central de Operações de Cibersegurança & SOC
          </h2>
          <p>
            Monitoramento de ameaças em tempo real, detecção heurística de anomalias (EDR), quarentena imediata de
            dispositivos e postura de conformidade Zero-Trust em toda a frota MDM.
          </p>
        </div>

        <div className="cyber-hero-stats">
          <div className="cyber-score-card">
            <div className="score-num">98.4%</div>
            <span>Índice de Saúde EDR</span>
          </div>
          <div className="cyber-score-card">
            <div className="score-num" style={{ color: '#38bdf8' }}>
              412
            </div>
            <span>Agentes Vigiados</span>
          </div>
        </div>
      </section>

      {/* Grid de KPIs de Segurança */}
      <section className="cyber-grid-kpis">
        <div className="cyber-kpi-card">
          <div className="cyber-kpi-icon critical">
            <PageIcon name="key" size={20} />
          </div>
          <div className="cyber-kpi-data">
            <strong>1 Crítico</strong>
            <span>Ação Imediata Requerida</span>
          </div>
        </div>

        <div className="cyber-kpi-card">
          <div className="cyber-kpi-icon high">
            <PageIcon name="pulse" size={20} />
          </div>
          <div className="cyber-kpi-data">
            <strong>1 Alto</strong>
            <span>Investigação Heurística</span>
          </div>
        </div>

        <div className="cyber-kpi-card">
          <div className="cyber-kpi-icon medium">
            <PageIcon name="lock" size={20} />
          </div>
          <div className="cyber-kpi-data">
            <strong>{quarantinedDevices.length} Isolados</strong>
            <span>Dispositivos em Quarentena</span>
          </div>
        </div>

        <div className="cyber-kpi-card">
          <div className="cyber-kpi-icon safe">
            <PageIcon name="check" size={20} />
          </div>
          <div className="cyber-kpi-data">
            <strong>100% Criptografia</strong>
            <span>BitLocker / FileVault Ativos</span>
          </div>
        </div>
      </section>

      {/* Tabs de Navegação no Módulo */}
      <div className="cyber-tabs">
        <button
          className={`cyber-tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <PageIcon name="warning" size={16} />
          Alertas de Ameaças ({alerts.filter(a => a.status !== 'resolved').length})
        </button>
        <button
          className={`cyber-tab-btn ${activeTab === 'quarantine' ? 'active' : ''}`}
          onClick={() => setActiveTab('quarantine')}
        >
          <PageIcon name="lock" size={16} />
          Quarentena & Isolamento ({quarantinedDevices.length})
        </button>
        <button
          className={`cyber-tab-btn ${activeTab === 'firewall' ? 'active' : ''}`}
          onClick={() => setActiveTab('firewall')}
        >
          <PageIcon name="shield" size={16} />
          Regras de Firewall & DLP
        </button>
        <button
          className={`cyber-tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
          onClick={() => setActiveTab('terminal')}
        >
          <PageIcon name="terminal" size={16} />
          Trilha Forense em Tempo Real
        </button>
      </div>

      {/* Visualização de Alertas */}
      {activeTab === 'alerts' && (
        <section className="cyber-table-panel">
          <div className="cyber-table-toolbar">
            <div className="cyber-table-filters">
              <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Severidade:</span>
              <button
                className={`cyber-filter-pill ${severityFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSeverityFilter('all')}
              >
                Todos ({alerts.length})
              </button>
              <button
                className={`cyber-filter-pill ${severityFilter === 'critical' ? 'active' : ''}`}
                onClick={() => setSeverityFilter('critical')}
              >
                Crítico
              </button>
              <button
                className={`cyber-filter-pill ${severityFilter === 'high' ? 'active' : ''}`}
                onClick={() => setSeverityFilter('high')}
              >
                Alto
              </button>
              <button
                className={`cyber-filter-pill ${severityFilter === 'medium' ? 'active' : ''}`}
                onClick={() => setSeverityFilter('medium')}
              >
                Médio
              </button>
              <button
                className={`cyber-filter-pill ${severityFilter === 'low' ? 'active' : ''}`}
                onClick={() => setSeverityFilter('low')}
              >
                Baixo
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {go && (
                <button className="cyber-action-btn" onClick={() => go('audit')}>
                  <PageIcon name="search" size={14} />
                  Ver Auditoria Completa
                </button>
              )}
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Severidade</th>
                  <th>Evento / Ameaça</th>
                  <th>Servidor / Ativo</th>
                  <th>Origem / Processo</th>
                  <th>Detecção</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações de Resposta</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map(a => (
                  <tr key={a.id}>
                    <td>
                      <span className={`cyber-badge tone-${a.tone}`}>
                        <PageIcon name={a.icon} size={12} />
                        {a.severity}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{a.title}</strong>
                    </td>
                    <td>
                      <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                        {a.server}
                      </code>
                    </td>
                    <td>
                      <span style={{ color: '#475569', fontSize: 13 }}>{a.source}</span>
                    </td>
                    <td>
                      <span style={{ color: '#64748b', fontSize: 12 }}>{a.time}</span>
                    </td>
                    <td>
                      {a.status === 'active' && (
                        <span style={{ color: '#dc2626', fontWeight: 600, fontSize: 12 }}>Ativo</span>
                      )}
                      {a.status === 'investigating' && (
                        <span style={{ color: '#d97706', fontWeight: 600, fontSize: 12 }}>Investigando</span>
                      )}
                      {a.status === 'quarantined' && (
                        <span style={{ color: '#2563eb', fontWeight: 600, fontSize: 12 }}>Em Quarentena</span>
                      )}
                      {a.status === 'resolved' && (
                        <span style={{ color: '#16a878', fontWeight: 600, fontSize: 12 }}>Resolvido</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {a.status !== 'quarantined' && a.status !== 'resolved' && (
                          <button
                            className="cyber-action-btn danger"
                            onClick={() => handleOpenQuarantineModal(a)}
                          >
                            <PageIcon name="lock" size={12} />
                            Isolar da Rede
                          </button>
                        )}
                        <button
                          className="cyber-action-btn"
                          onClick={() => {
                            setAlerts(prev =>
                              prev.map(item => (item.id === a.id ? { ...item, status: 'resolved' } : item))
                            )
                            toast.success(`Alerta "${a.title}" marcado como resolvido.`)
                          }}
                        >
                          <PageIcon name="check" size={12} />
                          Resolver
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Visualização de Dispositivos em Quarentena */}
      {activeTab === 'quarantine' && (
        <section className="cyber-table-panel">
          <div className="cyber-table-toolbar">
            <div>
              <strong style={{ fontSize: 15, color: '#0f172a' }}>
                Dispositivos Bloqueados em Camada de Rede (VLAN Quarentena)
              </strong>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                Estes ativos foram isolados por detecção de malware, tráfego anômalo ou violação de conformidade Zero-Trust.
              </p>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Dispositivo</th>
                  <th>IP / MAC</th>
                  <th>Motivo do Bloqueio</th>
                  <th>Carimbo de Data/Hora</th>
                  <th style={{ textAlign: 'right' }}>Ação de Governança</th>
                </tr>
              </thead>
              <tbody>
                {quarantinedDevices.map(d => (
                  <tr key={d.id}>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{d.name}</strong>
                    </td>
                    <td>
                      <div>
                        <code>{d.ip}</code>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{d.mac}</div>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: '#b91c1c', fontWeight: 500 }}>{d.reason}</span>
                    </td>
                    <td>{d.quarantinedAt}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="cyber-action-btn"
                        onClick={() => handleReleaseQuarantine(d.id, d.name)}
                      >
                        <PageIcon name="refresh" size={12} />
                        Liberar da Quarentena
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Visualização de Regras de Firewall & DLP */}
      {activeTab === 'firewall' && (
        <section className="panel" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 8 }}>Políticas Globais de Proteção & DLP (Prevenção de Perda de Dados)</h3>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
            Configuração de barreiras ativas em nível de sistema operacional distribuídas para todos os agentes.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ padding: 18, border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc' }}>
              <strong style={{ display: 'block', fontSize: 15, marginBottom: 6 }}>Bloqueio de Gravação USB</strong>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px' }}>
                Impede cópia não autorizada de dados sigilosos para pendrives e HDs externos.
              </p>
              <span className="cyber-badge tone-low">Ativo em 100% da Frota</span>
            </div>

            <div style={{ padding: 18, border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc' }}>
              <strong style={{ display: 'block', fontSize: 15, marginBottom: 6 }}>BitLocker / FileVault Forçado</strong>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px' }}>
                Criptografia obrigatória de disco com chave de recuperação custodiada no console MDM.
              </p>
              <span className="cyber-badge tone-low">Ativo com Chave em Escrow</span>
            </div>

            <div style={{ padding: 18, border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc' }}>
              <strong style={{ display: 'block', fontSize: 15, marginBottom: 6 }}>VPN Always-On WireGuard</strong>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px' }}>
                Túnel criptografado persistente obrigatório para notebooks fora do perímetro do escritório.
              </p>
              <span className="cyber-badge tone-low">Kill-Switch Ativo</span>
            </div>
          </div>
        </section>
      )}

      {/* Visualização de Terminal Forense */}
      {activeTab === 'terminal' && (
        <section className="panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong style={{ fontSize: 15 }}>Trilha Forense de Telemetria EDR (Streaming RFC 6455)</strong>
            <span style={{ fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Conexão Segura Ativa (Socket /ws/soc)
            </span>
          </div>

          <div className="cyber-terminal">
            <div className="log-line">
              <span className="log-time">[22:14:02.102]</span>
              <span className="log-host">[SRV-AUTH-01]</span>
              <span>pam_authenticate: 185.220.101.42 tentativa falha para root (tentativa 12/20)</span>
            </div>
            <div className="log-line">
              <span className="log-time">[22:15:18.441]</span>
              <span className="log-host">[SRV-API-03]</span>
              <span className="log-crit">[CRITICAL] EDR: Processo 'powershell.exe' invocado com argumentos ocultos base64.</span>
            </div>
            <div className="log-line">
              <span className="log-time">[22:16:30.910]</span>
              <span className="log-host">[SRV-API-03]</span>
              <span className="log-warn">[WARN] Heurística: Token de sessão temporário emitido para IP desconhecido.</span>
            </div>
            <div className="log-line">
              <span className="log-time">[22:17:05.120]</span>
              <span className="log-host">[SRV-FILES-02]</span>
              <span>SMB2: Sessão autorizada para usuário 'backup-service' com assinatura HMAC-SHA256.</span>
            </div>
            <div className="log-line">
              <span className="log-time">[22:17:40.892]</span>
              <span className="log-host">[GATEWAY-EDGE-01]</span>
              <span>MQTT Broker: 42 tópicos de telemetria recebidos com integridade de payload.</span>
            </div>
          </div>
        </section>
      )}

      {/* Modal Seguro de Confirmação de Quarentena com 2FA */}
      <Modal
        isOpen={isQuarantineModalOpen}
        onClose={() => setIsQuarantineModalOpen(false)}
        title="Confirmação de Quarentena de Rede (Zero-Trust)"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: 14, borderRadius: 8, color: '#991b1b', fontSize: 14 }}>
            <strong>Atenção: Ação de Isolamento Imediato</strong>
            <p style={{ margin: '6px 0 0', fontSize: 13 }}>
              O dispositivo <strong>{selectedAlert?.server}</strong> terá todas as conexões TCP/UDP cortadas
              imediatamente, mantendo apenas o canal de comando criptografado do agente MDM.
            </p>
          </div>

          <label className="field full">
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              Insira o Token 2FA / TOTP de Autorização (Duplo Controle):
            </span>
            <input
              type="password"
              placeholder="Ex.: 491823"
              maxLength={6}
              value={totpToken}
              onChange={e => {
                setTotpToken(e.target.value)
                setTotpError('')
              }}
              style={{ fontSize: 18, letterSpacing: 4, textAlign: 'center', padding: '10px' }}
            />
            {totpError && <small style={{ color: '#dc2626', marginTop: 4 }}>{totpError}</small>}
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button className="cyber-action-btn" onClick={() => setIsQuarantineModalOpen(false)}>
              Cancelar
            </button>
            <button className="cyber-action-btn danger" onClick={handleConfirmQuarantine}>
              <PageIcon name="lock" size={14} />
              Confirmar Isolamento Imediato
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
