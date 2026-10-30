import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'
import type { PageId } from '../types'

type PolicyCategory = 'Todas' | 'Segurança' | 'Sistema' | 'Acesso' | 'Dados'

const policyData = [
  ['Proteção padrão — macOS', 'Segurança', '112 dispositivos', '98,2%', 'green'],
  ['Baseline corporativa — Windows', 'Segurança', '89 dispositivos', '96,6%', 'green'],
  ['Senha forte e bloqueio automático', 'Acesso', '247 dispositivos', '100%', 'green'],
  ['Atualizações automáticas de sistema', 'Sistema', '201 dispositivos', '91,4%', 'amber'],
  ['Proteção de dados — Departamento Financeiro', 'Dados', '34 dispositivos', '100%', 'green'],
  ['BYOD — Dispositivos móveis colaboradores', 'Acesso', '18 dispositivos', '88,9%', 'amber'],
] as const

export function Policies({ go }: { go?: (p: PageId) => void }) {
  const [tab, setTab] = useState<PolicyCategory>('Todas')
  const [query, setQuery] = useState('')

  const filtered = policyData.filter((p) => {
    const matchTab = tab === 'Todas' || p[1] === tab
    const matchQuery = p[0].toLowerCase().includes(query.toLowerCase())
    return matchTab && matchQuery
  })

  return (
    <div className="page-stack">
      <div className="action-row">
        <div>
          <h2>Políticas de Configuração e Segurança</h2>
          <p>Padronize conformidade, criptografia e restrições de acesso em todos os dispositivos.</p>
        </div>
        <Button icon="plus" onClick={() => go?.('policyCreate')}>
          Criar nova política
        </Button>
      </div>

      <div className="policy-summary">
        <div>
          <strong>18</strong>
          <span>Políticas ativas</span>
        </div>
        <div>
          <strong>96,8%</strong>
          <span>Conformidade média</span>
        </div>
        <div>
          <strong>8</strong>
          <span>Atribuições automáticas</span>
        </div>
        <div>
          <strong>5</strong>
          <span>Modelos CIS Benchmarks</span>
        </div>
      </div>

      <div className="report-toolbar">
        <div className="admin-tabs">
          {(['Todas', 'Segurança', 'Sistema', 'Acesso', 'Dados'] as PolicyCategory[]).map((x) => (
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
            placeholder="Buscar política..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <section className="policy-grid">
        {filtered.map((p, i) => (
          <article className="panel policy-card" key={p[0]}>
            <div>
              <span className={`module-icon ${['blue', 'violet', 'green', 'cyan', 'amber', 'rose'][i % 6]}`}>
                <Icon
                  name={
                    p[1] === 'Sistema'
                      ? 'download'
                      : p[1] === 'Acesso'
                      ? 'lock'
                      : 'shield'
                  }
                />
              </span>
              <button className="card-more" aria-label="Opções da política">•••</button>
            </div>
            <h3>{p[0]}</h3>
            <Status tone="blue">{p[1]}</Status>
            <div className="policy-stats">
              <span>
                <small>Atribuição</small>
                <strong>{p[2]}</strong>
              </span>
              <span>
                <small>Conformidade</small>
                <strong>{p[3]}</strong>
              </span>
            </div>
            <div className="progress">
              <i
                className={p[4] === 'green' ? 'os-green' : 'os-amber'}
                style={{ width: p[3] }}
              />
            </div>
            <div className="policy-foot">
              <Status tone={p[4] as 'green' | 'amber'}>
                {p[4] === 'green' ? 'Saudável' : 'Requer atenção'}
              </Status>
              <button>
                Gerenciar <Icon name="chevron" size={14} />
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
