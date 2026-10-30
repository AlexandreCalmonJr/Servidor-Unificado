import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import type { PageId } from '../types'

interface PrintJob {
  id: string
  documentName: string
  owner: string
  pages: number
  submittedAt: string
  size: string
  status: 'printing' | 'queued' | 'paused'
}

export function PrinterDetail({ go }: { go: (p: PageId) => void }) {
  const [tab, setTab] = useState<'supplies' | 'counters' | 'trays' | 'queue' | 'history'>('supplies')
  const [syncing, setSyncing] = useState(false)
  const [testPrint, setTestPrint] = useState(false)
  const toast = useToast()

  // Estados de edição do equipamento
  const [printerName, setPrinterName] = useState('HP LaserJet Enterprise M507x — Recepção Principal')
  const [location, setLocation] = useState('Recepção Principal · Térreo / Entrada')
  const [ip, setIp] = useState('10.42.20.15')
  const [snmpCommunity, setSnmpCommunity] = useState('corp-snmp-read')
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Fila de Impressão Ativa
  const [printQueue, setPrintQueue] = useState<PrintJob[]>([
    {
      id: 'job-101',
      documentName: 'Contrato_Prestacao_Servicos_v2.pdf',
      owner: 'Mariana Costa',
      pages: 14,
      submittedAt: 'Há 2 min',
      size: '2,4 MB',
      status: 'printing',
    },
    {
      id: 'job-102',
      documentName: 'Relatorio_Despesas_Outubro.xlsx',
      owner: 'Carlos Mendes',
      pages: 6,
      submittedAt: 'Há 1 min',
      size: '890 KB',
      status: 'queued',
    },
  ])

  // Histórico de Manutenções
  const [maintenanceHistory, setMaintenanceHistory] = useState([
    { title: 'Substituição de Toner Preto (HP 89A)', desc: 'Cartucho anterior substituído com 2% de toner restante', tech: 'Carlos Silva', time: '14 de maio de 2025' },
    { title: 'Higienização dos roletes de tração de papel', desc: 'Manutenção preventiva realizada pela equipe de infra', tech: 'Lucas Mendes', time: '02 de abril de 2025' },
    { title: 'Atualização de Firmware SNMP v2.40', desc: 'Patch de segurança e correções de comunicação aplicados', tech: 'Sistema MDM', time: '18 de janeiro de 2025' },
  ])

  const handleSync = () => {
    setSyncing(true)
    toast.info('Sondando MIBs SNMP da HP LaserJet...')
    setTimeout(() => {
      setSyncing(false)
      toast.success('Suprimentos e status atualizados via SNMP com sucesso!')
    }, 900)
  }

  const handleTestPrint = () => {
    setTestPrint(true)
    toast.info('Enviando página de alinhamento e teste PostScript...')
    setTimeout(() => {
      setTestPrint(false)
      toast.success('Página de teste enviada ao spooler da impressora!')
    }, 1500)
  }

  const handleClearQueue = () => {
    if (printQueue.length === 0) {
      toast.info('A fila de impressão já está vazia.')
      return
    }
    setPrintQueue([])
    toast.success('Fila de impressão local limpa com sucesso!')
  }

  const handleCancelJob = (jobId: string) => {
    setPrintQueue((prev) => prev.filter((j) => j.id !== jobId))
    toast.success('Trabalho de impressão cancelado e removido do spooler.')
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    setEditModalOpen(false)
    toast.success('Parâmetros de rede e identificação da impressora atualizados!')
  }

  return (
    <div className="page-stack">
      {/* Cabeçalho */}
      <div className="detail-heading">
        <button onClick={() => go('printers')}>
          <Icon name="arrow" size={16} /> Voltar para lista de impressoras
        </button>

        <div className="detail-device">
          <span className="detail-device-icon">
            <Icon name="printer" size={26} />
          </span>
          <div className="detail-device-info">
            <div className="detail-device-title-row">
              <h2>{printerName}</h2>
              <Status tone="green">Operacional</Status>
            </div>
            <p>{ip} · {location} · SNMP v2c Ativo</p>
          </div>
        </div>

        <div className="detail-actions">
          <Button variant="secondary" icon="edit" onClick={() => setEditModalOpen(true)}>
            Editar Cadastro
          </Button>
          <Button variant="secondary" icon="refresh" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Sincronizando...' : 'Sincronizar SNMP'}
          </Button>
          <Button variant="secondary" icon="printer" onClick={handleTestPrint} disabled={testPrint}>
            {testPrint ? 'Enviando...' : 'Página de Teste'}
          </Button>
          <Button variant="danger" icon="trash" onClick={handleClearQueue}>
            Limpar Fila ({printQueue.length})
          </Button>
        </div>
      </div>

      {/* Abas */}
      <div className="detail-tabs">
        <button className={tab === 'supplies' ? 'active' : ''} onClick={() => setTab('supplies')}>
          Níveis de Suprimentos
        </button>
        <button className={tab === 'counters' ? 'active' : ''} onClick={() => setTab('counters')}>
          Contadores de Páginas
        </button>
        <button className={tab === 'trays' ? 'active' : ''} onClick={() => setTab('trays')}>
          Bandejas de Papel
        </button>
        <button className={tab === 'queue' ? 'active' : ''} onClick={() => setTab('queue')}>
          Fila Ativa ({printQueue.length})
        </button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
          Histórico de Trocas ({maintenanceHistory.length})
        </button>
      </div>

      <section className="device-overview">
        <div className="page-stack">
          {/* ABA 1: SUPRIMENTOS */}
          {tab === 'supplies' && (
            <div className="page-stack">
              <article className="panel" style={{ padding: '24px' }}>
                <div className="panel-head">
                  <div>
                    <h3 className="card-section-title">Cartuchos e Insumos de Impressão</h3>
                    <p className="card-section-desc">Leitura SNMP direta dos sensores de toner e tambor fotocondutor</p>
                  </div>
                  <span className="badge-tag green">Sensor Calibrado</span>
                </div>

                <div className="supply-bars" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '14px' }}>
                  <div className="panel" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>Toner Preto (Black - K)</strong>
                      <span style={{ fontWeight: '700' }}>78%</span>
                    </div>
                    <div className="supply-bar" style={{ height: '10px' }}>
                      <i className="supply-k" style={{ width: '78%' }} />
                    </div>
                    <small style={{ color: 'var(--muted)', fontSize: '10px', marginTop: '8px', display: 'block' }}>
                      Modelo: HP 89A (CF289A) · Aprox. 3.900 páginas restantes
                    </small>
                  </div>

                  <div className="panel" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>Unidade de Cilindro (Drum Unit)</strong>
                      <span style={{ fontWeight: '700' }}>89%</span>
                    </div>
                    <div className="supply-bar" style={{ height: '10px' }}>
                      <i className="os-green" style={{ width: '89%' }} />
                    </div>
                    <small style={{ color: 'var(--muted)', fontSize: '10px', marginTop: '8px', display: 'block' }}>
                      Vida útil do fotocondutor em excelente estado (~42.000 pgs)
                    </small>
                  </div>

                  <div className="panel" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>Caixa Coletora de Resíduos</strong>
                      <span style={{ fontWeight: '700' }}>22% cheia</span>
                    </div>
                    <div className="supply-bar" style={{ height: '10px' }}>
                      <i className="os-violet" style={{ width: '22%' }} />
                    </div>
                    <small style={{ color: 'var(--muted)', fontSize: '10px', marginTop: '8px', display: 'block' }}>
                      Capacidade ampla · Não requer substituição
                    </small>
                  </div>

                  <div className="panel" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>Kit de Fusão Térmico (Fuser Kit)</strong>
                      <span style={{ fontWeight: '700' }}>94%</span>
                    </div>
                    <div className="supply-bar" style={{ height: '10px' }}>
                      <i className="os-cyan" style={{ width: '94%' }} />
                    </div>
                    <small style={{ color: 'var(--muted)', fontSize: '10px', marginTop: '8px', display: 'block' }}>
                      Temperatura nominal: 185 °C · Aquecimento instantâneo
                    </small>
                  </div>
                </div>
              </article>
            </div>
          )}

          {/* ABA 2: CONTADORES */}
          {tab === 'counters' && (
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3 className="card-section-title">Contadores de Páginas e Produção</h3>
                  <p className="card-section-desc">Métricas acumuladas desde a instalação do equipamento</p>
                </div>
              </div>
              <div className="info-grid">
                {[
                  ['Total Geral de Páginas Impressas', '48.920 páginas'],
                  ['Páginas Monocromáticas (P&B)', '48.920 páginas (100%)'],
                  ['Páginas Frente e Verso (Duplex)', '31.450 páginas (64% economia de papel)'],
                  ['Trabalhos de Impressão Processados', '12.840 jobs'],
                  ['Total de Atolamentos de Papel', '4 ocorrências em 365 dias'],
                  ['Média Diária de Impressão', '340 páginas/dia'],
                ].map((x) => (
                  <div key={x[0]}>
                    <span>{x[0]}</span>
                    <strong>{x[1]}</strong>
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* ABA 3: BANDEJAS */}
          {tab === 'trays' && (
            <div className="tab-full-stack">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <article className="panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Bandeja 1 (Multiuso / Manual)</h3>
                    <Status tone="green">Pronta</Status>
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '6px' }}>
                    Formatos: A4, A5, Envelope, Carta · Capacidade: 100 folhas
                  </p>
                  <div className="progress" style={{ marginTop: '12px' }}>
                    <i className="os-blue" style={{ width: '60%' }} />
                  </div>
                  <small style={{ color: 'var(--muted)', fontSize: '10px' }}>Nível de papel estimado: 60 folhas</small>
                </article>

                <article className="panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Bandeja 2 (Gaveta Principal)</h3>
                    <Status tone="green">Cheia</Status>
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '6px' }}>
                    Formato fixo: A4 (75g/m²) · Capacidade: 550 folhas
                  </p>
                  <div className="progress" style={{ marginTop: '12px' }}>
                    <i className="os-green" style={{ width: '92%' }} />
                  </div>
                  <small style={{ color: 'var(--muted)', fontSize: '10px' }}>Nível de papel estimado: 500 folhas (92%)</small>
                </article>
              </div>
            </div>
          )}

          {/* ABA 4: FILA DE IMPRESSÃO */}
          {tab === 'queue' && (
            <section className="panel table-panel">
              <div className="table-header" style={{ justifyContent: 'space-between' }}>
                <div>
                  <h3 className="card-section-title">Fila de Spooler do Servidor de Impressão</h3>
                  <p className="card-section-desc" style={{ marginBottom: 0 }}>
                    Trabalhos em processamento ou retidos no buffer de memória
                  </p>
                </div>
                {printQueue.length > 0 && (
                  <Button variant="danger" icon="trash" onClick={handleClearQueue}>
                    Cancelar Todos os Trabalhos
                  </Button>
                )}
              </div>

              {printQueue.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)' }}>
                  <Icon name="check" size={32} />
                  <p style={{ marginTop: '8px', fontSize: '13px' }}>
                    Fila limpa! Nenhum documento retido aguardando impressão.
                  </p>
                </div>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Nome do Documento</th>
                        <th>Usuário Solicitante</th>
                        <th>Páginas</th>
                        <th>Tamanho</th>
                        <th>Horário de Envio</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printQueue.map((job) => (
                        <tr key={job.id}>
                          <td>
                            <strong>{job.documentName}</strong>
                          </td>
                          <td>{job.owner}</td>
                          <td>{job.pages} pgs</td>
                          <td>{job.size}</td>
                          <td>{job.submittedAt}</td>
                          <td>
                            <Status tone={job.status === 'printing' ? 'blue' : 'amber'}>
                              {job.status === 'printing' ? 'Imprimindo' : 'Na Fila'}
                            </Status>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Button
                              variant="ghost"
                              icon="trash"
                              onClick={() => handleCancelJob(job.id)}
                            >
                              Cancelar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* ABA 5: HISTÓRICO */}
          {tab === 'history' && (
            <article className="panel timeline-panel">
              <h3>Histórico de Manutenções e Trocas de Insumos</h3>
              {maintenanceHistory.map((h, i) => (
                <div className="timeline-item" key={i}>
                  <i />
                  <div>
                    <strong>{h.title}</strong>
                    <p>{h.desc}</p>
                    <time>
                      {h.time} · Responsável: <strong>{h.tech}</strong>
                    </time>
                  </div>
                </div>
              ))}
            </article>
          )}
        </div>

        {/* Barra Lateral de Parâmetros SNMP */}
        <aside className="page-stack">
          <article className="panel quick-info">
            <h3>Parâmetros de Rede & SNMP</h3>
            <div>
              <span>Endereço IP</span>
              <strong>{ip}</strong>
            </div>
            <div>
              <span>Protocolo de Consulta</span>
              <strong>SNMP v2c (Porta 161)</strong>
            </div>
            <div>
              <span>Community String</span>
              <strong>{snmpCommunity}</strong>
            </div>
            <div>
              <span>Tempo de Atividade (Uptime)</span>
              <strong>42 dias, 18 horas</strong>
            </div>
            <div>
              <span>Servidor de Impressão</span>
              <strong>print-server-01.corp</strong>
            </div>
            <div>
              <span>MAC Address</span>
              <strong>3C:52:82:A1:04:9E</strong>
            </div>
          </article>
        </aside>
      </section>

      {/* MODAL DE EDIÇÃO DE CADASTRO */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Dados da Impressora"
        subtitle="Atualize a identificação física e parâmetros de rede do equipamento"
        icon="printer"
        maxWidth={520}
      >
        <form onSubmit={handleSaveEdit} className="page-stack">
          <label className="field full">
            <span>Nome da Impressora</span>
            <input
              type="text"
              value={printerName}
              onChange={(e) => setPrinterName(e.target.value)}
              required
            />
          </label>

          <label className="field full">
            <span>Endereço IP</span>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              required
            />
          </label>

          <label className="field full">
            <span>Localização / Setor</span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </label>

          <label className="field full">
            <span>Comunidade SNMP</span>
            <input
              type="text"
              value={snmpCommunity}
              onChange={(e) => setSnmpCommunity(e.target.value)}
              required
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar Alterações</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
