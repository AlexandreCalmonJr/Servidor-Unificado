import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button } from '../components/UI'
import type { PageId } from '../types'

export function PolicyCreate({ go }: { go: (p: PageId) => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Segurança')
  const [encryption, setEncryption] = useState(true)
  const [firewall, setFirewall] = useState(true)
  const [blockUsb, setBlockUsb] = useState(false)
  const [autoUpdates, setAutoUpdates] = useState(true)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => {
      go('policies')
    }, 1200)
  }

  return (
    <div className="provision-layout" style={{ gridTemplateColumns: 'minmax(0, 780px) 300px' }}>
      <section className="panel form-panel">
        <div className="form-heading">
          <span>NOVA POLÍTICA CORPORATIVA</span>
          <h3>Definir Padrões de Segurança & Conformidade</h3>
          <p>Estabeleça regras obrigatórias de integridade e proteção para a frota.</p>
        </div>

        <div className="form-grid">
          <label className="field full">
            <span>Nome da Política</span>
            <input
              placeholder="Ex.: Baseline de Segurança — Estações de Trabalho"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Categoria</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Segurança">Segurança & Endpoint</option>
              <option value="Acesso">Acesso & Senhas</option>
              <option value="Sistema">Atualizações de Sistema</option>
              <option value="Dados">Proteção de Dados & DLP</option>
              <option value="Totem">Kiosk & Autoatendimento</option>
            </select>
          </label>

          <label className="field">
            <span>Grupo Alvo de Aplicação</span>
            <select>
              <option>Todos os dispositivos corporativos</option>
              <option>Departamento Financeiro</option>
              <option>Engenharia & TI</option>
              <option>Totens Kiosk de Autoatendimento</option>
              <option>Dispositivos Móveis BYOD</option>
            </select>
          </label>

          <div className="full" style={{ borderTop: '1px solid var(--line)', paddingTop: '20px', marginTop: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: '14px' }}>
              Regras e Restrições de Conformidade
            </span>

            <div className="permission-list">
              <label>
                <span>
                  <strong>Criptografia de Disco Obrigatória</strong>
                  <small>Força ativação do BitLocker (Windows), FileVault (macOS) ou LUKS (Linux).</small>
                </span>
                <input
                  type="checkbox"
                  checked={encryption}
                  onChange={(e) => setEncryption(e.target.checked)}
                />
              </label>

              <label>
                <span>
                  <strong>Firewall do Sistema Operacional Sempre Ativo</strong>
                  <small>Bloqueia portas de entrada não autorizadas fora da rede corporativa.</small>
                </span>
                <input
                  type="checkbox"
                  checked={firewall}
                  onChange={(e) => setFirewall(e.target.checked)}
                />
              </label>

              <label>
                <span>
                  <strong>Bloqueio de Mídias Removíveis e Pendrives USB</strong>
                  <small>Impede a extração não autorizada de dados corporativos via USB.</small>
                </span>
                <input
                  type="checkbox"
                  checked={blockUsb}
                  onChange={(e) => setBlockUsb(e.target.checked)}
                />
              </label>

              <label>
                <span>
                  <strong>Atualizações de Segurança Automáticas</strong>
                  <small>Aplica patches críticos do sistema sem necessidade de intervenção do usuário.</small>
                </span>
                <input
                  type="checkbox"
                  checked={autoUpdates}
                  onChange={(e) => setAutoUpdates(e.target.checked)}
                />
              </label>
            </div>
          </div>

          <label className="field">
            <span>Complexidade Mínima de Senha</span>
            <select defaultValue="12">
              <option value="8">8 caracteres (Mínimo padrão)</option>
              <option value="12">12 caracteres + Números + Símbolos (Recomendado)</option>
              <option value="16">16 caracteres (Alta segurança)</option>
            </select>
          </label>

          <label className="field">
            <span>Tempo Limite para Bloqueio de Tela</span>
            <select defaultValue="5">
              <option value="1">1 minuto de inatividade</option>
              <option value="5">5 minutos de inatividade</option>
              <option value="15">15 minutos de inatividade</option>
            </select>
          </label>
        </div>

        <div className="form-actions">
          <Button variant="ghost" onClick={() => go('policies')}>
            Cancelar
          </Button>
          <Button icon="check" onClick={handleSave} disabled={!name}>
            {saved ? 'Política Criada!' : 'Salvar e Publicar Política'}
          </Button>
        </div>
      </section>

      <aside className="create-help">
        <span>
          <Icon name="shield" />
        </span>
        <h3>Conformidade Automatizada</h3>
        <p>Ao publicar uma nova política:</p>
        <ul>
          <li>O agente MDM valida as configurações a cada 5 minutos</li>
          <li>Dispositivos fora do padrão recebem alerta de 'Atenção'</li>
          <li>Ações corretivas podem ser disparadas automaticamente</li>
        </ul>
      </aside>
    </div>
  )
}
