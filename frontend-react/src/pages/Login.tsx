import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Logo, Button } from '../components/UI'

export function Login({ onLogin }: { onLogin: () => void }) {
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('admin@novara.com.br')
  const [password, setPassword] = useState('novara2025')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    // Simulação rápida ou integração direta
    setTimeout(() => {
      setLoading(false)
      onLogin()
    }, 400)
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <Logo dark />
        <div className="login-quote">
          <span>
            <Icon name="shield" size={24} />
          </span>
          <blockquote>
            “A segurança de todos os dispositivos,
            <br />
            em um só lugar.”
          </blockquote>
          <p>Gerencie. Proteja. Simplifique.</p>
        </div>
        <div className="brand-orbit">
          <i />
          <i />
          <i />
        </div>
        <small>© 2026 Servidor Unificado MDM · Todos os direitos reservados</small>
      </section>

      <section className="login-form-wrap">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="mobile-logo">
            <Logo />
          </div>
          <p className="eyebrow">BEM-VINDO DE VOLTA</p>
          <h1>Acesse sua conta</h1>
          <p>Insira seus dados para continuar na plataforma central.</p>

          {error && (
            <div style={{ color: 'var(--red)', fontSize: '11px', marginBottom: '14px' }}>
              {error}
            </div>
          )}

          <label className="field">
            <span>E-mail corporativo</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Senha</span>
            <div className="password">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label="Exibir senha"
              >
                <Icon name="eye" />
              </button>
            </div>
          </label>

          <div className="login-options">
            <label>
              <input type="checkbox" defaultChecked /> Lembrar de mim
            </label>
            <button type="button">Esqueci minha senha</button>
          </div>

          <Button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar na plataforma'} <Icon name="arrow" />
          </Button>

          <div className="sso-divider">
            <span>ou continue com</span>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="sso-button"
            onClick={onLogin}
          >
            <span className="ms-logo">
              <i />
              <i />
              <i />
              <i />
            </span>{' '}
            Microsoft Azure AD / Office 365
          </Button>

          <p className="login-help">
            Problemas para acessar? <button type="button">Fale com o suporte de TI</button>
          </p>
        </form>
      </section>
    </main>
  )
}
