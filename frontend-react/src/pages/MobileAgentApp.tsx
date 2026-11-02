import { useState } from 'react'
import PageIcon from '../components/PageIcon'
import { Button, Status } from '../components/UI'
import { useToast } from '../components/Toast'
import type { PageId } from '../types'

export function MobileAgentApp({ go }: { go?: (p: PageId) => void }) {
  const toast = useToast()
  const [syncing, setSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'apps' | 'security' | 'location'>('profile')

  const handleSync = () => {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      toast.success('Perfil Mobile sincronizado com o servidor MDM.')
    }, 1000)
  }

  return (
    <div className="page-stack">
      <div className="action-row" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ background: '#ecfdf5', color: '#065f46', padding: '6px', borderRadius: 8, display: 'inline-flex' }}>
              <PageIcon name="phone" size={24} />
            </span>
            <h2 style={{ margin: 0 }}>Agente MDM Mobile (Android Enterprise / Apple MDM)</h2>
            <Status tone="green">Dispositivo Conforme</Status>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Gerenciamento de perfil corporativo seguro (COPE / BYOD) com isolamento de contêiner e criptografia de partição.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" icon="refresh" onClick={handleSync}>
            {syncing ? 'Sincronizando...' : 'Verificar Conformidade'}
          </Button>
          {go && (
            <Button icon="arrow" onClick={() => go('mobiles')}>
              Ver Frota Mobile
            </Button>
          )}
        </div>
      </div>

      <div className="cyber-tabs">
        <button
          className={`cyber-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <PageIcon name="phone" size={16} />
          Perfil de Trabalho (Work Profile)
        </button>
        <button
          className={`cyber-tab-btn ${activeTab === 'apps' ? 'active' : ''}`}
          onClick={() => setActiveTab('apps')}
        >
          <PageIcon name="blocks" size={16} />
          Apps Gerenciados (MAM)
        </button>
        <button
          className={`cyber-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <PageIcon name="shield" size={16} />
          Integridade & Criptografia
        </button>
        <button
          className={`cyber-tab-btn ${activeTab === 'location' ? 'active' : ''}`}
          onClick={() => setActiveTab('location')}
        >
          <PageIcon name="pulse" size={16} />
          Telemetria de Campo
        </button>
      </div>

      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <section className="panel" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 14 }}>Dados do Aparelho</h3>
            <div className="form-grid">
              <div>
                <small style={{ color: '#64748b' }}>Modelo</small>
                <div style={{ fontWeight: 600 }}>Samsung Galaxy Tab Active4 Pro 5G</div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Sistema Operacional</small>
                <div style={{ fontWeight: 600 }}>Android 14 (One UI 6.0)</div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>IMEI / EID</small>
                <div style={{ fontWeight: 600 }}>358941029482103</div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Modo de Registro</small>
                <div style={{ fontWeight: 600 }}>Fully Managed Device (Kiosk Mode)</div>
              </div>
            </div>
          </section>

          <section className="panel" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 14 }}>Bateria & Conectividade</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Nível de Bateria:</span>
                <strong style={{ color: '#059669' }}>88% (Saudável - 26°C)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Conexão Celular:</span>
                <strong style={{ color: '#2563eb' }}>5G Vivo Empresas (-78 dBm)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Wi-Fi Corporativo:</span>
                <strong style={{ color: '#475569' }}>Novara-Corp-HQ (WPA3 Enterprise)</strong>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'apps' && (
        <section className="panel" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Catálogo de Aplicativos Distribuídos via MDM</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Aplicativo</th>
                  <th>Pacote / ID</th>
                  <th>Versão Instalada</th>
                  <th>Permissões Concedidas</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Novara Field Operations</strong></td>
                  <td><code>com.novara.fieldops</code></td>
                  <td>v2.1.0</td>
                  <td>Câmera, GPS de alta precisão, Armazenamento seguro</td>
                  <td><Status tone="green">Atualizado</Status></td>
                </tr>
                <tr>
                  <td><strong>Leitor de Código de Barras Industrial</strong></td>
                  <td><code>com.honeywell.decode</code></td>
                  <td>v4.18</td>
                  <td>Acesso ao scanner óptico traseiro</td>
                  <td><Status tone="green">Ativo</Status></td>
                </tr>
                <tr>
                  <td><strong>Microsoft Outlook (Contêiner Seguro)</strong></td>
                  <td><code>com.microsoft.office.outlook</code></td>
                  <td>v4.24</td>
                  <td>Autenticação SSO Intune / Exchange Online</td>
                  <td><Status tone="green">Sincronizado</Status></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'security' && (
        <section className="panel" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Integridade e Proteção de Hardware</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <strong>Google Play Integrity:</strong>
              <div style={{ color: '#059669', fontSize: 13, marginTop: 4 }}>STRONG_INTEGRITY Aprovada</div>
            </div>
            <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <strong>Status de Root / Jailbreak:</strong>
              <div style={{ color: '#059669', fontSize: 13, marginTop: 4 }}>Nenhuma Violação Detectada</div>
            </div>
            <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <strong>Bloqueio de Debug USB (ADB):</strong>
              <div style={{ color: '#059669', fontSize: 13, marginTop: 4 }}>Desativado por Política</div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'location' && (
        <section className="panel" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Geofencing & Perímetro de Operação</h3>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px' }}>
            Última coordenada reportada dentro da cerca virtual autorizada (Região Metropolitana de São Paulo).
          </p>
          <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, padding: 16 }}>
            <div><strong>Coordenadas GPS:</strong> -23.550520, -46.633308 (Precisão de 4.2 metros)</div>
            <div style={{ marginTop: 6, color: '#475569' }}><strong>Último ping de localização:</strong> Há 4 minutos</div>
          </div>
        </section>
      )}
    </div>
  )
}
