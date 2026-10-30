import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button } from '../components/UI'
import type { PageId } from '../types'

export function ProvisionQr({ go }: { go: (p: PageId) => void }) {
  const [expires, setExpires] = useState('23h 59min')
  const [copied, setCopied] = useState(false)

  return (
    <div className="qr-layout">
      <section className="panel qr-main">
        <div className="qr-success">
          <span>
            <Icon name="check" size={25} />
          </span>
          <div>
            <h2>Perfil de provisionamento gerado com sucesso</h2>
            <p>Aponte a câmera do dispositivo móvel ou totem para o código abaixo para registrar o ativo.</p>
          </div>
        </div>

        <div className="qr-content">
          <div className="qr-code">
            <i />
            <i />
            <i />
            <span />
          </div>
          <div className="qr-instructions">
            <p className="eyebrow">INSCRIÇÃO RÁPIDA (ZERO-TOUCH)</p>
            <h3>Leia o QR code no dispositivo</h3>
            <ol>
              <li>
                <span>1</span>
                <p>Abra o leitor de QR ou câmera do dispositivo no assistente de boas-vindas.</p>
              </li>
              <li>
                <span>2</span>
                <p>Toque no link seguro de auto-inscrição do Servidor Unificado.</p>
              </li>
              <li>
                <span>3</span>
                <p>Confirme o download e a ativação automática do perfil de gerenciamento.</p>
              </li>
            </ol>
            <div className="expire-note">
              <Icon name="clock" />
              <span>
                Este token de inscrição expira em <strong>{expires}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="qr-link">
          <div>
            <span>LINK SEGURO DE INSCRIÇÃO</span>
            <strong>https://mdm.novara.corp/enroll/nvr-8K2M-4P9Q-SU2026</strong>
          </div>
          <Button
            variant="secondary"
            icon="blocks"
            onClick={() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1600)
            }}
          >
            {copied ? 'Link copiado!' : 'Copiar link'}
          </Button>
        </div>

        <div className="form-actions">
          <Button variant="ghost" onClick={() => go('provisioning')}>
            Voltar ao assistente
          </Button>
          <div>
            <Button variant="secondary" onClick={() => setExpires('24h 00min')}>
              Gerar novo código
            </Button>
            <Button icon="check" onClick={() => go('assets')}>
              Concluir e ver ativos
            </Button>
          </div>
        </div>
      </section>

      <aside className="page-stack">
        <article className="panel qr-summary">
          <h3>Resumo da credencial</h3>
          {[
            ['Plataforma', 'iOS / iPadOS / Android'],
            ['Perfil', 'Padrão corporativo — Alta Segurança'],
            ['Grupo de destino', 'Dispositivos Corporativos HQ'],
            ['Políticas ativas', '6 políticas de segurança'],
            ['Administrador', 'Lucas Martins'],
            ['Assinatura Digital', 'SHA-256 (RSA 2048)'],
          ].map((x) => (
            <div key={x[0]}>
              <span>{x[0]}</span>
              <strong>{x[1]}</strong>
            </div>
          ))}
        </article>

        <article className="security-banner qr-security">
          <span>
            <Icon name="shield" />
          </span>
          <div>
            <strong>Inscrição Criptografada</strong>
            <p>O token de provisionamento é estritamente de uso único e revogado após o primeiro pareamento.</p>
          </div>
        </article>
      </aside>
    </div>
  )
}
