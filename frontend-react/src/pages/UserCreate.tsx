import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button } from '../components/UI'
import type { PageId } from '../types'

export function UserCreate({ go }: { go: (p: PageId) => void }) {
  const [done, setDone] = useState(false)
  const [email, setEmail] = useState('')

  if (done) {
    return (
      <section className="panel success-state">
        <span>
          <Icon name="check" size={32} />
        </span>
        <h2>Usuário cadastrado com sucesso!</h2>
        <p>
          O convite seguro foi despachado para <strong>{email || 'colaborador@novara.com.br'}</strong> e será válido
          por 72 horas para definição de senha e configuração do 2FA.
        </p>
        <Button onClick={() => go('admin')}>Voltar para lista de usuários</Button>
      </section>
    )
  }

  return (
    <div className="create-user-layout">
      <section className="panel profile-form">
        <div className="form-heading">
          <span>DADOS DO COLABORADOR</span>
          <h3>Informações básicas</h3>
          <p>Preencha os dados e defina o escopo de atuação na plataforma.</p>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Nome</span>
            <input placeholder="Ex.: Ana" />
          </label>
          <label className="field">
            <span>Sobrenome</span>
            <input placeholder="Ex.: Silva" />
          </label>
          <label className="field full">
            <span>E-mail corporativo</span>
            <input
              placeholder="ana.silva@empresa.com.br"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Função no sistema</span>
            <select>
              <option>Administrador de TI</option>
              <option>Analista de Segurança</option>
              <option>Operador de Totens & Kiosks</option>
              <option>Suporte de Impressoras</option>
              <option>Visualizador de Relatórios</option>
            </select>
          </label>
          <label className="field">
            <span>Departamento</span>
            <select>
              <option>Tecnologia da Informação</option>
              <option>Operações de Campo</option>
              <option>Financeiro</option>
            </select>
          </label>
        </div>

        <div className="profile-section divided">
          <h3>Permissões de Acesso</h3>
          <p>Selecione as ações autorizadas para esta conta.</p>
        </div>

        <div className="permission-list">
          {[
            'Gerenciar dispositivos e inventário de hardware',
            'Executar comandos remotos e scripts de terminal',
            'Monitorar totens de autoatendimento e periféricos',
            'Gerenciar suprimentos e alertas de impressoras',
            'Visualizar relatórios e trilha de auditoria',
            'Gerenciar contas de usuários e permissões globais',
          ].map((x, i) => (
            <label key={x}>
              <span>
                <strong>{x}</strong>
                <small>
                  {i < 4
                    ? 'Acesso operacional aos ativos designados.'
                    : 'Acesso às informações de governança e segurança.'}
                </small>
              </span>
              <input type="checkbox" defaultChecked={i < 4} />
            </label>
          ))}
        </div>

        <div className="form-actions">
          <Button variant="ghost" onClick={() => go('admin')}>
            Cancelar
          </Button>
          <Button icon="plus" onClick={() => setDone(true)}>
            Criar conta e enviar convite
          </Button>
        </div>
      </section>

      <aside className="create-help">
        <span>
          <Icon name="shield" />
        </span>
        <h3>Acesso Seguro com Zero-Trust</h3>
        <p>O novo usuário receberá um convite por e-mail com link temporário para registrar seu fator de autenticação.</p>
        <ul>
          <li>Link válido por 72 horas</li>
          <li>2FA obrigatório para funções administrativas</li>
          <li>Ações auditadas com IP e carimbo de data/hora</li>
        </ul>
      </aside>
    </div>
  )
}
