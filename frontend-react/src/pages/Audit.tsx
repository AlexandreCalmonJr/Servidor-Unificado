import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'

type AuditEvent = [
  actor: string,
  action: string,
  resource: string,
  time: string,
  ip: string,
  result: 'green' | 'blue' | 'gray' | 'red'
]

const auditEvents: AuditEvent[] = [
  ['Lucas Martins', 'Executou comando remoto (Lock)', 'MacBook Pro — Mariana', '18 jun, 10:42', '201.17.83.21', 'green'],
  ['Ana Ribeiro', 'Alterou política de segurança', 'Proteção padrão — macOS', '18 jun, 10:18', '201.17.83.44', 'blue'],
  ['Sistema Autônomo', 'Dispositivo provisionado via QR', 'NVR-IOS-0032', '18 jun, 09:56', 'Automação MDM', 'green'],
  ['Pedro Souza', 'Exportou relatório de conformidade', 'Conformidade mensal', '18 jun, 09:31', '177.54.92.10', 'gray'],
  ['Lucas Martins', 'Cadastrou novo usuário', 'camila@novara.com.br', '17 jun, 17:08', '201.17.83.21', 'blue'],
  ['Ana Ribeiro', 'Falha de senha / 2FA', 'Console administrativo', '17 jun, 16:42', '189.33.28.19', 'red'],
  ['Sistema Autônomo', 'Alerta de Toner Crítico gerado', 'HP LaserJet Enterprise M507', '17 jun, 14:10', 'SNMP Trap', 'green'],
]

export function Audit() {
  const [query, setQuery] = useState('')

  const filtered = auditEvents.filter((e) =>
    `${e[0]} ${e[1]} ${e[2]} ${e[4]}`.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="page-stack">
      <section className="audit-head">
        <div>
          <h2>Trilha Imutável de Auditoria</h2>
          <p>Registro forense e compliance de todas as operações administrativas e comandos remotos (retenção 365 dias).</p>
        </div>
        <div>
          <Button variant="secondary" icon="download">
            Exportar CSV
          </Button>
          <Button variant="secondary" icon="report">
            Gerar Relatório de Auditoria
          </Button>
        </div>
      </section>

      <section className="audit-metrics">
        <div>
          <span>
            <Icon name="report" />
          </span>
          <p>
            <strong>1.284</strong>eventos auditados nos últimos 7 dias
          </p>
        </div>
        <div>
          <span>
            <Icon name="user" />
          </span>
          <p>
            <strong>18</strong>operadores e automações ativas
          </p>
        </div>
        <div>
          <span>
            <Icon name="warning" />
          </span>
          <p>
            <strong>3</strong>eventos de atenção investigados
          </p>
        </div>
      </section>

      <section className="panel table-panel">
        <div className="table-header audit-filters">
          <label className="search table-search">
            <Icon name="search" />
            <input
              placeholder="Buscar por usuário, ação, IP ou recurso..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select>
            <option>Todos os tipos de eventos</option>
            <option>Autenticação e Sessão</option>
            <option>Comandos em Dispositivos</option>
            <option>Alteração de Políticas</option>
            <option>Alertas de Totens & Impressoras</option>
          </select>
          <select>
            <option>Últimos 7 dias</option>
            <option>Últimas 24 horas</option>
            <option>Últimos 30 dias</option>
          </select>
          <Button variant="secondary" icon="filter">
            Mais filtros
          </Button>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Ator / Operador</th>
                <th>Ação Executada</th>
                <th>Recurso Afetado</th>
                <th>Data e Hora</th>
                <th>Origem / IP</th>
                <th>Resultado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e[0] + e[3]}>
                  <td>
                    <div className="user-cell">
                      <span>
                        {e[0].includes('Sistema') ? (
                          <Icon name="server" size={14} />
                        ) : (
                          e[0]
                            .split(' ')
                            .map((x) => x[0])
                            .join('')
                            .slice(0, 2)
                        )}
                      </span>
                      <strong>{e[0]}</strong>
                    </div>
                  </td>
                  <td>
                    <strong className="audit-action">{e[1]}</strong>
                  </td>
                  <td>{e[2]}</td>
                  <td>{e[3]}</td>
                  <td>{e[4]}</td>
                  <td>
                    <Status tone={e[5]}>{e[5] === 'red' ? 'Bloqueado' : 'Sucesso'}</Status>
                  </td>
                  <td>
                    <button className="icon-link" aria-label="Ver detalhes do log">
                      <Icon name="eye" size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span>Exibindo 1–{filtered.length} de 1.284 eventos</span>
          <div>
            <button>Anterior</button>
            <button className="current">1</button>
            <button>2</button>
            <button>3</button>
            <button>Próximo</button>
          </div>
        </div>
      </section>
    </div>
  )
}
