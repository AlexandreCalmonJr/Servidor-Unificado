import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button } from '../components/UI'
import type { PageId } from '../types'

export function Agent({ go }: { go: (p: PageId) => void }) {
  const [os, setOs] = useState('Windows')

  return (
    <div className="agent-layout">
      <section className="agent-hero">
        <div className="agent-badge">
          <Icon name="shield" size={27} />
        </div>
        <p className="eyebrow">AGENTE DE ENDPOINT UNIFICADO</p>
        <h2>
          Proteção silenciosa.
          <br />
          Controle absoluto.
        </h2>
        <p>
          O agente conecta computadores, servidores e totens à plataforma central, aplica políticas
          de conformidade e monitora a integridade sem interferir na produtividade do colaborador.
        </p>

        <div className="os-picker">
          {['Windows', 'macOS', 'Linux'].map((x) => (
            <button
              className={os === x ? 'active' : ''}
              onClick={() => setOs(x)}
              key={x}
              type="button"
            >
              {x}
            </button>
          ))}
        </div>

        <Button icon="download" onClick={() => go('downloads')}>
          Acessar central de downloads
        </Button>
        <small>Versão 4.8.2 · Compilação 64 bits · Atualizado em 12 jun 2025</small>
      </section>

      <section className="agent-preview">
        <div className="desktop-window">
          <div className="window-top">
            <div>
              <i />
              <i />
              <i />
            </div>
            <span>Novara Endpoint Agent</span>
            <Icon name="grid" size={15} />
          </div>

          <div className="window-body">
            <div className="window-brand">
              <span className="logo-mark">
                <span />
              </span>
              <strong>Novara MDM</strong>
            </div>

            <div className="protected-ring">
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" />
                <circle className="ring-progress" cx="60" cy="60" r="52" />
              </svg>
              <span>
                <Icon name="check" size={27} />
              </span>
            </div>

            <h3>Este dispositivo está protegido</h3>
            <p>Todas as verificações de conformidade e segurança estão em dia.</p>

            <div className="agent-stats">
              <div>
                <span>
                  <Icon name="shield" />
                </span>
                <p>
                  Proteção<strong>Ativa</strong>
                </p>
              </div>
              <div>
                <span>
                  <Icon name="check" />
                </span>
                <p>
                  Conformidade<strong>100%</strong>
                </p>
              </div>
              <div>
                <span>
                  <Icon name="clock" />
                </span>
                <p>
                  Última análise<strong>Agora</strong>
                </p>
              </div>
            </div>

            <button className="agent-action">Executar verificação manual</button>
            <small>Conectado ao Servidor Unificado HQ</small>
          </div>
        </div>

        <div className="feature-float one">
          <Icon name="check" />
          <span>
            <strong>Instalação silenciosa</strong>
            <small>Pronto em menos de 2 minutos via script</small>
          </span>
        </div>

        <div className="feature-float two">
          <Icon name="lock" />
          <span>
            <strong>Leve e seguro</strong>
            <small>Menos de 1% de uso médio de CPU</small>
          </span>
        </div>
      </section>
    </div>
  )
}
