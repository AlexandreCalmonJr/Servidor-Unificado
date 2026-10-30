import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button } from '../components/UI'
import type { IconName } from '../types'

type ReportCategory = 'Todos' | 'Segurança' | 'Inventário' | 'Operação'

const reportsList = [
  ['Resumo Executivo Geral', 'Visão consolidada de conformidade, ativos, totens e impressoras.', 'report', 'Atualizado hoje', 'Operação'],
  ['Conformidade de Dispositivos', 'Detalhamento de políticas por dispositivo, departamento e SO.', 'shield', 'Atualizado há 2h', 'Segurança'],
  ['Inventário Completo de Hardware', 'Hardware, garantias, serial e ciclo de vida dos ativos.', 'laptop', 'Atualizado há 6h', 'Inventário'],
  ['Relatório de Insumos de Impressão', 'Consumo de toner por página, trocas de cilindro e previsão de compra.', 'printer', 'Atualizado hoje', 'Operação'],
  ['Disponibilidade e Uptime de Totens', 'Logs de comunicação, falhas de papel térmico e reinícios de Kiosk.', 'totem', 'Atualizado hoje', 'Operação'],
  ['Aplicativos Instalados & Licenças', 'Softwares instalados, licenças utilizadas e versões desatualizadas.', 'blocks', 'Atualizado ontem', 'Inventário'],
  ['Atividade Administrativa & Auditoria', 'Trilha completa de auditoria, logins e comandos executados.', 'user', 'Atualizado hoje', 'Segurança'],
  ['Ameaças e Vulnerabilidades', 'Incidentes detectados, bloqueios pelo antivírus e recomendações.', 'warning', 'Atualizado há 1h', 'Segurança'],
] as const

export function Reports() {
  const [tab, setTab] = useState<ReportCategory>('Todos')
  const [query, setQuery] = useState('')

  const filtered = reportsList.filter((r) => {
    const matchTab = tab === 'Todos' || r[4] === tab
    const matchQuery = `${r[0]} ${r[1]}`.toLowerCase().includes(query.toLowerCase())
    return matchTab && matchQuery
  })

  return (
    <div className="page-stack">
      <div className="action-row">
        <div>
          <h2>Biblioteca de Relatórios e Inteligência</h2>
          <p>Exporte relatórios automatizados para auditoria, compras de insumos e conformidade regulatória.</p>
        </div>
        <Button icon="plus">Criar relatório agendado</Button>
      </div>

      <section className="report-summary">
        <div>
          <span>Relatórios gerados</span>
          <strong>142</strong>
          <small>nos últimos 30 dias</small>
        </div>
        <div>
          <span>Agendamentos automáticos</span>
          <strong>8</strong>
          <small>próximo envio hoje às 18:00</small>
        </div>
        <div>
          <span>Dados processados</span>
          <strong>18,4 GB</strong>
          <small>atualização em tempo real</small>
        </div>
        <div className="report-spark">
          <svg viewBox="0 0 180 60">
            <path d="M0 52 C30 45 30 32 58 36 S92 46 112 25 S150 25 180 5" />
            <path className="fill" d="M0 52 C30 45 30 32 58 36 S92 46 112 25 S150 25 180 5V60H0Z" />
          </svg>
        </div>
      </section>

      <div className="report-toolbar">
        <div className="admin-tabs">
          {(['Todos', 'Segurança', 'Inventário', 'Operação'] as ReportCategory[]).map((x) => (
            <button
              className={tab === x ? 'active' : ''}
              onClick={() => setTab(x)}
              key={x}
            >
              {x}
            </button>
          ))}
        </div>
        <label className="search table-search">
          <Icon name="search" />
          <input
            placeholder="Buscar relatório..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <section className="report-grid">
        {filtered.map((r, i) => (
          <article className="panel report-card" key={r[0]}>
            <div>
              <span className={`module-icon ${['blue', 'green', 'violet', 'cyan', 'amber', 'rose'][i % 6]}`}>
                <Icon name={r[2] as IconName} />
              </span>
              <button className="card-more" aria-label="Opções do relatório">•••</button>
            </div>
            <h3>{r[0]}</h3>
            <p>{r[1]}</p>
            <small>{r[3]}</small>
            <div>
              <Button variant="secondary" icon="eye">
                Visualizar
              </Button>
              <button aria-label="Baixar PDF / CSV">
                <Icon name="download" />
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
