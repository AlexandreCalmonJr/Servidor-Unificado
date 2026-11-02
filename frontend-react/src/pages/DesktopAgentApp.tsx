import { useState } from 'react'
import PageIcon from '../components/PageIcon'
import { Button, Status } from '../components/UI'
import { useToast } from '../components/Toast'
import type { PageId } from '../types'

export function DesktopAgentApp({ go }: { go?: (p: PageId) => void }) {
  const toast = useToast()
  const [syncing, setSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'telemetry' | 'commands'>('overview')

  const handleManualSync = () => {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      toast.success('Agente sincronizado com o Servidor Central com sucesso!')
    }, 1200)
  }

  return (
    <div className="page-stack">
      {/* Header do Agente Cliente Desktop */}
      <div className="action-row" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ background: '#eef2ff', color: '#3730a3', padding: '6px', borderRadius: 8, display: 'inline-flex' }}>
              <PageIcon name="laptop" size={24} />
            </span>
            <h2 style={{ margin: 0 }}>Agente MDM Desktop & Workstation</h2>
            <Status tone="green">Agente Conectado (v3.4.2)</Status>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Instância cliente em execução no endpoint. Comunicação persistente via WebSocket com heartbeat de 30s.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" icon="refresh" onClick={handleManualSync}>
            {syncing ? 'Sincronizando...' : 'Forçar Sincronização'}
          </Button>
          {go && (
            <Button icon="terminal" onClick={() => go('remoteAccess')}>
              Abrir Sessão Remota
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="cyber-tabs">
        <button
          className={`cyber-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <PageIcon name="blocks" size={16} />
          Visão Geral do Endpoint
        </button>
        <button
          className={`cyber-tab-btn ${activeTab === 'policies' ? 'active' : ''}`}
          onClick={() => setActiveTab('policies')}
        >
          <PageIcon name="shield" size={16} />
          Políticas Aplicadas (DLP & MDM)
        </button>
        <button
          className={`cyber-tab-btn ${activeTab === 'telemetry' ? 'active' : ''}`}
          onClick={() => setActiveTab('telemetry')}
        >
          <PageIcon name="pulse" size={16} />
          Telemetria de Hardware
        </button>
        <button
          className={`cyber-tab-btn ${activeTab === 'commands' ? 'active' : ''}`}
          onClick={() => setActiveTab('commands')}
        >
          <PageIcon name="terminal" size={16} />
          Fila de Comandos Locais
        </button>
      </div>

      {/* Conteúdo da Tab Visão Geral */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <section className="panel" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PageIcon name="laptop" size={18} />
              Identificação da Máquina
            </h3>
            <div className="form-grid">
              <div>
                <small style={{ color: '#64748b' }}>Hostname</small>
                <div style={{ fontWeight: 600 }}>DESK-ENGENHARIA-04</div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Sistema Operacional</small>
                <div style={{ fontWeight: 600 }}>Windows 11 Enterprise (23H2)</div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Número de Série</small>
                <div style={{ fontWeight: 600 }}>NOV-DK-89410-BR</div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Endereço IP Local</small>
                <div style={{ fontWeight: 600 }}>192.168.10.45</div>
              </div>
            </div>
          </section>

          <section className="panel" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PageIcon name="shield" size={18} />
              Conformidade e Segurança Local
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14 }}>BitLocker / Criptografia TPM:</span>
                <span style={{ color: '#059669', fontWeight: 600, fontSize: 13 }}>Ativo (AES-256)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14 }}>Firewall do Agente:</span>
                <span style={{ color: '#059669', fontWeight: 600, fontSize: 13 }}>Filtrando pacotes</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14 }}>Controle de Mídias USB:</span>
                <span style={{ color: '#d97706', fontWeight: 600, fontSize: 13 }}>Somente Leitura (DLP)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14 }}>Última Auditoria Heurística:</span>
                <span style={{ color: '#475569', fontSize: 13 }}>Hoje, 19:40</span>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Conteúdo da Tab Políticas */}
      {activeTab === 'policies' && (
        <section className="panel" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Políticas Ativas Recebidas do Servidor Central</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Identificador</th>
                  <th>Nome da Política</th>
                  <th>Status de Aplicação</th>
                  <th>Data de Atualização</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>pol-sec-baseline-v4</code></td>
                  <td><strong>Baseline de Segurança Windows Hello & Senha Forte</strong></td>
                  <td><Status tone="green">Conforme</Status></td>
                  <td>01/11/2026 10:14</td>
                </tr>
                <tr>
                  <td><code>pol-dlp-usb-block</code></td>
                  <td><strong>Restrição Rígida de Gravação em Dispositivos Removíveis</strong></td>
                  <td><Status tone="green">Conforme</Status></td>
                  <td>28/10/2026 16:30</td>
                </tr>
                <tr>
                  <td><code>pol-net-vpn-wireguard</code></td>
                  <td><strong>VPN Corporativa Automática em Redes Wi-Fi Desconhecidas</strong></td>
                  <td><Status tone="blue">Standby</Status></td>
                  <td>25/10/2026 09:00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Conteúdo da Tab Telemetria */}
      {activeTab === 'telemetry' && (
        <section className="panel" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Métricas em Tempo Real Coletadas pelo Agente</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <small style={{ color: '#64748b' }}>Uso de Processador (CPU)</small>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>14.2%</div>
              <div style={{ fontSize: 12, color: '#10b981' }}>Intel Core i7-13700H (16 Cores)</div>
            </div>
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <small style={{ color: '#64748b' }}>Memória RAM</small>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>9.4 / 32 GB</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>29% em utilização</div>
            </div>
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <small style={{ color: '#64748b' }}>Armazenamento NVMe</small>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>384 GB Livres</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>De 1.0 TB total</div>
            </div>
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <small style={{ color: '#64748b' }}>Latência do Agente</small>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>12 ms</div>
              <div style={{ fontSize: 12, color: '#10b981' }}>WebSocket RTT Saudável</div>
            </div>
          </div>
        </section>
      )}

      {/* Conteúdo da Tab Comandos */}
      {activeTab === 'commands' && (
        <section className="panel" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Histórico de Comandos Recebidos pelo Agente</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Comando</th>
                  <th>Origem / Operador</th>
                  <th>Executado Em</th>
                  <th>Status de Saída</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>AGENT_FORCE_TELEMETRY_REFRESH</code></td>
                  <td>Painel Central (Lucas Martins)</td>
                  <td>Hoje, 19:35:10</td>
                  <td><Status tone="green">Sucesso (exit code 0)</Status></td>
                </tr>
                <tr>
                  <td><code>LOCK_WORKSTATION_IMMEDIATE</code></td>
                  <td>Política de Inatividade</td>
                  <td>Ontem, 21:00:00</td>
                  <td><Status tone="green">Sucesso (exit code 0)</Status></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
