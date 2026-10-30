import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button } from '../components/UI'
import type { PageId } from '../types'

const provisioningSteps = [
  { title: 'Identificação', desc: 'Nome e responsável do dispositivo' },
  { title: 'Plataforma', desc: 'Sistema operacional e tipo de ativo' },
  { title: 'Configuração', desc: 'Perfil, grupo e políticas' },
  { title: 'Instalação', desc: 'Método de entrega do agente' },
]

export function Provisioning({ go }: { go: (p: PageId) => void }) {
  const [step, setStep] = useState(0)
  const [selectedPlatform, setSelectedPlatform] = useState(0)

  return (
    <div className="provision-layout">
      <aside className="step-list">
        <p className="eyebrow">NOVO DISPOSITIVO</p>
        <h2>Provisionamento guiado</h2>
        <p>Siga as etapas para deixar o dispositivo pronto, seguro e registrado no MDM.</p>
        {provisioningSteps.map((s, i) => (
          <button
            key={s.title}
            onClick={() => setStep(i)}
            className={i === step ? 'active' : i < step ? 'done' : ''}
          >
            <span>{i < step ? <Icon name="check" size={15} /> : i + 1}</span>
            <div>
              <strong>{s.title}</strong>
              <small>{s.desc}</small>
            </div>
          </button>
        ))}
      </aside>

      <section className="panel form-panel">
        <div className="form-heading">
          <span>ETAPA {step + 1} DE 4</span>
          <h3>{provisioningSteps[step].title}</h3>
          <p>{provisioningSteps[step].desc}</p>
        </div>

        {step === 0 && (
          <div className="form-grid">
            <label className="field full">
              <span>Nome do dispositivo</span>
              <input placeholder="Ex.: MacBook Pro — Mariana / Totem Recepção 01" />
            </label>
            <label className="field">
              <span>Responsável</span>
              <input placeholder="Buscar colaborador..." />
            </label>
            <label className="field">
              <span>Departamento</span>
              <select defaultValue="">
                <option value="" disabled>Selecionar departamento</option>
                <option>Tecnologia & TI</option>
                <option>Financeiro</option>
                <option>Design & Produto</option>
                <option>Operações & Totens</option>
              </select>
            </label>
            <label className="field full">
              <span>Nota interna <i>Opcional</i></span>
              <textarea placeholder="Adicione observações importantes para a equipe técnica..." />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="option-grid">
            {['macOS', 'Windows', 'iOS / iPadOS', 'Android', 'Linux / Totem Kiosk'].map((x, i) => (
              <button
                className={selectedPlatform === i ? 'selected' : ''}
                key={x}
                type="button"
                onClick={() => setSelectedPlatform(i)}
              >
                <span className="platform-icon">
                  <Icon name={i === 0 || i === 1 ? 'laptop' : i === 4 ? 'totem' : 'agent'} />
                </span>
                <strong>{x}</strong>
                <small>
                  {i === 0
                    ? 'Computadores Apple Silicon e Intel'
                    : i === 1
                    ? 'Windows 10 e 11 Pro / Enterprise'
                    : i === 4
                    ? 'Ubuntu / Debian Kiosk para totens'
                    : 'Dispositivos móveis corporativos'}
                </small>
                {selectedPlatform === i && (
                  <i className="selected-check">
                    <Icon name="check" size={13} />
                  </i>
                )}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="form-grid">
            <label className="field full">
              <span>Perfil de configuração</span>
              <select>
                <option>Padrão corporativo — Alta Segurança</option>
                <option>Equipe de Desenvolvimento</option>
                <option>Kiosk Mode — Totem de Autoatendimento</option>
                <option>Acesso Restrito — Financeiro</option>
              </select>
            </label>
            <label className="field">
              <span>Grupo de dispositivos</span>
              <select>
                <option>Todos os dispositivos</option>
                <option>Corporativo — São Paulo HQ</option>
                <option>Totens & Kiosks</option>
                <option>Dispositivos Móveis</option>
              </select>
            </label>
            <label className="field">
              <span>Política de segurança aplicada</span>
              <select>
                <option>Proteção Avançada (Criptografia + Firewall + 2FA)</option>
                <option>Proteção Padrão</option>
              </select>
            </label>
            <div className="info-box full">
              <Icon name="shield" />
              <div>
                <strong>6 políticas automáticas serão sincronizadas</strong>
                <p>Criptografia de disco, complexidade de senha, bloqueio automático, firewall e telemetria.</p>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="install-choice">
            <div className="install-hero">
              <span>
                <Icon name="rocket" size={26} />
              </span>
              <div>
                <h4>Pronto para provisionar</h4>
                <p>Geraremos um link seguro com token temporário e QR Code válido por 24 horas.</p>
              </div>
            </div>
            <label className="field">
              <span>E-mail para envio do convite</span>
              <input defaultValue="ti@novara.com.br" />
            </label>
            <div className="summary-box">
              <div>
                <span>Plataforma selecionada</span>
                <strong>{['macOS', 'Windows', 'iOS / iPadOS', 'Android', 'Linux Kiosk'][selectedPlatform]}</strong>
              </div>
              <div>
                <span>Perfil de segurança</span>
                <strong>Padrão corporativo — Alta Segurança</strong>
              </div>
              <div>
                <span>Políticas de conformidade</span>
                <strong>6 políticas vinculadas</strong>
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          <Button
            variant="ghost"
            onClick={() => (step > 0 ? setStep(step - 1) : go('assets'))}
          >
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </Button>
          <Button
            icon={step === 3 ? 'check' : 'arrow'}
            onClick={() => (step === 3 ? go('provisionQr') : setStep(Math.min(3, step + 1)))}
          >
            {step === 3 ? 'Gerar QR e Iniciar Inscrição' : 'Continuar'}
          </Button>
        </div>
      </section>
    </div>
  )
}
