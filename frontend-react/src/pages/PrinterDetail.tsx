import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'
import type { PageId } from '../types'

export function PrinterDetail({ go }: { go: (p: PageId) => void }) {
  const [tab, setTab] = useState<'supplies' | 'counters' | 'trays' | 'queue' | 'history'>('supplies')
  const [syncing, setSyncing] = useState(false)
  const [testPrint, setTestPrint] = useState(false)

  const handleSync = () => {
    setSyncing(true)
    setTimeout(() => setSyncing(false), 900)
  }

  const handleTestPrint = () => {
    setTestPrint(true)
    setTimeout(() => setTestPrint(false), 2000)
  }

  return (
    <div className="page-stack">
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
              <h2>HP LaserJet Enterprise M507x — Recepção Principal</h2>
              <Status tone="green">Operacional</Status>
            </div>
            <p>10.42.20.15 · Térreo / Entrada · SNMP v2c Ativo</p>
          </div>
        </div>

        <div className="detail-actions">
          <Button variant="secondary" icon="refresh" onClick={handleSync}>
            {syncing ? 'Sincronizando...' : 'Sincronizar SNMP'}
          </Button>
          <Button variant="secondary" icon="printer" onClick={handleTestPrint}>
            {testPrint ? 'Enviando teste...' : 'Página de Teste'}
          </Button>
          <Button icon="terminal">Limpar Fila</Button>
        </div>
      </div>

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
          Fila de Impressão Ativa
        </button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
          Histórico de Trocas
        </button>
      </div>

      <section className="device-overview">
        <div className="page-stack">
          {tab === 'supplies' && (
            <div className="page-stack">
              <article className="panel" style={{ padding: '24px' }}>
                <div className="panel-head">
                  <div>
                    <h3>Cartuchos e Insumos de Impressão</h3>
                    <p>Leitura SNMP direta dos sensores internos da impressora</p>
                  </div>
                </div>

                <div className="supply-bars" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginTop: '20px' }}>
                  <div className="panel" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>Toner Preto (Black - K)</strong>
                      <span style={{ fontWeight: '700' }}>78%</span>
                    </div>
                    <div className="supply-bar" style={{ height: '10px' }}>
                      <i className="supply-k" style={{ width: '78%' }} />
                    </div>
                    <small style={{ color: 'var(--muted)', fontSize: '9px', marginTop: '8px', display: 'block' }}>
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
                    <small style={{ color: 'var(--muted)', fontSize: '9px', marginTop: '8px', display: 'block' }}>
                      Vida útil do fotocondutor em excelente estado
                    </small>
                  </div>

                  <div className="panel" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>Caixa Coletora de Resíduos (Waste Box)</strong>
                      <span style={{ fontWeight: '700' }}>22% cheia</span>
                    </div>
                    <div className="supply-bar" style={{ height: '10px' }}>
                      <i className="os-violet" style={{ width: '22%' }} />
                    </div>
                    <small style={{ color: 'var(--muted)', fontSize: '9px', marginTop: '8px', display: 'block' }}>
                      Capacidade ampla · Não requer substituição no momento
                    </small>
                  </div>

                  <div className="panel" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>Kit de Fusão (Fuser Kit)</strong>
                      <span style={{ fontWeight: '700' }}>94%</span>
                    </div>
                    <div className="supply-bar" style={{ height: '10px' }}>
                      <i className="os-cyan" style={{ width: '94%' }} />
                    </div>
                    <small style={{ color: 'var(--muted)', fontSize: '9px', marginTop: '8px', display: 'block' }}>
                      Temperatura nominal: 185 °C · Aquecimento instantâneo
                    </small>
                  </div>
                </div>
              </article>
            </div>
          )}

          {tab === 'counters' && (
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3>Contadores de Páginas e Produção</h3>
                  <p>Métricas acumuladas desde a instalação do equipamento</p>
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

          {tab === 'trays' && (
            <div className="group-cards" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <article className="panel" style={{ padding: '20px', flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Bandeja 1 (Manual / Multiuso)</h3>
                  <Status tone="green">Pronta</Status>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '10px', marginTop: '6px' }}>Formatos: A4, A5, Envelope, Carta · Capacidade: 100 folhas</p>
                <div className="progress" style={{ marginTop: '12px' }}>
                  <i className="os-blue" style={{ width: '60%' }} />
                </div>
                <small style={{ color: 'var(--muted)', fontSize: '8px' }}>Nível de papel estimado: 60 folhas</small>
              </article>

              <article className="panel" style={{ padding: '20px', flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Bandeja 2 (Gaveta Principal)</h3>
                  <Status tone="green">Cheia</Status>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '10px', marginTop: '6px' }}>Formato fixo: A4 (75g/m²) · Capacidade: 550 folhas</p>
                <div className="progress" style={{ marginTop: '12px' }}>
                  <i className="os-green" style={{ width: '92%' }} />
                </div>
                <small style={{ color: 'var(--muted)', fontSize: '8px' }}>Nível de papel estimado: 500 folhas (92%)</small>
              </article>
            </div>
          )}

          {tab === 'queue' && (
            <section className="panel table-panel">
              <div className="table-header">
                <strong>Fila de Spooler Local (0 trabalhos retidos)</strong>
              </div>
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)', fontSize: '11px' }}>
                <Icon name="check" size={28} />
                <p style={{ marginTop: '8px' }}>Fila limpa! Nenhum documento aguardando impressão no momento.</p>
              </div>
            </section>
          )}

          {tab === 'history' && (
            <article className="panel timeline-panel">
              <h3>Histórico de Manutenções e Trocas de Insumos</h3>
              {[
                { title: 'Substituição de Toner Preto (K)', desc: 'Cartucho anterior substituído com 2% de toner restante', time: '14 de maio de 2025' },
                { title: 'Higienização dos roletes de tração de papel', desc: 'Manutenção preventiva realizada pela equipe de infra', time: '02 de abril de 2025' },
                { title: 'Atualização de Firmware SNMP v2.40', desc: 'Patch de segurança aplicado remotamente', time: '18 de janeiro de 2025' },
              ].map((h) => (
                <div className="timeline-item" key={h.title}>
                  <i />
                  <div>
                    <strong>{h.title}</strong>
                    <p>{h.desc}</p>
                    <time>{h.time}</time>
                  </div>
                </div>
              ))}
            </article>
          )}
        </div>

        <aside className="page-stack">
          <article className="panel quick-info">
            <h3>Parâmetros de Rede & SNMP</h3>
            <div>
              <span>Endereço IP</span>
              <strong>10.42.20.15</strong>
            </div>
            <div>
              <span>Protocolo de Consulta</span>
              <strong>SNMP v2c (Porta 161)</strong>
            </div>
            <div>
              <span>Community String</span>
              <strong>corp-snmp-read</strong>
            </div>
            <div>
              <span>Tempo de Atividade (Uptime)</span>
              <strong>42 dias, 18 horas</strong>
            </div>
            <div>
              <span>Servidor de Impressão</span>
              <strong>print-server-01.corp</strong>
            </div>
          </article>
        </aside>
      </section>
    </div>
  )
}
