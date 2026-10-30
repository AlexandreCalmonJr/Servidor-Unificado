import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button } from '../components/UI'
import type { PageId } from '../types'

export function GroupCreate({ go }: { go: (p: PageId) => void }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [type, setType] = useState<'dynamic' | 'static'>('dynamic')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => {
      go('groups')
    }, 1200)
  }

  return (
    <div className="provision-layout" style={{ gridTemplateColumns: 'minmax(0, 780px) 300px' }}>
      <section className="panel form-panel">
        <div className="form-heading">
          <span>NOVO GRUPO DE DISPOSITIVOS</span>
          <h3>Criar Grupo Inteligente</h3>
          <p>Organize a frota e automatize a atribuição de políticas e aplicativos corporativos.</p>
        </div>

        <div className="form-grid">
          <label className="field full">
            <span>Nome do Grupo</span>
            <input
              placeholder="Ex.: Totens Agência Central / Desenvolvedores Frontend"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="field full">
            <span>Descrição / Finalidade</span>
            <textarea
              placeholder="Descreva o objetivo deste grupo e o perfil dos ativos incluídos..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
            />
          </label>

          <div className="full">
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#3f485c', display: 'block', marginBottom: '8px' }}>
              Tipo de Associação
            </span>
            <div className="option-grid">
              <button
                type="button"
                className={type === 'dynamic' ? 'selected' : ''}
                onClick={() => setType('dynamic')}
              >
                <span className="platform-icon">
                  <Icon name="pulse" />
                </span>
                <strong>Grupo Dinâmico (Recomendado)</strong>
                <small>Dispositivos entram e saem automaticamente com base em regras lógicas.</small>
                {type === 'dynamic' && (
                  <i className="selected-check">
                    <Icon name="check" size={13} />
                  </i>
                )}
              </button>

              <button
                type="button"
                className={type === 'static' ? 'selected' : ''}
                onClick={() => setType('static')}
              >
                <span className="platform-icon">
                  <Icon name="user" />
                </span>
                <strong>Grupo Estático / Manual</strong>
                <small>Dispositivos são adicionados manualmente um a um pelos administradores.</small>
                {type === 'static' && (
                  <i className="selected-check">
                    <Icon name="check" size={13} />
                  </i>
                )}
              </button>
            </div>
          </div>

          <label className="field">
            <span>Departamento Principal</span>
            <select>
              <option>Tecnologia & TI</option>
              <option>Financeiro</option>
              <option>Design</option>
              <option>Operações & Totens</option>
              <option>Todos os departamentos</option>
            </select>
          </label>

          <label className="field">
            <span>Política Inicial Padrão</span>
            <select>
              <option>Proteção Padrão — Alta Segurança</option>
              <option>Baseline Corporativa</option>
              <option>Kiosk Mode — Totem</option>
              <option>Nenhuma (atribuir depois)</option>
            </select>
          </label>
        </div>

        <div className="form-actions">
          <Button variant="ghost" onClick={() => go('groups')}>
            Cancelar
          </Button>
          <Button
            icon="check"
            onClick={handleSave}
            disabled={!name}
          >
            {saved ? 'Grupo Criado!' : 'Criar Grupo e Definir Regras'}
          </Button>
        </div>
      </section>

      <aside className="create-help">
        <span>
          <Icon name="grid" />
        </span>
        <h3>Grupos Dinâmicos</h3>
        <p>Grupos inteligentes eliminam o trabalho manual da equipe de TI:</p>
        <ul>
          <li>Novos ativos recebem políticas em segundos</li>
          <li>Permitem disparar comandos em lote para centenas de máquinas</li>
          <li>Evitam falhas humanas de conformidade</li>
        </ul>
      </aside>
    </div>
  )
}
