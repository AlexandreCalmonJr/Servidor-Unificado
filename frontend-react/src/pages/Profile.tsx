import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'
import { useToast } from '../components/Toast'
import { mockProfiles, roleDefinitions, allPermissions } from '../data/roles'
import type { UserRole, UserProfileData } from '../types/rbac'

export function Profile() {
  const toast = useToast()
  const [activeRole, setActiveRole] = useState<UserRole>('root')
  const [profileData, setProfileData] = useState<UserProfileData>(mockProfiles.root)
  const [saved, setSaved] = useState(false)

  const handleRoleChange = (role: UserRole) => {
    setActiveRole(role)
    setProfileData(mockProfiles[role])
    toast.info(`Perfil visual alternado para: ${roleDefinitions[role].label}`)
  }

  const handleSave = () => {
    setSaved(true)
    toast.success('Alterações de perfil salvas com sucesso!')
    setTimeout(() => setSaved(false), 2400)
  }

  const handleTerminateOtherSessions = () => {
    toast.info('Todas as demais sessões ativas foram revogadas com sucesso.')
  }

  const roleMeta = roleDefinitions[activeRole]

  return (
    <div className="page-stack">
      {/* Seletor Dinâmico de Nível de Acesso (Role Switcher - Socratic Gate A1) */}
      <section className="panel" style={{ padding: '16px 20px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <strong style={{ fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="user" />
              Simulador de Nível de Usuário (Matriz RBAC):
            </strong>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Selecione qualquer cargo abaixo para visualizar os privilégios, restrições e painel de cada nível de acesso.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(Object.keys(roleDefinitions) as UserRole[]).map(roleKey => {
              const def = roleDefinitions[roleKey]
              const isCurrent = activeRole === roleKey
              return (
                <button
                  key={roleKey}
                  onClick={() => handleRoleChange(roleKey)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 20,
                    border: isCurrent ? '2px solid #0f172a' : '1px solid #cbd5e1',
                    background: isCurrent ? '#0f172a' : '#ffffff',
                    color: isCurrent ? '#ffffff' : '#334155',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s'
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background:
                        def.badgeTone === 'red'
                          ? '#ef4444'
                          : def.badgeTone === 'amber'
                          ? '#f59e0b'
                          : def.badgeTone === 'blue'
                          ? '#3b82f6'
                          : def.badgeTone === 'cyan'
                          ? '#06b6d4'
                          : '#10b981'
                    }}
                  />
                  {roleKey.toUpperCase()}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Layout de Perfil */}
      <div className="profile-layout">
        {/* Card Lateral do Usuário */}
        <aside className="panel profile-card">
          <span
            className="profile-avatar"
            style={{
              background:
                roleMeta.badgeTone === 'red'
                  ? '#fee2e2'
                  : roleMeta.badgeTone === 'amber'
                  ? '#fef3c7'
                  : roleMeta.badgeTone === 'blue'
                  ? '#eff6ff'
                  : roleMeta.badgeTone === 'cyan'
                  ? '#ecfeff'
                  : '#ecfdf5',
              color:
                roleMeta.badgeTone === 'red'
                  ? '#991b1b'
                  : roleMeta.badgeTone === 'amber'
                  ? '#92400e'
                  : roleMeta.badgeTone === 'blue'
                  ? '#1e40af'
                  : roleMeta.badgeTone === 'cyan'
                  ? '#0e7490'
                  : '#065f46',
              fontWeight: 800,
              fontSize: 22
            }}
          >
            {profileData.avatarInitials}
          </span>
          <h2>
            {profileData.name} {profileData.surname}
          </h2>
          <p style={{ fontWeight: 600, color: '#334155' }}>{profileData.roleTitle}</p>
          <div style={{ marginTop: 6 }}>
            <Status
              tone={
                roleMeta.badgeTone === 'red'
                  ? 'red'
                  : roleMeta.badgeTone === 'amber'
                  ? 'amber'
                  : roleMeta.badgeTone === 'blue'
                  ? 'blue'
                  : 'green'
              }
            >
              Nível: {roleMeta.label}
            </Status>
          </div>

          <p style={{ fontSize: 13, color: '#64748b', margin: '14px 0', lineHeight: 1.4 }}>
            {profileData.description}
          </p>

          <div className="profile-stats">
            <div>
              <strong>{profileData.memberSince}</strong>
              <span>Membro desde</span>
            </div>
            <div>
              <strong>{profileData.twoFactorEnabled ? '2FA Ativo' : 'Pendente'}</strong>
              <span>Autenticador TOTP</span>
            </div>
          </div>

          <div style={{ marginTop: 14, fontSize: 12, color: '#64748b', textAlign: 'left', width: '100%' }}>
            <div>IP de Origem: <code>{profileData.ipAddress}</code></div>
            <div style={{ marginTop: 4 }}>Último Acesso: <strong>{profileData.lastAccess}</strong></div>
          </div>

          <Button variant="secondary" icon="logout" onClick={handleTerminateOtherSessions} style={{ marginTop: 16 }}>
            Encerrar outras sessões ativas
          </Button>
        </aside>

        {/* Formulário & Matriz de Privilégios */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Matriz de Privilégios do Cargo Selecionado */}
          <section className="panel" style={{ padding: 20 }}>
            <div className="profile-section" style={{ marginBottom: 14 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="shield" />
                Matriz de Privilégios & Capacidades do Nível {activeRole.toUpperCase()}
              </h3>
              <p>Ações corporativas permitidas e restritas de acordo com a política de governança Zero-Trust.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              {allPermissions.map(perm => {
                const isAllowed = profileData.permissions.includes(perm.id)
                return (
                  <div
                    key={perm.id}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      border: isAllowed ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                      background: isAllowed ? '#f0fdf4' : '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 13, color: isAllowed ? '#166534' : '#64748b' }}>
                        {perm.name}
                      </strong>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: isAllowed ? '#dcfce7' : '#e2e8f0',
                          color: isAllowed ? '#15803d' : '#64748b'
                        }}
                      >
                        {isAllowed ? 'AUTORIZADO' : 'RESTRITO'}
                      </span>
                    </div>
                    <small style={{ color: isAllowed ? '#374151' : '#94a3b8', fontSize: 11, lineHeight: 1.3 }}>
                      {perm.description}
                    </small>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Dados Pessoais & Contato */}
          <section className="panel profile-form">
            <div className="profile-section">
              <h3>Informações Pessoais & Contato</h3>
              <p>Esses dados são visíveis para outros membros e auditores da organização.</p>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Nome</span>
                <input
                  value={profileData.name}
                  onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Sobrenome</span>
                <input
                  value={profileData.surname}
                  onChange={e => setProfileData({ ...profileData, surname: e.target.value })}
                />
              </label>
              <label className="field full">
                <span>E-mail corporativo</span>
                <input
                  value={profileData.email}
                  onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Cargo / Função</span>
                <input
                  value={profileData.roleTitle}
                  onChange={e => setProfileData({ ...profileData, roleTitle: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Setor / Lotação</span>
                <input
                  value={profileData.sector}
                  onChange={e => setProfileData({ ...profileData, sector: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Telefone corporativo</span>
                <input
                  value={profileData.phone}
                  onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                />
              </label>
            </div>

            <div className="profile-section divided">
              <h3>Preferências do Console</h3>
              <p>Configure idioma da interface, fuso horário e notificações críticas.</p>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Idioma da plataforma</span>
                <select defaultValue="pt-BR">
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (United States)</option>
                  <option value="es-ES">Español</option>
                </select>
              </label>
              <label className="field">
                <span>Fuso horário</span>
                <select defaultValue="America/Sao_Paulo">
                  <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                  <option value="America/Brasilia">Brasília (GMT-3)</option>
                  <option value="UTC">UTC (Universal Time)</option>
                </select>
              </label>
            </div>

            <div className="form-actions">
              <span className={saved ? 'save-message visible' : 'save-message'}>
                <Icon name="check" /> Alterações salvas com sucesso!
              </span>
              <Button onClick={handleSave}>Salvar alterações do perfil</Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
