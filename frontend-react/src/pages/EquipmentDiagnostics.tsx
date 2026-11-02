import { useState } from 'react'
import PageIcon from '../components/PageIcon'
import { Button, Status } from '../components/UI'
import { useToast } from '../components/Toast'
import type { PageId } from '../types'

interface DiagnosticCheck {
  id: string
  name: string
  category: 'cpu' | 'ram' | 'storage' | 'network' | 'peripherals'
  status: 'pending' | 'running' | 'passed' | 'warning' | 'failed'
  details: string
}

export function EquipmentDiagnostics({ go }: { go?: (p: PageId) => void }) {
  const toast = useToast()
  const [selectedAsset, setSelectedAsset] = useState('DESK-ENGENHARIA-04')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)

  const [checks, setChecks] = useState<DiagnosticCheck[]>([
    { id: 'chk-cpu', name: 'Estresse e Frequência de CPU', category: 'cpu', status: 'passed', details: '16 Cores estáveis sob 100% de carga por 30s. Temp máx: 72°C' },
    { id: 'chk-ram', name: 'Varredura de Integridade de Memória (MemTest)', category: 'ram', status: 'passed', details: '32 GB DDR5 testados sem erros de paridade ou ECC.' },
    { id: 'chk-disk', name: 'Saúde S.M.A.R.T. do Disco NVMe', category: 'storage', status: 'passed', details: 'Vida útil restante: 99%. Temperatura: 38°C. 0 Bad Sectors.' },
    { id: 'chk-net', name: 'Conectividade e Latência de Rede', category: 'network', status: 'passed', details: 'Ping para gateway central: 2.1 ms. Perda de pacotes: 0%.' },
    { id: 'chk-tpm', name: 'Módulo de Criptografia TPM 2.0', category: 'peripherals', status: 'passed', details: 'Certificado de chave privada validado com integridade de firmware.' }
  ])

  const handleRunFullDiagnostics = () => {
    setRunning(true)
    setProgress(10)
    setChecks(prev => prev.map(c => ({ ...c, status: 'running' })))

    setTimeout(() => setProgress(35), 600)
    setTimeout(() => setProgress(70), 1400)
    setTimeout(() => {
      setProgress(100)
      setRunning(false)
      setChecks(prev => prev.map(c => ({ ...c, status: 'passed' })))
      toast.success(`Laudo de diagnóstico concluído com sucesso para ${selectedAsset}!`)
    }, 2200)
  }

  return (
    <div className="page-stack">
      <div className="action-row" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ background: '#fef3c7', color: '#b45309', padding: '6px', borderRadius: 8, display: 'inline-flex' }}>
              <PageIcon name="cpu" size={24} />
            </span>
            <h2 style={{ margin: 0 }}>Diagnóstico Aprofundado de Equipamentos</h2>
            <Status tone="green">Pronto para Teste</Status>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Bateria completa de estresse de hardware, testes de barramento, integridade de criptografia e verificação de rede.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            icon="pulse"
            disabled={running}
            onClick={handleRunFullDiagnostics}
          >
            {running ? `Executando Testes (${progress}%)...` : 'Iniciar Diagnóstico Completo'}
          </Button>
          {go && (
            <Button variant="secondary" onClick={() => go('remoteAccess')}>
              Acesso Remoto
            </Button>
          )}
        </div>
      </div>

      {/* Seletor de Ativo & Barra de Progresso */}
      <section className="panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Equipamento Selecionado:</span>
            <select
              value={selectedAsset}
              onChange={e => setSelectedAsset(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            >
              <option value="DESK-ENGENHARIA-04">DESK-ENGENHARIA-04 (Desktop i7 32GB)</option>
              <option value="NOTE-DIRETORIA-01">NOTE-DIRETORIA-01 (Dell Latitude 5440)</option>
              <option value="TOTEM-QUIOSQUE-02">TOTEM-QUIOSQUE-02 (Totem Touch 43")</option>
              <option value="PANEL-ENTRADA-01">PANEL-ENTRADA-01 (Display Digital 65")</option>
              <option value="GATEWAY-EDGE-01">GATEWAY-EDGE-01 (Advantech IoT Box)</option>
            </select>
          </label>

          <span style={{ fontSize: 13, color: '#64748b' }}>
            Último laudo gerado: <strong>Hoje, às 18:20</strong>
          </span>
        </div>

        {running && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', marginBottom: 4 }}>
              <span>Executando testes sintéticos...</span>
              <span>{progress}%</span>
            </div>
            <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: '#2563eb',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Grid de Resultados */}
      <section className="panel table-panel">
        <div className="table-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <strong style={{ fontSize: 15 }}>Itens de Auditoria Técnica e Verificação</strong>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Componente / Teste</th>
                <th>Categoria</th>
                <th>Status da Validação</th>
                <th>Detalhes e Observações Técnicas</th>
              </tr>
            </thead>
            <tbody>
              {checks.map(c => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td>
                    <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                      {c.category.toUpperCase()}
                    </code>
                  </td>
                  <td>
                    {c.status === 'passed' && <Status tone="green">Aprovado</Status>}
                    {c.status === 'running' && <Status tone="blue">Testando...</Status>}
                    {c.status === 'warning' && <Status tone="amber">Atenção</Status>}
                    {c.status === 'failed' && <Status tone="red">Falhou</Status>}
                    {c.status === 'pending' && <Status tone="blue">Aguardando</Status>}
                  </td>
                  <td style={{ color: '#475569', fontSize: 13 }}>{c.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
