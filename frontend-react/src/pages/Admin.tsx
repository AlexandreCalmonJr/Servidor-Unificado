import { Icon } from '../components/Icon'
import { Button, Status, TableTools } from '../components/UI'
import type { PageId } from '../types'

export function Admin({ go }: { go: (p: PageId) => void }) {
  const users = [
    ['Lucas Martins', 'lucas@novara.com.br', 'Super administrador', 'Todos os dispositivos', 'Agora'],
    ['Ana Ribeiro', 'ana@novara.com.br', 'Administradora de TI', 'Corporativo HQ', 'Há 18 min'],
    ['Pedro Souza', 'pedro@novara.com.br', 'Analista de segurança', 'Segurança & Auditoria', 'Ontem, 17:42'],
    ['Camila Freitas', 'camila@novara.com.br', 'Operador de Totens', 'Operações & Totens', '16 jun, 09:14'],
  ]

  return (
    <div className="page-stack">
      <div className="admin-tabs">
        <button className="active">Usuários e acesso</button>
        <button onClick={() => go('groups')}>Grupos inteligentes</button>
        <button onClick={() => go('policies')}>Políticas</button>
        <button onClick={() => go('server')}>Servidores</button>
        <button onClick={() => go('audit')}>Trilha de auditoria</button>
      </div>

      <div className="action-row">
        <div>
          <h2>Usuários da Organização & Credenciais</h2>
          <p>Gerencie administradores, operadores técnicos e níveis de acesso ao console central.</p>
        </div>
        <Button icon="plus" onClick={() => go('userCreate')}>
          Criar novo usuário
        </Button>
      </div>

      <section className="panel table-panel">
        <div className="table-header">
          <TableTools placeholder="Buscar usuário por nome ou e-mail..." />
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Função</th>
                <th>Grupos Vinculados</th>
                <th>Status</th>
                <th>Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u[1]}>
                  <td>
                    <div className="user-cell">
                      <span>
                        {u[0]
                          .split(' ')
                          .map((x) => x[0])
                          .join('')
                          .slice(0, 2)}
                      </span>
                      <div>
                        <strong>{u[0]}</strong>
                        <small>{u[1]}</small>
                      </div>
                    </div>
                  </td>
                  <td>{u[2]}</td>
                  <td>
                    <span className="group-pill">{u[3]}</span>
                  </td>
                  <td>
                    <Status tone={i === 3 ? 'blue' : 'green'}>
                      {i === 3 ? 'Convidado' : 'Ativo'}
                    </Status>
                  </td>
                  <td>{u[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="security-banner">
        <span>
          <Icon name="shield" />
        </span>
        <div>
          <strong>Autenticação em duas etapas (2FA) Obrigatória</strong>
          <p>3 de 4 administradores já estão com o aplicativo autenticador configurado.</p>
        </div>
        <Button variant="secondary" onClick={() => go('audit')}>
          Revisar conformidade de segurança
        </Button>
      </section>
    </div>
  )
}
