import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'
import type { PageId } from '../types'

export function TotemDetail({ go }: { go: (p: PageId) => void }) {
  const [tab, setTab] = useState<'peripherals' | 'hardware' | 'kiosk' | 'logs'>('peripherals')
  const [rebooting, setRebooting] = useState(false)
  const [kioskLocked, setKioskLocked] = useState(false)

  const handleReboot = () => {
    setRebooting(true)
    setTimeout(() => setRebooting(false), 2000)
  }

  return (
    <div className="page-stack">
      <div className="detail-heading">
        <button onClick={() => go('totems')}>
          <Icon name="arrow" size={16} /> Voltar para lista de totens
        </button>

        <div className="detail-device">
          <span>
            <Icon name="totem" size={26} />
          </span>
          <div>
            <h2>Totem Recepção 01 — Unidade Central</h2>
            <p>TOT-REC-01 · Entrada Principal · Windows 11 IoT Enterprise</p>
          </div>
          <Status tone={kioskLocked ? 'amber' : 'green'}>
            {kioskLocked ? 'Modo Manutenção' : 'Online & Operacional'}
          </Status>
        </div>

        <div className="detail-actions">
          <Button
            variant="secondary"
            icon="warning"
            onClick={() => setKioskLocked(!kioskLocked)}
          >
            {kioskLocked ? 'Desbloquear Kiosk' : 'Modo Manutenção'}
          </Button>
          <Button variant="secondary" icon="clock" onClick={handleReboot}>
            {rebooting ? 'Reiniciando Kiosk...' : 'Reiniciar Kiosk'}
          </Button>
          <Button icon="terminal" onClick={() => go('commands')}>
            Comando Remoto
          </Button>
        </div>
      </div>

      <div className="detail-tabs">
        <button className={tab === 'peripherals' ? 'active' : ''} onClick={() => setTab('peripherals')}>
          Periféricos Integrados
        </button>
        <button className={tab === 'hardware' ? 'active' : ''} onClick={() => setTab('hardware')}>
          Hardware & Sensores
        </button>
        <button className={tab === 'kiosk' ? 'active' : ''} onClick={() => setTab('kiosk')}>
          Configuração da Aplicação
        </button>
        <button className={tab === 'logs' ? 'active' : ''} onClick={() => setTab('logs')}>
          Logs de Autoatendimento
        </button>
      </div>

      <section className="device-overview">
        <div className="page-stack">
          {tab === 'peripherals' && (
            <div className="group-cards" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <article className="panel" style={{ padding: '20px', flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="module-icon green">
                    <Icon name="grid" />
                  </span>
                  <div>
                    <h3>Tela Touch Screen Capacitiva</h3>
                    <p>Display 21.5" Full HD (1920x1080) · Toque multitoque 10 pontos</p>
                  </div>
                  <Status tone="green">Calibrada</Status>
                </div>
                <div style={{ marginTop: '14px', borderTop: '1px solid var(--line)', paddingTop: '10px', fontSize: '9px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sensibilidade: 100%</span>
                  <span>Driver USB HID: Ativo</span>
                  <span>Último toque: Há 12 segundos</span>
                </div>
              </article>

              <article className="panel" style={{ padding: '20px', flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="module-icon green">
                    <Icon name="printer" />
                  </span>
                  <div>
                    <h3>Impressora Térmica de Senhas/Recibos</h3>
                    <p>Mecanismo 80mm com guilhotina automática · USB/Serial</p>
                  </div>
                  <Status tone="green">Papel OK (82%)</Status>
                </div>
                <div style={{ marginTop: '14px', borderTop: '1px solid var(--line)', paddingTop: '10px', fontSize: '9px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Bobina: 82% restante</span>
                  <span>Guilhotina: 100% funcional</span>
                  <span>Temp. Cabeçote: 38 °C</span>
                </div>
              </article>

              <article className="panel" style={{ padding: '20px', flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="module-icon green">
                    <Icon name="lock" />
                  </span>
                  <div>
                    <h3>Pinpad TEF / Leitor de Cartão</h3>
                    <p>Homologado EMV, Tarja Magnética e NFC/Contactless</p>
                  </div>
                  <Status tone="green">Operacional</Status>
                </div>
                <div style={{ marginTop: '14px', borderTop: '1px solid var(--line)', paddingTop: '10px', fontSize: '9px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Porta: COM3 (Serial)</span>
                  <span>DUKPT: Chaves ativas</span>
                  <span>Versão Firmware: v2.4.1</span>
                </div>
              </article>

              <article className="panel" style={{ padding: '20px', flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="module-icon green">
                    <Icon name="blocks" />
                  </span>
                  <div>
                    <h3>Leitor de Código de Barras & QR</h3>
                    <p>Sensor óptico 2D omnidirecional de alta velocidade</p>
                  </div>
                  <Status tone="green">Pronto</Status>
                </div>
                <div style={{ marginTop: '14px', borderTop: '1px solid var(--line)', paddingTop: '10px', fontSize: '9px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Modo: Leitura contínua</span>
                  <span>LED Iluminação: Ativo</span>
                  <span>Leituras hoje: 184</span>
                </div>
              </article>
            </div>
          )}

          {tab === 'hardware' && (
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3>Telemetria de Hardware do Totem</h3>
                  <p>Processador, placa-mãe industrial e sensores térmicos</p>
                </div>
              </div>
              <div className="info-grid">
                {[
                  ['Processador', 'Intel Core i3-1215U (6 cores, até 4.4 GHz)'],
                  ['Memória RAM', '8 GB DDR4 3200 MHz (38% em uso)'],
                  ['Armazenamento SSD', '64 GB M.2 NVMe (14 GB usados / 50 GB livres)'],
                  ['Temperatura da CPU', '42 °C (Faixa operacional segura)'],
                  ['Endereço IP', '10.42.15.80 (VLAN 40 - Totens de Autoatendimento)'],
                  ['MAC Address', '00:1E:67:88:9F:12'],
                  ['Fonte de Alimentação', '12V / 5A DC Industrial (Tensão estável)'],
                  ['Gabinete / Trava', 'Chassi de aço carbono com sensor de abertura fechado'],
                ].map((x) => (
                  <div key={x[0]}>
                    <span>{x[0]}</span>
                    <strong>{x[1]}</strong>
                  </div>
                ))}
              </div>
            </article>
          )}

          {tab === 'kiosk' && (
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3>Parâmetros da Aplicação Kiosk</h3>
                  <p>Configuração do navegador em tela cheia e restrições de navegação</p>
                </div>
                <button className="text-link">Editar URL</button>
              </div>
              <div className="info-grid">
                {[
                  ['URL Inicial da Aplicação', 'https://autoatendimento.hospital.corp/triagem-v2'],
                  ['Navegador Kiosk', 'Microsoft Edge Kiosk Mode (Chromium)'],
                  ['Modo de Execução', 'Tela cheia exclusiva (Alt+Tab, Windows Key desabilitados)'],
                  ['Timeout de Inatividade', '60 segundos (Retorno automático à tela inicial)'],
                  ['Limpeza de Cookies/Sessão', 'A cada encerramento de atendimento do paciente'],
                  ['Teclado Virtual na Tela', 'Habilitado automaticamente nos campos de formulário'],
                ].map((x) => (
                  <div key={x[0]}>
                    <span>{x[0]}</span>
                    <strong>{x[1]}</strong>
                  </div>
                ))}
              </div>
            </article>
          )}

          {tab === 'logs' && (
            <article className="panel timeline-panel">
              <h3>Histórico de Eventos do Kiosk</h3>
              {[
                { title: 'Atendimento concluído com emissão de senha', desc: 'Protocolo #A-892 emitido na impressora térmica', time: 'Há 2 min' },
                { title: 'Leitura de Cartão SUS / Convênio realizada', desc: 'Leitor óptico 2D identificou QR Code com sucesso', time: 'Há 6 min' },
                { title: 'Ping de telemetria recebido pelo console', desc: 'Todos os 4 periféricos responderam com código 200 OK', time: 'Há 15 min' },
                { title: 'Sessão reiniciada por inatividade', desc: 'Retorno seguro para a página inicial da recepção', time: 'Há 32 min' },
              ].map((l) => (
                <div className="timeline-item" key={l.title}>
                  <i />
                  <div>
                    <strong>{l.title}</strong>
                    <p>{l.desc}</p>
                    <time>{l.time}</time>
                  </div>
                </div>
              ))}
            </article>
          )}
        </div>

        <aside className="page-stack">
          <article className="panel quick-info">
            <h3>Status em Tempo Real</h3>
            <div>
              <span>Status Operacional</span>
              <strong style={{ color: 'var(--green)' }}>100% Ativo</strong>
            </div>
            <div>
              <span>Uptime Contínuo</span>
              <strong>14d 06h 42m</strong>
            </div>
            <div>
              <span>Última Comunicação</span>
              <strong>Agora (WebSocket)</strong>
            </div>
            <div>
              <span>Atendimentos Hoje</span>
              <strong>312 emissões</strong>
            </div>
            <div>
              <span>Papel Térmico</span>
              <strong>82% restante</strong>
            </div>
          </article>

          <article className="security-banner" style={{ background: 'var(--primary-soft)' }}>
            <span>
              <Icon name="shield" />
            </span>
            <div>
              <strong>Modo Kiosk Protegido</strong>
              <p>O acesso ao sistema operacional subjacente está bloqueado por política MDM.</p>
            </div>
          </article>
        </aside>
      </section>
    </div>
  )
}
