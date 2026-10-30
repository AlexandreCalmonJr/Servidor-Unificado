import { Icon } from '../components/Icon'
import { Status, MetricCard } from '../components/UI'

export function ServerStatus() {
  const services = [
    ['API Central de Gerenciamento', 'Operacional', '99,99%', '38 ms'],
    ['WebSocket de Telemetria em Tempo Real', 'Operacional', '99,98%', '15 ms'],
    ['Serviço de Monitoramento SNMP (Impressoras)', 'Operacional', '100%', '42 ms'],
    ['Servidor de Telemetria de Totens (Kiosk)', 'Operacional', '99,99%', '24 ms'],
    ['Distribuição de Aplicativos e Perfis', 'Operacional', '100%', '41 ms'],
    ['Serviço de Autenticação JWT / SSO', 'Operacional', '100%', '29 ms'],
    ['Notificações Push (APNs / FCM)', 'Operacional', '99,97%', '63 ms'],
    ['Banco de Dados MongoDB Cluster', 'Operacional', '100%', '12 ms'],
  ]

  return (
    <div className="page-stack">
      <section className="server-hero">
        <div>
          <span>
            <Icon name="check" size={25} />
          </span>
          <div>
            <h2>Todos os microsserviços operacionais</h2>
            <p>Infraestrutura do Servidor Unificado operando em regime nominal sem degradação.</p>
          </div>
        </div>
        <small>Atualizado há 30 segundos · Auto-refresh</small>
      </section>

      <section className="server-metrics">
        <MetricCard
          label="Disponibilidade global"
          value="99,99%"
          delta="+0,02%"
          detail="últimos 30 dias"
          icon="server"
          tone="green"
        />
        <MetricCard
          label="Latência média da API"
          value="34 ms"
          delta="-8 ms"
          detail="resposta rápida"
          icon="pulse"
          tone="blue"
        />
        <MetricCard
          label="Requisições processadas"
          value="2,4 mi"
          delta="+14%"
          detail="nas últimas 24h"
          icon="arrow"
          tone="violet"
        />
      </section>

      <section className="panel services-panel">
        <div className="panel-head">
          <div>
            <h3>Status individual dos microsserviços</h3>
            <p>Região América do Sul (São Paulo - BR Cluster)</p>
          </div>
          <select defaultValue="sp">
            <option value="sp">Cluster São Paulo — BR (Ativo)</option>
            <option value="dr">Cluster Secundário / Disaster Recovery</option>
          </select>
        </div>

        {services.map((x, i) => (
          <div className="service-row" key={x[0]}>
            <div>
              <span className="service-icon">
                <Icon
                  name={
                    i === 5
                      ? 'lock'
                      : i === 6
                      ? 'bell'
                      : i === 2
                      ? 'printer'
                      : i === 3
                      ? 'totem'
                      : 'server'
                  }
                  size={16}
                />
              </span>
              <strong>{x[0]}</strong>
            </div>
            <div className="uptime-bars">
              {Array.from({ length: 30 }, (_, n) => (
                <i
                  className={n === 18 && i === 6 ? 'warning' : ''}
                  key={n}
                  title={`Dia ${30 - n}: 100% uptime`}
                />
              ))}
            </div>
            <span>{x[2]}</span>
            <span>{x[3]}</span>
            <Status tone="green">{x[1]}</Status>
          </div>
        ))}
      </section>

      <section className="incident-note">
        <Icon name="clock" />
        <div>
          <strong>Último incidente resolvido: 23 de maio de 2025</strong>
          <p>Oscilação pontual nas notificações push móveis · Identificado e normalizado em 18 minutos.</p>
        </div>
        <button>
          Ver histórico de SLA <Icon name="arrow" size={14} />
        </button>
      </section>
    </div>
  )
}
