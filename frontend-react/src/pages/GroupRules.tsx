import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button } from '../components/UI'
import type { PageId } from '../types'

interface RuleCondition {
  id: string
  field: string
  operator: string
  value: string
}

export function GroupRules({ go }: { go: (p: PageId) => void }) {
  const [conditions, setConditions] = useState<RuleCondition[]>([
    { id: '1', field: 'department', operator: 'equals', value: 'Financeiro' },
    { id: '2', field: 'os', operator: 'contains', value: 'Windows' },
    { id: '3', field: 'ownership', operator: 'equals', value: 'Corporativo' },
  ])
  const [saved, setSaved] = useState(false)

  const addCondition = () => {
    setConditions([
      ...conditions,
      { id: String(Date.now()), field: 'os', operator: 'equals', value: '' },
    ])
  }

  const removeCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id))
  }

  const updateCondition = (id: string, key: keyof RuleCondition, val: string) => {
    setConditions(conditions.map((c) => (c.id === id ? { ...c, [key]: val } : c)))
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => {
      go('groupDetail')
    }, 1200)
  }

  return (
    <div className="page-stack">
      <div className="detail-heading">
        <button onClick={() => go('groupDetail')}>
          <Icon name="arrow" size={16} /> Voltar para detalhes do grupo
        </button>

        <div className="detail-device">
          <span>
            <Icon name="filter" size={26} />
          </span>
          <div>
            <h2>Editar Regras de Adesão Automática</h2>
            <p>Departamento Financeiro & Controladoria · Construtor de Critérios Lógicos</p>
          </div>
        </div>

        <div className="detail-actions">
          <Button variant="ghost" onClick={() => go('groupDetail')}>
            Cancelar
          </Button>
          <Button icon="check" onClick={handleSave}>
            {saved ? 'Regras Salvas!' : 'Salvar e Recalcular Membros'}
          </Button>
        </div>
      </div>

      <section className="panel form-panel" style={{ minHeight: 'auto' }}>
        <div className="form-heading">
          <span>CONSTRUTOR DE REGRAS DINÂMICAS</span>
          <h3>Condições de Correspondência (Cláusula E / AND)</h3>
          <p>O dispositivo precisa satisfazer todas as condições abaixo para ingressar automaticamente no grupo.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {conditions.map((cond, index) => (
            <div
              key={cond.id}
              className="panel"
              style={{
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: '40px 1.5fr 1fr 1.5fr 40px',
                gap: '12px',
                alignItems: 'center',
                background: '#fafbfc',
              }}
            >
              <span className="mini-icon blue" style={{ width: '32px', height: '32px' }}>
                {index + 1}
              </span>

              <label className="field" style={{ margin: 0 }}>
                <span>Campo do Ativo</span>
                <select
                  value={cond.field}
                  onChange={(e) => updateCondition(cond.id, 'field', e.target.value)}
                >
                  <option value="department">Departamento</option>
                  <option value="os">Sistema Operacional</option>
                  <option value="ownership">Propriedade (Corporativo/BYOD)</option>
                  <option value="model">Modelo de Hardware</option>
                  <option value="agentVersion">Versão do Agente</option>
                  <option value="bssid">Ponto de Acesso Wi-Fi (BSSID)</option>
                  <option value="ipRange">Faixa de IP / Subrede</option>
                </select>
              </label>

              <label className="field" style={{ margin: 0 }}>
                <span>Operador</span>
                <select
                  value={cond.operator}
                  onChange={(e) => updateCondition(cond.id, 'operator', e.target.value)}
                >
                  <option value="equals">é igual a</option>
                  <option value="notEquals">não é igual a</option>
                  <option value="contains">contém</option>
                  <option value="startsWith">começa com</option>
                  <option value="greaterThan">maior ou igual a</option>
                </select>
              </label>

              <label className="field" style={{ margin: 0 }}>
                <span>Valor de Correspondência</span>
                <input
                  placeholder="Ex.: Financeiro / Windows / 10.42.*"
                  value={cond.value}
                  onChange={(e) => updateCondition(cond.id, 'value', e.target.value)}
                />
              </label>

              <button
                type="button"
                className="icon-button"
                style={{ alignSelf: 'flex-end', height: '36px', width: '36px' }}
                onClick={() => removeCondition(cond.id)}
                title="Remover condição"
              >
                <Icon name="close" size={15} />
              </button>
            </div>
          ))}

          <div>
            <Button variant="secondary" icon="plus" onClick={addCondition}>
              Adicionar nova condição (E)
            </Button>
          </div>
        </div>

        <div
          className="security-banner"
          style={{ marginTop: '24px', background: 'var(--primary-soft)', borderColor: 'var(--primary)' }}
        >
          <span>
            <Icon name="pulse" />
          </span>
          <div>
            <strong>Pré-visualização em tempo real: 34 dispositivos elegíveis</strong>
            <p>Ao salvar, as 6 políticas vinculadas serão transmitidas automaticamente para estes 34 ativos.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
