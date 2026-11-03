import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Icon } from './Icon'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  fallbackMessage?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Registro seguro de telemetria sem expor dados sensíveis ao console do usuário
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary caught]:', error, errorInfo)
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            padding: '32px 24px',
            margin: '24px auto',
            maxWidth: '640px',
            borderRadius: '12px',
            border: '1px solid rgba(227, 95, 103, 0.3)',
            background: 'var(--surface, #ffffff)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--red-soft, #fff0f1)',
              color: 'var(--red, #e35f67)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <Icon name="warning" size={24} />
          </div>

          <h3
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--ink, #182034)',
              margin: '0 0 8px',
            }}
          >
            {this.props.fallbackTitle || 'Ocorreu uma falha inesperada na interface'}
          </h3>

          <p
            style={{
              fontSize: '13px',
              color: 'var(--muted, #6f788c)',
              margin: '0 auto 20px',
              lineHeight: 1.5,
              maxWidth: '480px',
            }}
          >
            {this.props.fallbackMessage ||
              'A execução deste módulo foi contida com segurança para proteger o restante do sistema. Você pode recarregar o módulo abaixo.'}
          </p>

          {this.state.error && import.meta.env.DEV && (
            <details
              style={{
                marginBottom: '20px',
                textAlign: 'left',
                background: 'var(--canvas, #f6f7fa)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '11px',
                color: 'var(--red, #e35f67)',
                overflowX: 'auto',
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                Detalhes técnicos (Modo Desenvolvimento)
              </summary>
              <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>
                {this.state.error.message}
              </pre>
            </details>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={this.handleReset}
              className="btn btn-primary"
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Recarregar Módulo
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
