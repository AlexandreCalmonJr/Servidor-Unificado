import { Icon } from '../components/Icon'
import { Button, MetricCard } from '../components/UI'
import type { PageId, IconName, ModuleItem } from '../types'

interface ActivityItem {
  icon: IconName
  tone: string
  title: string
  desc: string
  time: string
  moduleId?: string
}

const allActivity: ActivityItem[] = [
  { icon: 'check', tone: 'green', title: 'MacBook Pro provisionado', desc: 'Dispositivo de Mariana Costa ingressou com sucesso', time: 'Há 8 min', moduleId: 'assets' },
  { icon: 'totem', tone: 'blue', title: 'Totem TOT-04 conectado', desc: 'Unidade Central - Periféricos 100% operacionais', time: 'Há 18 min', moduleId: 'totems' },
  { icon: 'warning', tone: 'amber', title: 'Impressora HP LaserJet Almoxarifado', desc: 'Toner Preto em nível crítico (8%)', time: 'Há 25 min', moduleId: 'printers' },
  { icon: 'shield', tone: 'blue', title: 'Política aplicada', desc: 'Proteção de dados — Departamento Financeiro', time: 'Há 1 h', moduleId: 'policies' },
  { icon: 'laptop', tone: 'gray', title: 'Novo ativo detectado', desc: 'WIN-FIN-084 ingressou na rede corporativa', time: 'Há 2 h', moduleId: 'assets' },
]

function Os({
  name,
  count,
  percent,
  color,
}: {
  name: string
  count: string
  percent: number
  color: string
}) {
  return (
    <div className="os-item">
      <div>
        <span className={`os-dot ${color}`} />
        <strong>{name}</strong>
        <b>{count}</b>
      </div>
      <div className="progress">
        <i className={color} style={{ width: `${percent}%` }} />
      </div>
      <small>{percent}% da frota</small>
    </div>
  )
}

export function Dashboard({ go, modules = [] }: { go: (p: PageId) => void; modules?: ModuleItem[] }) {
  const isEnabled = (id: string) => {
    if (!modules || modules.length === 0) return true
    const found = modules.find((m) => m.id === id)
    return found ? found.enabled : false
  }

  const isTotems = isEnabled('totems')
  const isPrinters = isEnabled('printers')
  const isAssets = isEnabled('assets')
  const isMobile = isEnabled('mobile')

  // Calcula ativos totais ativos com base nos módulos habilitados
  const activeDeviceTotal =
    (isAssets ? 201 : 0) +
    (isMobile ? 46 : 0) +
    (isTotems ? 18 : 0) +
    (isPrinters ? 12 : 0)

  // Filtra atividades recentes apenas de módulos ativos
  const filteredActivity = allActivity.filter((item) => {
    if (!item.moduleId) return true
    return isEnabled(item.moduleId)
  })

  const todayFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
    .format(new Date())
    .toUpperCase()

  return (
    <div className="page-stack">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">{todayFormatted}</p>
          <h2>Painel de Controle Unificado</h2>
          <p>
            {isTotems && isPrinters
              ? 'Seus dispositivos, totens e impressoras estão operando em alta disponibilidade.'
              : 'Seus módulos ativos estão operando com sincronização em tempo real.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {isTotems ? (
            <Button variant="secondary" icon="totem" onClick={() => go('totems')}>
              Ver Totens
            </Button>
          ) : (
            <Button variant="secondary" icon="blocks" onClick={() => go('modules')}>
              Gerenciar Módulos
            </Button>
          )}
          <Button icon="plus" onClick={() => go('provisioning')}>
            Provisionar dispositivo
          </Button>
        </div>
      </div>

      <section className="metrics-grid">
        <MetricCard
          label="Total de ativos gerenciados"
          value={activeDeviceTotal > 0 ? activeDeviceTotal : '0'}
          delta="+12"
          detail="módulos ativos"
          icon="laptop"
          tone="blue"
        />
        <MetricCard
          label="Em conformidade geral"
          value="96,8%"
          delta="+1,4%"
          detail="vs. mês anterior"
          icon="shield"
          tone="green"
        />
        {isTotems && isPrinters ? (
          <MetricCard
            label="Totens & Impressoras ativas"
            value="30"
            delta="100%"
            detail="disponíveis"
            icon="printer"
            tone="amber"
          />
        ) : isTotems ? (
          <MetricCard
            label="Totens de Autoatendimento"
            value="18"
            delta="100%"
            detail="operacionais"
            icon="totem"
            tone="green"
          />
        ) : isPrinters ? (
          <MetricCard
            label="Impressoras de Rede"
            value="12"
            delta="SNMP"
            detail="monitoradas"
            icon="printer"
            tone="amber"
          />
        ) : (
          <MetricCard
            label="Módulos Habilitados"
            value={`${modules.filter((m) => m.enabled).length}`}
            delta="Ativos"
            detail="na plataforma"
            icon="blocks"
            tone="violet"
          />
        )}
        <MetricCard
          label="Ameaças neutralizadas"
          value="31"
          delta="100%"
          detail="bloqueios ativos"
          icon="warning"
          tone="violet"
        />
      </section>

      <section className="dashboard-grid">
        <article className="panel health-panel">
          <div className="panel-head">
            <div>
              <h3>Saúde do ambiente corporativo</h3>
              <p>Conformidade de políticas nos últimos 7 dias</p>
            </div>
            <button className="select-button">
              Últimos 7 dias <Icon name="chevron" size={14} />
            </button>
          </div>

          <div className="chart-wrap">
            <div className="chart-y">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
            </div>
            <div className="chart">
              <div className="grid-lines">
                <i />
                <i />
                <i />
                <i />
              </div>
              <svg viewBox="0 0 700 210" preserveAspectRatio="none" aria-label="Gráfico de conformidade">
                <defs>
                  <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#5368ec" stopOpacity=".22" />
                    <stop offset="1" stopColor="#5368ec" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  className="area"
                  d="M0 117 C70 106 90 120 150 92 S250 88 310 65 S410 75 475 43 S580 47 700 22 L700 210 L0 210Z"
                />
                <path
                  className="line"
                  d="M0 117 C70 106 90 120 150 92 S250 88 310 65 S410 75 475 43 S580 47 700 22"
                />
                <circle cx="475" cy="43" r="5" />
              </svg>
              <div className="chart-x">
                <span>D-6</span>
                <span>D-5</span>
                <span>D-4</span>
                <span>D-3</span>
                <span>D-2</span>
                <span>Ontem</span>
                <span>Hoje</span>
              </div>
            </div>
          </div>

          <div className="chart-legend">
            <span>
              <i className="legend-blue" />
              Conformidade geral <b>96,8%</b>
            </span>
            <span>
              <i className="legend-green" />
              Meta de conformidade <b>95%</b>
            </span>
          </div>
        </article>

        <article className="panel activity-panel">
          <div className="panel-head">
            <div>
              <h3>Atividade recente</h3>
              <p>Atualizações da frota e periféricos</p>
            </div>
            <button className="text-link" onClick={() => go('audit')}>
              Ver trilha <Icon name="arrow" size={14} />
            </button>
          </div>
          <div className="activity-list">
            {filteredActivity.map((item) => (
              <div className="activity" key={item.title}>
                <span className={`activity-icon ${item.tone}`}>
                  <Icon name={item.icon} size={16} />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.desc}</p>
                </div>
                <time>{item.time}</time>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel fleet-panel">
        <div className="panel-head">
          <div>
            <h3>Dispositivos por sistema operacional</h3>
            <p>Distribuição de computadores e smartphones gerenciados</p>
          </div>
          <button className="text-link" onClick={() => go('assets')}>
            Ver inventário completo <Icon name="arrow" size={15} />
          </button>
        </div>
        <div className="os-grid">
          <Os name="macOS" count="112" percent={45} color="os-blue" />
          <Os name="Windows" count="89" percent={36} color="os-violet" />
          <Os name="iOS / iPadOS" count="31" percent={13} color="os-cyan" />
          <Os name="Android" count="15" percent={6} color="os-green" />
        </div>
      </section>
    </div>
  )
}
