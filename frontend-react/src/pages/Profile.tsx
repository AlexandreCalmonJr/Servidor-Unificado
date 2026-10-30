import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'

export function Profile() {
  const [saved, setSaved] = useState(false)
  const [name, setName] = useState('Lucas')
  const [surname, setSurname] = useState('Martins')
  const [email, setEmail] = useState('lucas@novara.com.br')
  const [role, setRole] = useState('Diretor de Tecnologia & CISO')
  const [phone, setPhone] = useState('+55 11 98888-1204')

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2400)
  }

  return (
    <div className="profile-layout">
      <aside className="panel profile-card">
        <span className="profile-avatar">LM</span>
        <h2>{name} {surname}</h2>
        <p>{role}</p>
        <Status tone="green">Conta Ativa & Verificada</Status>
        <div className="profile-stats">
          <div>
            <strong>18 jun 2024</strong>
            <span>Membro desde</span>
          </div>
          <div>
            <strong>2FA Ativo</strong>
            <span>Autenticador TOTP</span>
          </div>
        </div>
        <Button variant="secondary" icon="logout">
          Encerrar outras sessões ativas
        </Button>
      </aside>

      <section className="panel profile-form">
        <div className="profile-section">
          <h3>Informações Pessoais & Contato</h3>
          <p>Esses dados são visíveis para outros membros e auditores da organização.</p>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>Sobrenome</span>
            <input value={surname} onChange={(e) => setSurname(e.target.value)} />
          </label>
          <label className="field full">
            <span>E-mail corporativo</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span>Cargo / Função</span>
            <input value={role} onChange={(e) => setRole(e.target.value)} />
          </label>
          <label className="field">
            <span>Telefone corporativo</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
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
  )
}
