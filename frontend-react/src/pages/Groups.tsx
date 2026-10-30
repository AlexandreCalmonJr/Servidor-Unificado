import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button } from '../components/UI'
import type { PageId } from '../types'

export function Groups({ go }: { go?: (p: PageId) => void }) {
  const [selectedGroup, setSelectedGroup] = useState('Todos os dispositivos')

  const groups = [
    { name: 'Todos os dispositivos', count: '247 ativos', icon: 'grid' as const },
    { name: 'Corporativo HQ', count: '185 subgrupos', icon: 'user' as const },
    { name: 'Departamentos', count: '6 subgrupos', icon: 'user' as const },
    { name: 'Plataformas (SO)', count: '4 subgrupos', icon: 'laptop' as const },
    { name: 'Totens e Kiosks', count: '18 ativos', icon: 'totem' as const },
    { name: 'Localidades Remotas', count: '3 filiais', icon: 'server' as const },
  ]

  return (
    <div className="page-stack">
      <div className="action-row">
        <div>
          <h2>Organização da Frota & Grupos Inteligentes</h2>
          <p>Crie regras dinâmicas baseadas em departamento, SO ou localidade para automatizar políticas.</p>
        </div>
        <Button icon="plus" onClick={() => go?.('groupCreate')}>
          Novo grupo dinâmico
        </Button>
      </div>

      <section className="group-layout">
        <aside className="panel group-tree">
          <div className="table-header">
            <label className="search table-search">
              <Icon name="search" />
              <input placeholder="Buscar grupo..." />
            </label>
          </div>
          {groups.map((g) => (
            <button
              key={g.name}
              type="button"
              className={selectedGroup === g.name ? 'active' : ''}
              onClick={() => setSelectedGroup(g.name)}
            >
              <span>
                <Icon name={g.icon} />
              </span>
              <div>
                <strong>{g.name}</strong>
                <small>{g.count}</small>
              </div>
              <Icon name="chevron" size={14} />
            </button>
          ))}
        </aside>

        <section className="page-stack">
          <article className="panel group-detail">
            <div className="group-title">
              <span>
                <Icon name="grid" size={24} />
              </span>
              <div>
                <h3>{selectedGroup}</h3>
                <p>Grupo raiz de dispositivos · Sincronização automática contínua</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" onClick={() => go?.('groupRules')}>
                  Editar regras de adesão
                </Button>
                <Button onClick={() => go?.('groupDetail')}>
                  Ver Detalhes & Membros
                </Button>
              </div>
            </div>
            <div className="group-numbers">
              <div>
                <strong>247</strong>
                <span>Dispositivos</span>
              </div>
              <div>
                <strong>239</strong>
                <span>Conformes</span>
              </div>
              <div>
                <strong>18</strong>
                <span>Políticas ativas</span>
              </div>
              <div>
                <strong>42</strong>
                <span>Apps distribuídos</span>
              </div>
            </div>
          </article>

          <div className="group-cards">
            {[
              ['Financeiro & Controladoria', '34 computadores', '6 políticas', 'green'],
              ['Design & Experiência', '28 computadores', '8 políticas', 'violet'],
              ['Engenharia & Tecnologia', '52 computadores', '12 políticas', 'blue'],
              ['Operações & Totens', '18 totens ativos', '5 políticas', 'amber'],
              ['Frota Apple (macOS/iOS)', '143 dispositivos', '9 políticas', 'gray'],
              ['Frota Microsoft (Windows)', '89 dispositivos', '8 políticas', 'cyan'],
            ].map((x) => (
              <article className="panel" key={x[0]}>
                <span className={`module-icon ${x[3]}`}>
                  <Icon name="user" />
                </span>
                <div>
                  <h3>{x[0]}</h3>
                  <p>
                    {x[1]} · {x[2]}
                  </p>
                </div>
                <button aria-label="Abrir grupo">
                  <Icon name="chevron" size={15} />
                </button>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  )
}
