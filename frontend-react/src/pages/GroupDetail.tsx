import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'
import type { PageId } from '../types'

export function GroupDetail({ go }: { go: (p: PageId) => void }) {
  const [tab, setTab] = useState<'members' | 'policies' | 'rules'>('members')

  const groupMembers = [
    { id: 'NVR-MAC-0142', name: 'MacBook Pro — Mariana', os: 'macOS 15.5', owner: 'Mariana Costa', status: 'Conforme', tone: 'green' as const, seen: 'Agora' },
    { id: 'NVR-WIN-0084', name: 'Dell Latitude 7440', os: 'Windows 11', owner: 'Rafael Lima', status: 'Atenção', tone: 'amber' as const, seen: 'Há 8 min' },
    { id: 'NVR-WIN-0091', name: 'ThinkPad T14 Gen 4', os: 'Windows 11', owner: 'Carla Nogueira', status: 'Conforme', tone: 'green' as const, seen: 'Agora' },
    { id: 'NVR-MAC-0139', name: 'Mac mini M2', os: 'macOS 15.4', owner: 'Equipe Design', status: 'Conforme', tone: 'green' as const, seen: 'Há 1 h' },
  ]

  return (
    <div className="page-stack">
      <div className="detail-heading">
        <button onClick={() => go('groups')}>
          <Icon name="arrow" size={16} /> Voltar para grupos inteligentes
        </button>

        <div className="detail-device">
          <span className="detail-device-icon">
            <Icon name="grid" size={26} />
          </span>
          <div className="detail-device-info">
            <div className="detail-device-title-row">
              <h2>Departamento Financeiro & Controladoria</h2>
              <Status tone="green">Ativo & Sincronizado</Status>
            </div>
            <p>Grupo Dinâmico · 34 dispositivos associados · Regras automáticas ativas</p>
          </div>
        </div>

        <div className="detail-actions">
          <Button variant="secondary" icon="filter" onClick={() => go('groupRules')}>
            Editar Regras de Adesão
          </Button>
          <Button icon="plus" onClick={() => go('policyCreate')}>
            Atribuir Nova Política
          </Button>
        </div>
      </div>

      <div className="detail-tabs">
        <button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}>
          Dispositivos Membros (34)
        </button>
        <button className={tab === 'policies' ? 'active' : ''} onClick={() => setTab('policies')}>
          Políticas Vinculadas (6)
        </button>
        <button className={tab === 'rules' ? 'active' : ''} onClick={() => setTab('rules')}>
          Critérios de Adesão Dinâmica
        </button>
      </div>

      {tab === 'members' && (
        <section className="panel table-panel">
          <div className="table-header">
            <label className="search table-search">
              <Icon name="search" />
              <input placeholder="Buscar membro do grupo..." />
            </label>
            <Button variant="secondary" icon="download">
              Exportar Lista
            </Button>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Dispositivo</th>
                  <th>Sistema</th>
                  <th>Responsável</th>
                  <th>Status</th>
                  <th>Última Conexão</th>
                </tr>
              </thead>
              <tbody>
                {groupMembers.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <button className="device-cell device-link" onClick={() => go('device')}>
                        <span>
                          <Icon name="laptop" />
                        </span>
                        <div>
                          <strong>{d.name}</strong>
                          <small>{d.id}</small>
                        </div>
                      </button>
                    </td>
                    <td>{d.os}</td>
                    <td>{d.owner}</td>
                    <td>
                      <Status tone={d.tone}>{d.status}</Status>
                    </td>
                    <td>{d.seen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'policies' && (
        <div className="policy-grid">
          {[
            ['Proteção de dados — Departamento Financeiro', 'Dados', '100%'],
            ['Senha forte e bloqueio de tela automático', 'Acesso', '100%'],
            ['Criptografia de disco obrigatória (BitLocker/FileVault)', 'Segurança', '98,2%'],
            ['Isolamento de USB e mídias removíveis', 'Segurança', '100%'],
          ].map((p, i) => (
            <article className="panel policy-card" key={p[0]}>
              <div>
                <span className={`module-icon ${['green', 'blue', 'violet', 'cyan'][i]}`}>
                  <Icon name="shield" />
                </span>
                <button className="card-more">•••</button>
              </div>
              <h3>{p[0]}</h3>
              <Status tone="blue">{p[1]}</Status>
              <div className="policy-stats">
                <span>
                  <small>Conformidade do Grupo</small>
                  <strong>{p[2]}</strong>
                </span>
              </div>
              <div className="progress">
                <i className="os-green" style={{ width: p[2] }} />
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === 'rules' && (
        <article className="panel form-panel">
          <div className="form-heading">
            <span>CRITÉRIOS LÓGICOS DE AUTO-ADESÃO</span>
            <h3>Regras Ativas para este Grupo</h3>
            <p>Dispositivos que atendem a todas as condições abaixo são adicionados automaticamente.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="panel" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '14px', background: '#fafbfc' }}>
              <span className="mini-icon blue">1</span>
              <div>
                <strong>Departamento</strong> <em>é igual a</em> <strong style={{ color: 'var(--primary)' }}>Financeiro</strong>
              </div>
            </div>
            <div className="panel" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '14px', background: '#fafbfc' }}>
              <span className="mini-icon blue">2</span>
              <div>
                <strong>Propriedade do Ativo</strong> <em>é igual a</em> <strong style={{ color: 'var(--primary)' }}>Corporativo</strong>
              </div>
            </div>
            <div className="panel" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '14px', background: '#fafbfc' }}>
              <span className="mini-icon blue">3</span>
              <div>
                <strong>Agente MDM</strong> <em>versão maior ou igual a</em> <strong style={{ color: 'var(--primary)' }}>4.7.0</strong>
              </div>
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: '20px' }}>
            <Button variant="secondary" icon="filter" onClick={() => go('groupRules')}>
              Modificar Regras de Adesão
            </Button>
          </div>
        </article>
      )}
    </div>
  )
}
