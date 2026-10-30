import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'

export function Diagnostics() {
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)

  const run = () => {
    setRunning(true)
    setFinished(false)
    setTimeout(() => {
      setRunning(false)
      setFinished(true)
    }, 1200)
  }

  return (
    <div className="page-stack">
      <div className="action-row">
        <div>
          <h2>Central de Diagnóstico & Integridade</h2>
          <p>Identifique proativamente problemas de conectividade, memória, certificados e conformidade.</p>
        </div>
        <Button icon="pulse" onClick={run}>
          {running ? 'Executando varredura...' : 'Iniciar diagnóstico completo'}
        </Button>
      </div>

      {finished && (
        <div className="success-banner">
          <Icon name="check" />
          <span>
            <strong>Diagnóstico concluído com sucesso</strong>
            <small>Varredura em 247 dispositivos e 18 totens finalizada. Nenhum incidente crítico ativo.</small>
          </span>
          <button onClick={() => setFinished(false)}>
            <Icon name="close" size={15} />
          </button>
        </div>
      )}

      <section className="diagnostic-grid">
        <article className="panel diagnostic-score">
          <div className={`scan-ring ${running ? 'scanning' : ''}`}>
            <strong>{running ? '...' : '94'}</strong>
            <span>SAÚDE GERAL</span>
          </div>
          <h3>Ambiente Seguro & Estável</h3>
          <p>3 recomendações identificadas para otimização da frota.</p>
          <div className="score-legend">
            <span>
              <i className="green" /> 18 verificações automáticas aprovadas
            </span>
            <span>
              <i className="amber" /> 3 recomendações preventivas
            </span>
            <span>
              <i className="red" /> 0 falhas críticas
            </span>
          </div>
        </article>

        <article className="panel diagnostic-list">
          <div className="panel-head">
            <div>
              <h3>Verificações do ecossistema</h3>
              <p>Última análise completa hoje às 11:15</p>
            </div>
            <Status tone="green">Operacional</Status>
          </div>
          {[
            ['Conectividade dos agentes', '244 de 247 dispositivos respondendo ativamente via WebSocket', 'green', '99%'],
            ['Conformidade de políticas', '239 dispositivos 100% alinhados com a baseline de segurança', 'green', '97%'],
            ['Atualizações de patches pendentes', '12 dispositivos requerem reinicialização programada', 'amber', '88%'],
            ['Integridade de certificados SSL/TLS', 'Todos os certificados corporativos válidos por mais de 90 dias', 'green', '100%'],
            ['Capacidade de armazenamento', '7 computadores com menos de 15% de espaço livre no SSD', 'amber', '91%'],
          ].map((x) => (
            <div className="check-row" key={x[0]}>
              <span className={`check-icon ${x[2]}`}>
                <Icon name={x[2] === 'green' ? 'check' : 'warning'} size={14} />
              </span>
              <div>
                <strong>{x[0]}</strong>
                <p>{x[1]}</p>
              </div>
              <b>{x[3]}</b>
              <Icon name="chevron" size={15} />
            </div>
          ))}
        </article>
      </section>

      <section className="panel issue-panel">
        <div className="panel-head">
          <div>
            <h3>Recomendações e Ações Sugeridas</h3>
            <p>Melhorias preventivas para elevar o score de conformidade</p>
          </div>
        </div>
        <div className="recommend-grid">
          {[
            ['Atualizar agentes antigos', '8 dispositivos utilizam compilação anterior à 4.8', 'Atualizar agora'],
            ['Revisar espaço em disco', '7 dispositivos possuem menos de 25 GB livres', 'Ver dispositivos'],
            ['Reiniciar totens e computadores', '12 atualizações de SO aguardam reinicialização', 'Agendar reinício'],
          ].map((x, i) => (
            <div key={x[0]}>
              <span className={i === 1 ? 'amber' : 'blue'}>
                <Icon name={i === 1 ? 'warning' : i === 2 ? 'clock' : 'download'} />
              </span>
              <div>
                <strong>{x[0]}</strong>
                <p>{x[1]}</p>
              </div>
              <button>
                {x[2]} <Icon name="arrow" size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
