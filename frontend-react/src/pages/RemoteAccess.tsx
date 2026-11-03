import { useState } from 'react'
import PageIcon from '../components/PageIcon'
import { Button, Status } from '../components/UI'
import { useToast } from '../components/Toast'
import type { PageId } from '../types'

export function RemoteAccess({ go }: { go?: (p: PageId) => void }) {
  const toast = useToast()
  const [selectedAsset, setSelectedAsset] = useState('DESK-ENGENHARIA-04')
  const [sessionActive, setSessionActive] = useState(true)
  const [activeTab, setActiveTab] = useState<'screen' | 'terminal' | 'files'>('screen')
  const [commandInput, setCommandInput] = useState('')
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'Novara Remote Management Shell (Protocolo Seguro RFC 6455)',
    'Conectado ao endpoint DESK-ENGENHARIA-04 via túnel criptografado TLS 1.3',
    'Permissões: OPERADOR_TECNICO_N2 (Auditado por Lucas Martins)',
    'PS C:\\Windows\\System32> '
  ])

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commandInput.trim()) return

    const cmd = commandInput.trim()
    setTerminalLogs(prev => [
      ...prev,
      `PS C:\\Windows\\System32> ${cmd}`,
      `[OK] Executado em 14ms: comando processado pelo agente local.`
    ])
    setCommandInput('')
  }

  const handleAction = (actionName: string) => {
    toast.success(`Ação remota "${actionName}" executada com sucesso no endpoint!`)
  }

  return (
    <div className="page-stack">
      <div className="action-row" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '6px', borderRadius: 8, display: 'inline-flex' }}>
              <PageIcon name="terminal" size={24} />
            </span>
            <h2 style={{ margin: 0 }}>Console de Acesso Remoto & Suporte Assistido</h2>
            <Status tone={sessionActive ? 'green' : 'amber'}>
              {sessionActive ? 'Sessão Ativa (Criptografia E2E)' : 'Sessão Pausada'}
            </Status>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Visualização de tela em baixa latência (WebRTC), terminal de comando e transferência de arquivos com duplo consentimento.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="secondary"
            onClick={() => {
              setSessionActive(!sessionActive)
              toast.info(`Sessão remota ${!sessionActive ? 'retomada' : 'pausada'}.`)
            }}
          >
            {sessionActive ? 'Pausar Streaming' : 'Retomar Streaming'}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setSessionActive(false)
              toast.info('Sessão remota encerrada e registrada na trilha de auditoria.')
            }}
          >
            Encerrar Sessão
          </Button>
        </div>
      </div>

      {/* Barra de Ferramentas Rápidas */}
      <section className="panel" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <strong style={{ fontSize: 14 }}>Alvo Remoto:</strong>
          <select
            value={selectedAsset}
            onChange={e => setSelectedAsset(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 600 }}
          >
            <option value="DESK-ENGENHARIA-04">DESK-ENGENHARIA-04 (192.168.10.45)</option>
            <option value="NOTE-DIRETORIA-01">NOTE-DIRETORIA-01 (10.0.4.88)</option>
            <option value="TOTEM-QUIOSQUE-02">TOTEM-QUIOSQUE-02 (10.42.12.102)</option>
            <option value="PANEL-ENTRADA-01">PANEL-ENTRADA-01 (10.42.12.201)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="cyber-action-btn" onClick={() => handleAction('Enviar Ctrl+Alt+Del')}>
            Ctrl+Alt+Del
          </button>
          <button className="cyber-action-btn" onClick={() => handleAction('Bloquear Estação')}>
            Bloquear Estação
          </button>
          <button className="cyber-action-btn" onClick={() => handleAction('Capturar Screenshot')}>
            Screenshot
          </button>
          <button className="cyber-action-btn danger" onClick={() => handleAction('Reiniciar em Modo Seguro')}>
            Reiniciar Endpoint
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="cyber-tabs">
        <button
          className={`cyber-tab-btn ${activeTab === 'screen' ? 'active' : ''}`}
          onClick={() => setActiveTab('screen')}
        >
          <PageIcon name="laptop" size={16} />
          Espelhamento de Tela (60 FPS)
        </button>
        <button
          className={`cyber-tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
          onClick={() => setActiveTab('terminal')}
        >
          <PageIcon name="terminal" size={16} />
          Terminal Interativo PowerShell
        </button>
        <button
          className={`cyber-tab-btn ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          <PageIcon name="download" size={16} />
          Transferência Segura de Arquivos
        </button>
      </div>

      {/* Tela Remota */}
      {activeTab === 'screen' && (
        <section className="panel" style={{ padding: 16 }}>
          <div
            style={{
              height: 440,
              background: '#090d16',
              borderRadius: 8,
              border: '2px solid #1e293b',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {sessionActive ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px 16px', background: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: 12 }}>
                  <span>Área de Trabalho: {selectedAsset} (Sessão de Usuário Ativa)</span>
                  <span style={{ color: '#10b981' }}>WebRTC / H.264 (Latência: 16ms - QTc)</span>
                </div>
                <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: '#cbd5e1' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: 12 }}>
                      <PageIcon name="laptop" size={48} style={{ color: '#38bdf8' }} />
                    </div>
                    <strong style={{ fontSize: 18, display: 'block', color: '#ffffff' }}>
                      Streaming Interativo Ativo
                    </strong>
                    <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                      Clique dentro do container para capturar mouse e teclado em tempo real.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#64748b' }}>Sessão Pausada</div>
            )}
          </div>
        </section>
      )}

      {/* Terminal Interativo */}
      {activeTab === 'terminal' && (
        <section className="panel" style={{ padding: 16 }}>
          <div className="cyber-terminal" style={{ minHeight: 340, marginBottom: 12 }}>
            {terminalLogs.map((log, i) => (
              <div key={`term-log-${i}-${log.slice(0, 20)}`}>{log}</div>
            ))}
          </div>

          <form onSubmit={handleSendCommand} style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="Digite um comando PowerShell (Ex.: Get-Process, ipconfig, sfc /scannow)..."
              value={commandInput}
              onChange={e => setCommandInput(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 6, border: '1px solid #cbd5e1', fontFamily: 'monospace' }}
            />
            <Button icon="terminal" type="submit">
              Executar
            </Button>
          </form>
        </section>
      )}

      {/* Transferência de Arquivos */}
      {activeTab === 'files' && (
        <section className="panel" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 10 }}>Diretório de Transferência Segura do Agente</h3>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
            Arquivos enviados são automaticamente submetidos à verificação antimalware antes da gravação no disco do cliente.
          </p>

          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <Button icon="download" onClick={() => toast.success('Upload de arquivo iniciado')}>
              Enviar Arquivo para o Endpoint
            </Button>
            <Button variant="secondary" onClick={() => toast.info('Lista de arquivos remotos atualizada')}>
              Atualizar Diretório
            </Button>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nome do Arquivo</th>
                  <th>Tamanho</th>
                  <th>Data de Modificação</th>
                  <th>Hash SHA-256</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>diagnostic_report_novara.log</code></td>
                  <td>1.4 MB</td>
                  <td>Hoje, 19:42</td>
                  <td><code>e3b0c44298fc1c149afbf4c8996fb924...</code></td>
                </tr>
                <tr>
                  <td><code>update_package_v3.4.msi</code></td>
                  <td>28.5 MB</td>
                  <td>Ontem, 14:10</td>
                  <td><code>88d4266fd4e6338d13b845fcf289579d...</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
