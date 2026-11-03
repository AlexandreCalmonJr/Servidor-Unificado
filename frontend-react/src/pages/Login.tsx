import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Logo, Button } from '../components/UI'
import { loginSchema } from '../services/validation'
import { authStorage } from '../services/api'

export function Login({ onLogin }: { onLogin: () => void }) {
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFillDemo = () => {
    setEmail('admin@novara.com.br')
    setPassword('novara2025')
    setError('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validação estrita via Zod antes de qualquer processamento
    const validation = loginSchema.safeParse({ email, password })
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Dados de acesso inválidos.')
      return
    }

    setLoading(true)

    // Simulação segura com emissão de token de sessão temporário
    setTimeout(() => {
      authStorage.setToken('demo-session-token-' + Date.now())
      setLoading(false)
      onLogin()
    }, 350)
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
            <div
              role="alert"
              style={{
                color: 'var(--red)',
                backgroundColor: 'var(--red-soft, #fff0f1)',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Icon name="warning" size={15} />
              <span>{error}</span>
            </div>
          )}

          <label className="field">
            <span>E-mail corporativo</span>
            <input
              type="email"
              placeholder="exemplo@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="field">
            <span>Senha</span>
            <div className="password">
              <input
                type={show ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? 'Ocultar senha' : 'Exibir senha'}
              >
                <Icon name="eye" />
              </button>
            </div>
          </label>

          <div className="login-options" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label>
              <input type="checkbox" defaultChecked /> Lembrar de mim
            </label>
            <button
              type="button"
              onClick={handleFillDemo}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '11.5px',
                cursor: 'pointer',
                fontWeight: 600,
                padding: 0,
              }}
            >
              Preencher Demo
            </button>
          </div>

          <Button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Validando acesso...' : 'Entrar na plataforma'} <Icon name="arrow" />
          </Button>

          <div className="sso-divider">
            <span>ou continue com</span>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="sso-button"
            onClick={() => {
              authStorage.setToken('sso-azure-token-' + Date.now())
              onLogin()
            }}
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
