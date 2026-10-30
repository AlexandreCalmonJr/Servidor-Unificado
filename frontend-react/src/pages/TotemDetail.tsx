import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import type { PageId } from '../types'

interface TotemLog {
  title: string
  desc: string
  time: string
}

export function TotemDetail({ go }: { go: (p: PageId) => void }) {
  const [tab, setTab] = useState<'peripherals' | 'hardware' | 'kiosk' | 'logs'>('peripherals')
  const [rebooting, setRebooting] = useState(false)
  const [kioskLocked, setKioskLocked] = useState(false)
  const [testPrinting, setTestPrinting] = useState(false)
  const [calibratingTouch, setCalibratingTouch] = useState(false)
  const [testingPinpad, setTestingPinpad] = useState(false)
  const [beepingScanner, setBeepingScanner] = useState(false)

  // Configurações do Kiosk
  const [kioskUrl, setKioskUrl] = useState('https://autoatendimento.hospital.corp/triagem-v2')
  const [timeoutSeconds, setTimeoutSeconds] = useState(60)
  const [watchdogSeconds, setWatchdogSeconds] = useState(30)
  const [virtualKeyboard, setVirtualKeyboard] = useState(true)
  const [clearCookies, setClearCookies] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Métricas e Logs
  const [paperRemaining, setPaperRemaining] = useState(82)
  const [ticketCount, setTicketCount] = useState(312)
  const [logs, setLogs] = useState<TotemLog[]>([
    { title: 'Atendimento concluído com emissão de senha', desc: 'Protocolo #A-892 emitido na impressora térmica', time: 'Há 2 min' },
    { title: 'Leitura de Cartão SUS / Convênio realizada', desc: 'Leitor óptico 2D identificou QR Code com sucesso', time: 'Há 6 min' },
    { title: 'Ping de telemetria recebido pelo console', desc: 'Todos os 4 periféricos responderam com código 200 OK', time: 'Há 15 min' },
    { title: 'Sessão reiniciada por inatividade', desc: 'Retorno seguro para a página inicial da recepção', time: 'Há 32 min' },
  ])

  const toast = useToast()

  const addLog = (title: string, desc: string) => {
    setLogs((prev) => [{ title, desc, time: 'Agora mesmo' }, ...prev])
  }

  const handleToggleMaintenance = () => {
    const next = !kioskLocked
    setKioskLocked(next)
    if (next) {
      toast.warning('Totem colocado em MODO MANUTENÇÃO. O Kiosk foi desbloqueado localmente para o técnico.')
      addLog('Modo Manutenção Ativado', 'Console liberado temporariamente para intervenção técnica presencial')
    } else {
      toast.success('Totem colocado em OPERAÇÃO. Modo Kiosk tela cheia restaurado e bloqueado.')
      addLog('Modo Kiosk Restaurado', 'Sistema operacional travado e tela de autoatendimento reaberta')
    }
  }

  const handleReboot = () => {
    setRebooting(true)
    toast.info('Enviando comando de reinicialização para o Totem...')
    addLog('Comando de Reboot Enviado', 'Reinicialização do sistema operacional agendada pelo console')
    setTimeout(() => {
      setRebooting(false)
      toast.success('Totem reiniciado com sucesso! Telemetria restabelecida em 12 segundos.')
    }, 2000)
  }

  const handlePrintTestTicket = () => {
    setTestPrinting(true)
    toast.info('Disparando impressão de teste na impressora térmica...')
    setTimeout(() => {
      setTestPrinting(false)
      setTicketCount((c) => c + 1)
      setPaperRemaining((p) => Math.max(0, p - 1))
      toast.success('Ticket de teste impresso com sucesso! Guilhotina acionada.')
      addLog('Impressão de Teste Concluída', 'Ticket de validação de bobina e corte de papel executado')
    }, 1200)
  }

  const handleCalibrateTouch = () => {
    setCalibratingTouch(true)
    toast.info('Enviando rotina de alinhamento para o painel touch...')
    setTimeout(() => {
      setCalibratingTouch(false)
      toast.success('Tela capacitiva recalibrada com sucesso nos 10 pontos de contato.')
      addLog('Calibração de Touch Realizada', 'Sinal de referência multitoque sincronizado')
    }, 1000)
  }

  const handleTestPinpad = () => {
    setTestingPinpad(true)
    toast.info('Testando canal de comunicação TEF e chaves DUKPT...')
    setTimeout(() => {
      setTestingPinpad(false)
      toast.success('Pinpad COM3 operacional: Chaves DUKPT ativas, conexão com adquirente OK.')
      addLog('Teste de Pinpad TEF OK', 'Homologação de chaves criptográficas bem-sucedida')
    }, 1200)
  }

  const handleTestScanner = () => {
    setBeepingScanner(true)
    toast.info('Emitindo comando de bipe sonoro e acionamento do LED...')
    setTimeout(() => {
      setBeepingScanner(false)
      toast.success('Leitor óptico 2D respondeu com bipe sonoro de confirmação!')
      addLog('Teste de Leitor 2D Concluído', 'Sinal sonoro disparado no gabinete do totem')
    }, 800)
  }

  const handleSaveKioskConfig = (e: React.FormEvent) => {
    e.preventDefault()
    setEditModalOpen(false)
    toast.success('Parâmetros da aplicação Kiosk atualizados e sincronizados no totem!')
    addLog('Parâmetros Kiosk Atualizados', `Nova URL configurada: ${kioskUrl}`)
  }

  return (
    <div className="page-stack">
      <div className="detail-heading">
        <button onClick={() => go('totems')}>
          <Icon name="arrow" size={16} /> Voltar para lista de totens
        </button>

        <div className="detail-device">
          <span className="detail-device-icon">
            <Icon name="totem" size={26} />
          </span>
          <div className="detail-device-info">
            <div className="detail-device-title-row">
              <h2>Totem Recepção 01 — Unidade Central</h2>
              <Status tone={kioskLocked ? 'amber' : 'green'}>
                {kioskLocked ? 'Modo Manutenção' : 'Online & Operacional'}
              </Status>
            </div>
            <p>TOT-REC-01 · Entrada Principal · Windows 11 IoT Enterprise · IP: 10.42.15.80</p>
          </div>
        </div>

        <div className="detail-actions">
          <Button
            variant="secondary"
            icon="warning"
            onClick={handleToggleMaintenance}
          >
            {kioskLocked ? 'Restaurar Kiosk' : 'Modo Manutenção'}
          </Button>
          <Button variant="secondary" icon="refresh" onClick={handleReboot} disabled={rebooting}>
            {rebooting ? 'Reiniciando Kiosk...' : 'Reiniciar Kiosk'}
          </Button>
          <Button variant="secondary" icon="sliders" onClick={() => setEditModalOpen(true)}>
            Configurar Kiosk
          </Button>
          <Button icon="terminal" onClick={() => go('commands')}>
            Comando Remoto
          </Button>
        </div>
      </div>

      <div className="detail-tabs">
        <button className={tab === 'peripherals' ? 'active' : ''} onClick={() => setTab('peripherals')}>
          Periféricos Integrados (4)
        </button>
        <button className={tab === 'hardware' ? 'active' : ''} onClick={() => setTab('hardware')}>
          Hardware & Sensores
        </button>
        <button className={tab === 'kiosk' ? 'active' : ''} onClick={() => setTab('kiosk')}>
          Configuração da Aplicação
        </button>
        <button className={tab === 'logs' ? 'active' : ''} onClick={() => setTab('logs')}>
          Logs de Autoatendimento ({logs.length})
        </button>
      </div>

      <section className="device-overview">
        <div className="page-stack">
          {tab === 'peripherals' && (
            <div className="group-cards" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {/* Periférico 1: Touch Screen */}
              <article className="panel" style={{ padding: '20px', flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="module-icon green">
                    <Icon name="grid" />
                  </span>
                  <div style={{ flex: 1 }}>
                    <h3>Tela Touch Screen Capacitiva</h3>
                    <p>Display 21.5" Full HD (1920x1080) · Toque multitoque 10 pontos</p>
                  </div>
                  <Status tone="green">Calibrada</Status>
                </div>
                <div style={{ marginTop: '14px', borderTop: '1px solid var(--line)', paddingTop: '10px', fontSize: '10px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Sensibilidade: 100% · Driver USB HID: Ativo</span>
                  <Button variant="secondary" icon="refresh" onClick={handleCalibrateTouch} disabled={calibratingTouch}>
                    {calibratingTouch ? 'Calibrando...' : 'Calibrar Touch'}
                  </Button>
                </div>
              </article>

              {/* Periférico 2: Impressora Térmica */}
              <article className="panel" style={{ padding: '20px', flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="module-icon green">
                    <Icon name="printer" />
                  </span>
                  <div style={{ flex: 1 }}>
                    <h3>Impressora Térmica de Senhas/Recibos</h3>
                    <p>Mecanismo 80mm com guilhotina automática · USB/Serial</p>
                  </div>
                  <Status tone={paperRemaining < 20 ? 'amber' : 'green'}>
                    Papel OK ({paperRemaining}%)
                  </Status>
                </div>
                <div style={{ marginTop: '14px', borderTop: '1px solid var(--line)', paddingTop: '10px', fontSize: '10px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Bobina: {paperRemaining}% restante · Temp: 38 °C</span>
                  <Button variant="secondary" icon="printer" onClick={handlePrintTestTicket} disabled={testPrinting}>
                    {testPrinting ? 'Imprimindo...' : 'Emitir Ticket Teste'}
                  </Button>
                </div>
              </article>

              {/* Periférico 3: Pinpad TEF */}
              <article className="panel" style={{ padding: '20px', flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="module-icon green">
                    <Icon name="lock" />
                  </span>
                  <div style={{ flex: 1 }}>
                    <h3>Pinpad TEF / Leitor de Cartão</h3>
                    <p>Homologado EMV, Tarja Magnética e NFC/Contactless</p>
                  </div>
                  <Status tone="green">Operacional</Status>
                </div>
                <div style={{ marginTop: '14px', borderTop: '1px solid var(--line)', paddingTop: '10px', fontSize: '10px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Porta: COM3 · Chaves DUKPT: Ativas</span>
                  <Button variant="secondary" icon="check" onClick={handleTestPinpad} disabled={testingPinpad}>
                    {testingPinpad ? 'Validando...' : 'Testar Chaves'}
                  </Button>
                </div>
              </article>

              {/* Periférico 4: Leitor de Código de Barras */}
              <article className="panel" style={{ padding: '20px', flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="module-icon green">
                    <Icon name="blocks" />
                  </span>
                  <div style={{ flex: 1 }}>
                    <h3>Leitor de Código de Barras & QR</h3>
                    <p>Sensor óptico 2D omnidirecional de alta velocidade</p>
                  </div>
                  <Status tone="green">Pronto</Status>
                </div>
                <div style={{ marginTop: '14px', borderTop: '1px solid var(--line)', paddingTop: '10px', fontSize: '10px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Modo: Leitura contínua · Leituras: {ticketCount}</span>
                  <Button variant="secondary" icon="pulse" onClick={handleTestScanner} disabled={beepingScanner}>
                    {beepingScanner ? 'Bipando...' : 'Disparar Bip'}
                  </Button>
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
                <Button variant="secondary" icon="edit" onClick={() => setEditModalOpen(true)}>
                  Editar Parâmetros
                </Button>
              </div>
              <div className="info-grid">
                {[
                  ['URL Inicial da Aplicação', kioskUrl],
                  ['Navegador Kiosk', 'Microsoft Edge Kiosk Mode (Chromium Enterprise)'],
                  ['Modo de Execução', 'Tela cheia exclusiva (Alt+Tab, Tecla Windows desabilitados)'],
                  ['Timeout de Inatividade', `${timeoutSeconds} segundos (Retorno automático à tela inicial)`],
                  ['Watchdog Timer', `${watchdogSeconds} segundos (Recuperação de travamentos)`],
                  ['Limpeza de Cookies/Sessão', clearCookies ? 'Sim, a cada atendimento finalizado' : 'Não'],
                  ['Teclado Virtual na Tela', virtualKeyboard ? 'Ativado automaticamente nos inputs' : 'Desativado'],
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3>Histórico de Eventos do Kiosk</h3>
                <Button variant="ghost" icon="refresh" onClick={() => toast.info('Histórico sincronizado!')}>
                  Atualizar
                </Button>
              </div>
              {logs.map((l, index) => (
                <div className="timeline-item" key={index}>
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
              <strong style={{ color: kioskLocked ? 'var(--amber)' : 'var(--green)' }}>
                {kioskLocked ? 'Modo Manutenção' : '100% Ativo'}
              </strong>
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
              <span>Atendimentos Realizados</span>
              <strong>{ticketCount} emissões</strong>
            </div>
            <div>
              <span>Papel Térmico</span>
              <strong>{paperRemaining}% restante</strong>
            </div>
          </article>

          <article className="security-banner" style={{ background: 'var(--primary-soft)' }}>
            <span>
              <Icon name="shield" />
            </span>
            <div>
              <strong>Modo Kiosk Protegido</strong>
              <p>O acesso ao sistema operacional subjacente está bloqueado por política MDM com watchdog ativo.</p>
            </div>
          </article>
        </aside>
      </section>

      {/* MODAL DE EDIÇÃO DE PARÂMETROS DO KIOSK */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Configurar Aplicação do Kiosk"
        subtitle="Defina o endereço web carregado, tempos limites e proteções"
        icon="sliders"
        maxWidth={540}
      >
        <form onSubmit={handleSaveKioskConfig} className="page-stack">
          <label className="field full">
            <span>URL Inicial da Aplicação Kiosk</span>
            <input
              type="url"
              value={kioskUrl}
              onChange={(e) => setKioskUrl(e.target.value)}
              placeholder="https://suaempresa.corp/kiosk"
              required
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <label className="field">
              <span>Timeout de Inatividade (segundos)</span>
              <input
                type="number"
                min="10"
                max="600"
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                required
              />
            </label>

            <label className="field">
              <span>Watchdog Timer (segundos)</span>
              <input
                type="number"
                min="5"
                max="120"
                value={watchdogSeconds}
                onChange={(e) => setWatchdogSeconds(Number(e.target.value))}
                required
              />
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={virtualKeyboard}
                onChange={(e) => setVirtualKeyboard(e.target.checked)}
              />
              Habilitar Teclado Virtual touch screen automaticamente
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={clearCookies}
                onChange={(e) => setClearCookies(e.target.checked)}
              />
              Limpar cookies, cache e histórico a cada encerramento de sessão
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar e Aplicar no Totem</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

