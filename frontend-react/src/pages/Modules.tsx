import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'
import type { PageId, IconName, ModuleItem } from '../types'

const availableIcons: { name: IconName; label: string }[] = [
  { name: 'laptop', label: 'Computador / Notebook' },
  { name: 'totem', label: 'Totem de Atendimento' },
  { name: 'printer', label: 'Impressora & Insumos' },
  { name: 'cpu', label: 'IoT & Microcontrolador' },
  { name: 'phone', label: 'Dispositivo Mobile' },
  { name: 'shield', label: 'Segurança & Proteção' },
  { name: 'blocks', label: 'Catálogo / Módulo' },
  { name: 'terminal', label: 'Terminal / Comandos' },
  { name: 'pulse', label: 'Diagnóstico & Saúde' },
  { name: 'report', label: 'Relatórios & Auditoria' },
  { name: 'server', label: 'Servidor & Rede' },
  { name: 'lock', label: 'Acesso Zero Trust' },
]

const availableColors = [
  { value: 'blue', label: 'Azul' },
  { value: 'green', label: 'Verde' },
  { value: 'violet', label: 'Violeta' },
  { value: 'amber', label: 'Âmbar' },
  { value: 'cyan', label: 'Ciano' },
  { value: 'rose', label: 'Vermelho / Rose' },
  { value: 'gray', label: 'Cinza neutro' },
]

const availableSections = [
  'DISPOSITIVOS & OPERAÇÃO',
  'GERENCIAMENTO',
  'SISTEMA',
  'DISTRIBUIÇÃO',
]

export function Modules({
  modules,
  onToggleModule,
  onAddModule,
  onUpdateModule,
  onDeleteModule,
  go,
}: {
  modules: ModuleItem[]
  onToggleModule: (id: string) => void
  onAddModule: (mod: ModuleItem) => void
  onUpdateModule: (mod: ModuleItem) => void
  onDeleteModule: (id: string) => void
  go?: (p: PageId) => void
}) {
  // Modal de Criar ou Editar Módulo
  const [modalOpen, setModalOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<ModuleItem | null>(null)

  // Estado do Formulário
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formIcon, setFormIcon] = useState<IconName>('blocks')
  const [formColor, setFormColor] = useState('blue')
  const [formStats, setFormStats] = useState('')
  const [formSection, setFormSection] = useState('DISPOSITIVOS & OPERAÇÃO')
  const [formEnabled, setFormEnabled] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)

  const showFeedback = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  const handleOpenCreate = () => {
    setEditingModule(null)
    setFormName('')
    setFormDesc('')
    setFormIcon('blocks')
    setFormColor('blue')
    setFormStats('0 itens')
    setFormSection('DISPOSITIVOS & OPERAÇÃO')
    setFormEnabled(true)
    setModalOpen(true)
  }

  const handleOpenEdit = (m: ModuleItem) => {
    setEditingModule(m)
    setFormName(m.name)
    setFormDesc(m.desc)
    setFormIcon(m.icon)
    setFormColor(m.color)
    setFormStats(m.stats)
    setFormSection(m.section || 'DISPOSITIVOS & OPERAÇÃO')
    setFormEnabled(m.enabled)
    setModalOpen(true)
  }

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return

    if (editingModule) {
      // Editar Módulo Existente
      const updated: ModuleItem = {
        ...editingModule,
        name: formName.trim(),
        desc: formDesc.trim() || 'Módulo operacional gerenciado pelo console.',
        icon: formIcon,
        color: formColor,
        stats: formStats.trim() || editingModule.stats,
        section: formSection,
        enabled: formEnabled,
      }
      onUpdateModule(updated)
      showFeedback(`Módulo "${updated.name}" atualizado com sucesso!`)
    } else {
      // Criar Novo Módulo
      const id = formName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4)
      const newModule: ModuleItem = {
        id,
        name: formName.trim(),
        desc: formDesc.trim() || 'Módulo operacional configurado pelo administrador.',
        icon: formIcon,
        color: formColor,
        stats: formStats.trim() || 'Ativo',
        section: formSection,
        enabled: formEnabled,
        isCustom: true,
      }
      onAddModule(newModule)
      showFeedback(`Módulo "${newModule.name}" criado com sucesso!`)
    }

    setModalOpen(false)
  }

  const handleDelete = (m: ModuleItem) => {
    if (confirm(`Tem certeza que deseja excluir o módulo "${m.name}"?`)) {
      onDeleteModule(m.id)
      showFeedback(`Módulo "${m.name}" removido da plataforma.`)
    }
  }

  return (
    <div className="page-stack">
      <div className="action-row">
        <div>
          <h2>Capacidades e Módulos da Plataforma</h2>
          <p>Ative, crie e gerencie os módulos que sua organização utiliza no console unificado.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button icon="plus" onClick={handleOpenCreate}>
            Novo Módulo
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            background: 'var(--green-soft)',
            color: 'var(--green)',
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid var(--green)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <Icon name="check" size={16} />
          <span>{feedback}</span>
        </div>
      )}

      <div className="module-grid">
        {modules.map((m) => (
          <article className={`panel module-card ${!m.enabled ? 'inactive' : ''}`} key={m.id}>
            <div className="module-top">
              <span className={`module-icon ${m.color}`}>
                <Icon name={m.icon} size={20} />
              </span>
              <button
                aria-label={`${m.enabled ? 'Desativar' : 'Ativar'} ${m.name}`}
                className={`toggle ${m.enabled ? 'on' : ''}`}
                onClick={() => onToggleModule(m.id)}
                title={m.enabled ? 'Clique para desativar (oculta da barra lateral)' : 'Clique para ativar (exibe na barra lateral)'}
              >
                <i />
              </button>
            </div>

            <h3>{m.name}</h3>
            <p>{m.desc}</p>

            <div className="module-footer">
              <div className="module-footer-left">
                <Status tone={m.enabled ? 'green' : 'gray'}>
                  {m.enabled ? 'Ativo' : 'Inativo'}
                </Status>
                <span>{m.stats}</span>
              </div>

              <div className="module-actions">
                {m.enabled && m.pageId && go && (
                  <button
                    className="module-btn-icon"
                    onClick={() => go(m.pageId!)}
                    title={`Abrir página do módulo ${m.name}`}
                    aria-label="Abrir módulo"
                  >
                    <Icon name="arrow" size={15} />
                  </button>
                )}
                <button
                  className="module-btn-icon"
                  onClick={() => handleOpenEdit(m)}
                  title="Editar configurações deste módulo"
                  aria-label="Editar módulo"
                >
                  <Icon name="edit" size={15} />
                </button>
                <button
                  className="module-btn-icon danger"
                  onClick={() => handleDelete(m)}
                  title="Excluir este módulo"
                  aria-label="Excluir módulo"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* MODAL LIMPO PARA CRIAR OU EDITAR MÓDULO */}
      {modalOpen && (
        <div className="module-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="module-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="module-modal-header" style={{ padding: '16px 20px' }}>
              <h3 style={{ fontSize: '15px' }}>
                <Icon name={editingModule ? 'edit' : 'plus'} size={18} />
                <span>{editingModule ? 'Editar Módulo' : 'Criar Novo Módulo'}</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px' }}
                aria-label="Fechar modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal}>
              <div className="module-modal-body" style={{ padding: '18px 20px', gap: '14px' }}>
                <div className="config-field-row">
                  <label htmlFor="mod-name">Nome do Módulo *</label>
                  <input
                    id="mod-name"
                    type="text"
                    required
                    placeholder="Ex: Totens de Autoatendimento, Catracas..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className="config-field-row">
                  <label htmlFor="mod-desc">Descrição Operacional</label>
                  <input
                    id="mod-desc"
                    type="text"
                    placeholder="Breve descrição do que este módulo gerencia..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="config-field-row">
                    <label htmlFor="mod-icon">Ícone</label>
                    <select
                      id="mod-icon"
                      value={formIcon}
                      onChange={(e) => setFormIcon(e.target.value as IconName)}
                    >
                      {availableIcons.map((ic) => (
                        <option key={ic.name} value={ic.name}>
                          {ic.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="config-field-row">
                    <label htmlFor="mod-color">Cor de Destaque</label>
                    <select
                      id="mod-color"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                    >
                      {availableColors.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="config-field-row">
                    <label htmlFor="mod-section">Seção no Menu Lateral</label>
                    <select
                      id="mod-section"
                      value={formSection}
                      onChange={(e) => setFormSection(e.target.value)}
                    >
                      {availableSections.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="config-field-row">
                    <label htmlFor="mod-stats">Estatística / Legenda</label>
                    <input
                      id="mod-stats"
                      type="text"
                      placeholder="Ex: 18 totens, Ativo..."
                      value={formStats}
                      onChange={(e) => setFormStats(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--canvas)', borderRadius: '8px', marginTop: '4px' }}>
                  <div>
                    <strong style={{ fontSize: '13px' }}>Habilitar este módulo agora</strong>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>Se ativo, aparecerá na barra lateral imediatamente.</p>
                  </div>
                  <button
                    type="button"
                    className={`toggle ${formEnabled ? 'on' : ''}`}
                    onClick={() => setFormEnabled(!formEnabled)}
                  >
                    <i />
                  </button>
                </div>
              </div>

              <div className="module-modal-footer" style={{ padding: '12px 20px' }}>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" icon="check">
                  {editingModule ? 'Salvar Alterações' : 'Criar Módulo'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
