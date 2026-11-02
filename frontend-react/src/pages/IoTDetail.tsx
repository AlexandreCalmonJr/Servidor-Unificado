import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import type { PageId } from '../types'

interface TelemetryPoint {
  time: string
  temp: number
  humidity: number
}

interface MqttLogItem {
  id: string
  timestamp: string
  topic: string
  qos: 0 | 1 | 2
  status: 'Normal' | 'Alerta' | 'Sistema'
  tone: 'green' | 'amber' | 'blue'
  payload: Record<string, any>
}

export function IoTDetail({ go }: { go: (p: PageId) => void }) {
  const [tab, setTab] = useState<'geral' | 'telemetry' | 'events'>('geral')
  const toast = useToast()

  // Estados de ações
  const [refreshing, setRefreshing] = useState(false)
  const [rebooting, setRebooting] = useState(false)
  const [calibrating, setCalibrating] = useState(false)

  // Modais
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false)
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false)
  const [calibrationModalOpen, setCalibrationModalOpen] = useState(false)
  const [eventDetailModal, setEventDetailModal] = useState<MqttLogItem | null>(null)

  // Dados Cadastrais do Dispositivo
  const [deviceName, setDeviceName] = useState('Sensor Térmico & Umidade Rack A')
  const [deviceId] = useState('IOT-ENV-01')
  const [hardwareModel] = useState('ESP32-S3 Dual-Core Industrial Rev 0.2')
  const [firmwareVersion] = useState('v2.4.1-ota-prod')
  const [location, setLocation] = useState('Data Center Principal · Rack 14 (Baia Térmica 02)')
  const [protocol] = useState<'MQTT' | 'HTTP/REST' | 'Modbus' | 'LoRaWAN'>('MQTT')
  const [brokerEndpoint] = useState('mqtts://broker.corp.internal:8883')
  const [macAddress] = useState('7C:DF:A1:88:42:0E')
  const [ipAddress] = useState('10.42.30.55')

  // Limiares de Alerta
  const [maxTemp, setMaxTemp] = useState(26.0)
  const [minTemp, setMinTemp] = useState(16.0)
  const [maxHumidity, setMaxHumidity] = useState(65.0)
  const [tempOffset, setTempOffset] = useState(-0.2)

  // Amostras de telemetria das últimas 6 horas
  const telemetrySamples: TelemetryPoint[] = [
    { time: '16:00', temp: 21.0, humidity: 43 },
    { time: '17:00', temp: 21.2, humidity: 44 },
    { time: '18:00', temp: 21.5, humidity: 45 },
    { time: '19:00', temp: 21.8, humidity: 46 },
    { time: '20:00', temp: 21.3, humidity: 44 },
    { time: '21:00', temp: 21.4, humidity: 44 },
  ]

  // Logs MQTT
  const [mqttLogs] = useState<MqttLogItem[]>([
    {
      id: 'msg-901',
      timestamp: 'Hoje, 21:34:55',
      topic: 'sensors/datacenter/rack14/env',
      qos: 1,
      status: 'Normal',
      tone: 'green',
      payload: {
        devId: 'IOT-ENV-01',
        temp_c: 21.4,
        hum_pct: 44.0,
        battery_mv: 3315,
        rssi_dbm: -58,
        uptime_s: 3648920,
        firmware: 'v2.4.1',
      },
    },
    {
      id: 'msg-902',
      timestamp: 'Hoje, 21:29:55',
      topic: 'sensors/datacenter/rack14/env',
      qos: 1,
      status: 'Normal',
      tone: 'green',
      payload: {
        devId: 'IOT-ENV-01',
        temp_c: 21.3,
        hum_pct: 44.2,
        battery_mv: 3318,
        rssi_dbm: -59,
        uptime_s: 3648620,
      },
    },
    {
      id: 'msg-903',
      timestamp: 'Hoje, 20:45:10',
      topic: 'sensors/datacenter/rack14/status/lwt',
      qos: 1,
      status: 'Sistema',
      tone: 'blue',
      payload: {
        event: 'HEARTBEAT_ACK',
        subscribers: 4,
        latency_ms: 12,
        tls_cipher: 'TLS_AES_256_GCM_SHA384',
      },
    },
    {
      id: 'msg-904',
      timestamp: 'Ontem, 23:14:02',
      topic: 'sensors/datacenter/rack14/alerts',
      qos: 2,
      status: 'Alerta',
      tone: 'amber',
      payload: {
        warning: 'SPIKE_DETECTED',
        detail: 'Leitura temporária de 25.8°C após abertura de porta do rack',
        stabilized_in_sec: 45,
      },
    },
  ])

  const handleRefreshTelemetry = () => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
      toast.success('Leitura forçada enviada via MQTT. Telemetria sincronizada com sucesso!')
    }, 800)
  }

  const handleRebootNode = () => {
    setRebooting(true)
    setTimeout(() => {
      setRebooting(false)
      toast.success('Comando de reinicialização remota OTA aceito pelo microcontrolador.')
    }, 1200)
  }

  const handleSaveCalibration = () => {
    setCalibrating(true)
    setTimeout(() => {
      setCalibrating(false)
      setCalibrationModalOpen(false)
      toast.success(`Offset térmico de ${tempOffset > 0 ? '+' : ''}${tempOffset}°C gravado na EEPROM.`)
    }, 600)
  }

  return (
    <div className="page-stack">
      {/* Barra de Navegação Superior / Migalha */}
      <div className="action-row">
        <div>
          <button
            className="text-link"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px', cursor: 'pointer' }}
            onClick={() => go('iot')}
          >
            <Icon name="arrow" style={{ transform: 'rotate(180deg)' }} /> Voltar para Dispositivos IoT
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h2>{deviceName}</h2>
            <span className="badge-tag blue">{deviceId}</span>
            <span className="badge-tag gray">MQTT v5.0</span>
            <Status tone="green">Online & Operacional</Status>
          </div>
          <p style={{ marginTop: '4px' }}>
            {hardwareModel} · {location}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            icon="clock"
            disabled={refreshing}
            onClick={handleRefreshTelemetry}
          >
            {refreshing ? 'Lendo Sensores...' : 'Forçar Leitura'}
          </Button>
          <Button
            variant="secondary"
            icon="sliders"
            onClick={() => setThresholdModalOpen(true)}
          >
            Configurar Limiares
          </Button>
          <Button
            variant="secondary"
            icon="download"
            onClick={() => setCalibrationModalOpen(true)}
          >
            Calibrar Sensor
          </Button>
          <Button
            variant="danger"
            disabled={rebooting}
            onClick={handleRebootNode}
          >
            {rebooting ? 'Reiniciando Nó...' : 'Reiniciar Nó IoT'}
          </Button>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="detail-tabs">
        <button className={tab === 'geral' ? 'active' : ''} onClick={() => setTab('geral')}>
          Visão Geral
        </button>
        <button className={tab === 'telemetry' ? 'active' : ''} onClick={() => setTab('telemetry')}>
          Telemetria & Gráficos
        </button>
        <button className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>
          Mensagens & Fila MQTT ({mqttLogs.length})
        </button>
      </div>

      {/* ABA 1: VISÃO GERAL */}
      {tab === 'geral' && (
        <section className="device-overview">
          <div className="page-stack">
            {/* Banner Compacto de Saúde e Conectividade */}
            <article className="panel device-health" style={{ padding: '16px 20px' }}>
              <div className="health-score" style={{ minWidth: '100px' }}>
                <div>
                  <strong style={{ fontSize: '28px' }}>99.9</strong>
                  <span style={{ fontSize: '13px' }}>%</span>
                </div>
                <p>Disponibilidade</p>
              </div>
              <div className="health-copy">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '15px' }}>Telemetria em tempo real recebida a cada 5 segundos</h3>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <Status tone="green">Sinal Wi-Fi -58 dBm</Status>
                    <Status tone="green">Broker Conectado</Status>
                    <Status tone="blue">QoS 1 Ativo</Status>
                  </div>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '13px' }}>
                  Sensor ambiental em conformidade com as normas ASHRAE para data centers. Sem saturação de barramento ou perdas de pacote nos últimos 30 dias.
                </p>
              </div>
            </article>

            {/* Destaques de Leituras dos Sensores */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <article className="panel" style={{ padding: '14px' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Temperatura Ambiente</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0' }}>
                  <strong style={{ fontSize: '24px', color: 'var(--ink)' }}>21.4°C</strong>
                  <span style={{ fontSize: '11px', color: 'var(--emerald, #10b981)', fontWeight: 600 }}>Faixa ideal (18-24°C)</span>
                </div>
                <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Variação de ±0.3°C nas últimas 6h</small>
              </article>

              <article className="panel" style={{ padding: '14px' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Umidade Relativa (UR)</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0' }}>
                  <strong style={{ fontSize: '24px', color: 'var(--ink)' }}>44.0%</strong>
                  <span style={{ fontSize: '11px', color: 'var(--emerald, #10b981)', fontWeight: 600 }}>Ideal (40-60%)</span>
                </div>
                <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Ponto de orvalho: 8.9°C</small>
              </article>

              <article className="panel" style={{ padding: '14px' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Alimentação & Tensão</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0' }}>
                  <strong style={{ fontSize: '24px', color: 'var(--ink)' }}>3.32 V</strong>
                  <span style={{ fontSize: '11px', color: 'var(--emerald, #10b981)', fontWeight: 600 }}>Estável PoE</span>
                </div>
                <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Consumo médio: 140 mA</small>
              </article>

              <article className="panel" style={{ padding: '14px' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Latência de Mensagem</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0' }}>
                  <strong style={{ fontSize: '24px', color: 'var(--ink)' }}>14 ms</strong>
                  <span style={{ fontSize: '11px', color: 'var(--emerald, #10b981)', fontWeight: 600 }}>TLS 1.3</span>
                </div>
                <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Broker interno local</small>
              </article>
            </div>

            {/* Inventário e Especificações Essenciais */}
            <article className="panel info-panel">
              <div className="panel-head">
                <div>
                  <h3 style={{ fontSize: '14px', margin: 0 }}>Especificações Essenciais do Dispositivo</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                    6 parâmetros primários de rede e hardware
                  </p>
                </div>
                <Button
                  variant="secondary"
                  icon="search"
                  onClick={() => setInventoryModalOpen(true)}
                >
                  Ver Ficha Técnica Completa
                </Button>
              </div>

              <div className="info-grid">
                <div>
                  <span>Tag do Dispositivo</span>
                  <strong>{deviceId}</strong>
                </div>
                <div>
                  <span>Plataforma / MCU</span>
                  <strong>{hardwareModel}</strong>
                </div>
                <div>
                  <span>Endereço IP (Estático)</span>
                  <strong>{ipAddress}</strong>
                </div>
                <div>
                  <span>Endereço MAC</span>
                  <strong>{macAddress}</strong>
                </div>
                <div>
                  <span>Protocolo / Porta</span>
                  <strong>{protocol} · Porta 8883 (MQTTS)</strong>
                </div>
                <div>
                  <span>Firmware Atual</span>
                  <strong>{firmwareVersion}</strong>
                </div>
              </div>
            </article>
          </div>

          {/* Aside Lateral */}
          <aside className="page-stack">
            <article className="panel quick-info">
              <h3>Conexão & Broker MQTT</h3>
              <div>
                <span>Broker Endpoint</span>
                <strong style={{ wordBreak: 'break-all' }}>{brokerEndpoint}</strong>
              </div>
              <div>
                <span>Canal Wireless</span>
                <strong>Wi-Fi 6 (802.11ax) · 2.4 GHz</strong>
              </div>
              <div>
                <span>Potência do Sinal</span>
                <strong>-58 dBm (Excelente)</strong>
              </div>
              <div>
                <span>Uptime do Nó</span>
                <strong>42 dias, 05:22 contínuos</strong>
              </div>
              <div>
                <span>Criptografia de Transporte</span>
                <strong>mTLS com Certificado X.509</strong>
              </div>
            </article>

            <article className="panel timeline-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '13px' }}>Últimas Mensagens</h3>
                <button
                  className="text-link"
                  style={{ fontSize: '12px', cursor: 'pointer' }}
                  onClick={() => setTab('events')}
                >
                  Ver todas
                </button>
              </div>
              {mqttLogs.slice(0, 3).map((log) => (
                <div
                  className="timeline-item"
                  key={log.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setEventDetailModal(log)}
                >
                  <i />
                  <div>
                    <strong>{log.topic}</strong>
                    <p>QoS {log.qos} · Status: {log.status}</p>
                    <time>{log.timestamp}</time>
                  </div>
                </div>
              ))}
            </article>
          </aside>
        </section>
      )}

      {/* ABA 2: TELEMETRIA & SENSORES */}
      {tab === 'telemetry' && (
        <section className="tab-full-stack">
          {/* Histórico Térmico Recente */}
          <article className="panel info-panel">
            <div className="panel-head">
              <div>
                <h3 className="card-section-title">Histórico de Temperatura (Últimas 6 Horas)</h3>
                <p className="card-section-desc">Amostragem horária calculada via média móvel de leituras</p>
              </div>
              <span className="badge-tag green">Média: 21.3°C · Estável</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginTop: '16px' }}>
              {telemetrySamples.map((sample) => (
                <div
                  key={sample.time}
                  style={{
                    background: 'var(--surface-sunken)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    {sample.time}
                  </span>
                  <strong style={{ fontSize: '18px', color: 'var(--ink)', display: 'block' }}>
                    {sample.temp}°C
                  </strong>
                  <div className="progress" style={{ height: '6px', margin: '8px 0' }}>
                    <i
                      className="os-green"
                      style={{ width: `${Math.min(100, (sample.temp / 30) * 100)}%` }}
                    />
                  </div>
                  <small style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    UR: {sample.humidity}%
                  </small>
                </div>
              ))}
            </div>
          </article>

          {/* Configuração de Limiares Operacionais */}
          <article className="panel info-panel">
            <div className="panel-head">
              <div>
                <h3 className="card-section-title">Limiares de Alerta & Acionamento Automático</h3>
                <p className="card-section-desc">Valores críticos para disparo de alertas para a equipe de infraestrutura</p>
              </div>
              <Button
                variant="secondary"
                icon="sliders"
                onClick={() => setThresholdModalOpen(true)}
              >
                Ajustar Limiares
              </Button>
            </div>

            <div className="info-grid">
              <div>
                <span>Temperatura Máxima Permitida</span>
                <strong style={{ color: 'var(--amber, #f59e0b)' }}>{maxTemp.toFixed(1)}°C (Alerta Imediato)</strong>
              </div>
              <div>
                <span>Temperatura Mínima Permitida</span>
                <strong>{minTemp.toFixed(1)}°C</strong>
              </div>
              <div>
                <span>Umidade Relativa Máxima</span>
                <strong>{maxHumidity.toFixed(1)}% UR</strong>
              </div>
              <div>
                <span>Offset Térmico de Calibração</span>
                <strong>{tempOffset > 0 ? `+${tempOffset}` : tempOffset}°C aplicado na EEPROM</strong>
              </div>
            </div>
          </article>
        </section>
      )}

      {/* ABA 3: LOGS & EVENTOS MQTT */}
      {tab === 'events' && (
        <section className="tab-full-stack">
          <div className="panel table-panel">
            <div className="table-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Trilha de Mensagens MQTT</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                  Payloads recebidos e transmitidos pelo dispositivo
                </p>
              </div>
              <Button
                variant="secondary"
                icon="download"
                onClick={() => toast.success('Exportando mensagens em formato CSV...')}
              >
                Exportar CSV
              </Button>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Horário</th>
                    <th>Tópico MQTT</th>
                    <th>QoS</th>
                    <th>Classificação</th>
                    <th>Resumo do Payload</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {mqttLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>{log.timestamp}</td>
                      <td>
                        <code style={{ fontSize: '12px', color: 'var(--ink)' }}>{log.topic}</code>
                      </td>
                      <td>
                        <span className="badge-tag gray" style={{ fontSize: '11px' }}>QoS {log.qos}</span>
                      </td>
                      <td>
                        <Status tone={log.tone}>{log.status}</Status>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {JSON.stringify(log.payload)}
                      </td>
                      <td>
                        <button
                          className="text-link"
                          style={{ fontSize: '12px', cursor: 'pointer' }}
                          onClick={() => setEventDetailModal(log)}
                        >
                          Ver JSON
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* MODAL 1: INVENTÁRIO TÉCNICO COMPLETO */}
      <Modal
        isOpen={inventoryModalOpen}
        onClose={() => setInventoryModalOpen(false)}
        title="Ficha Técnica Completa do Dispositivo IoT"
        subtitle={`Registro detalhado do microcontrolador ${deviceId}`}
        icon="cpu"
        iconColor="blue"
        maxWidth={620}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="secondary" onClick={() => setInventoryModalOpen(false)}>
              Fechar
            </Button>
          </div>
        }
      >
        <div className="info-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <div>
            <span>Identificador Único</span>
            <strong>{deviceId}</strong>
          </div>
          <div>
            <span>Microcontrolador</span>
            <strong>ESP32-S3FN8 (Xtensa 32-bit LX7 @ 240MHz)</strong>
          </div>
          <div>
            <span>Memória Flash</span>
            <strong>16 MB Quad SPI Flash</strong>
          </div>
          <div>
            <span>Memória PSRAM</span>
            <strong>8 MB Octal PSRAM</strong>
          </div>
          <div>
            <span>Endereço MAC Wi-Fi</span>
            <strong>{macAddress}</strong>
          </div>
          <div>
            <span>Endereço IP Estático</span>
            <strong>{ipAddress} (VLAN 30 - IoT)</strong>
          </div>
          <div>
            <span>Mascara / Gateway</span>
            <strong>255.255.255.0 · 10.42.30.1</strong>
          </div>
          <div>
            <span>Broker MQTT</span>
            <strong>{brokerEndpoint}</strong>
          </div>
          <div>
            <span>Tópico de Telemetria</span>
            <strong>sensors/datacenter/rack14/env</strong>
          </div>
          <div>
            <span>Tópico LWT (Last Will)</span>
            <strong>sensors/datacenter/rack14/status/lwt</strong>
          </div>
          <div>
            <span>Certificado Criptográfico</span>
            <strong>X.509 Client Cert (Validade: Dez/2028)</strong>
          </div>
          <div>
            <span>Alimentação</span>
            <strong>PoE IEEE 802.3af (Passivo 48V para 3.3V)</strong>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: AJUSTE DE LIMIARES */}
      <Modal
        isOpen={thresholdModalOpen}
        onClose={() => setThresholdModalOpen(false)}
        title="Configurar Limiares de Alerta Térmico"
        subtitle="Defina as faixas de operação para disparo automático de alertas"
        icon="sliders"
        iconColor="amber"
        maxWidth={480}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <Button variant="secondary" onClick={() => setThresholdModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setThresholdModalOpen(false)
                toast.success('Limiares de alerta atualizados com sucesso.')
              }}
            >
              Salvar Limiares
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Temperatura Máxima Crítica (°C)
            </label>
            <input
              type="number"
              step="0.5"
              value={maxTemp}
              onChange={(e) => setMaxTemp(parseFloat(e.target.value) || 26)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--canvas)' }}
            />
            <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
              Acima deste valor, o painel gera alerta de nível crítico.
            </small>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Temperatura Mínima (°C)
            </label>
            <input
              type="number"
              step="0.5"
              value={minTemp}
              onChange={(e) => setMinTemp(parseFloat(e.target.value) || 16)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--canvas)' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Umidade Relativa Máxima (% UR)
            </label>
            <input
              type="number"
              step="1"
              value={maxHumidity}
              onChange={(e) => setMaxHumidity(parseFloat(e.target.value) || 65)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--canvas)' }}
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 3: CALIBRAÇÃO DE OFFSET */}
      <Modal
        isOpen={calibrationModalOpen}
        onClose={() => setCalibrationModalOpen(false)}
        title="Calibração do Sensor Digital"
        subtitle="Ajuste fino de offset térmico gravado diretamente na memória flash do nó"
        icon="sliders"
        iconColor="blue"
        maxWidth={460}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <Button variant="secondary" onClick={() => setCalibrationModalOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={calibrating} onClick={handleSaveCalibration}>
              {calibrating ? 'Gravando Offset...' : 'Aplicar Offset'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '12.5px', color: 'var(--muted)', margin: 0 }}>
            Insira o valor de correção caso o sensor físico tenha um desvio conhecido contra um termômetro calibrado padrão (ex: -0.2°C).
          </p>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Offset Térmico (°C)
            </label>
            <input
              type="number"
              step="0.1"
              value={tempOffset}
              onChange={(e) => setTempOffset(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--canvas)' }}
            />
          </div>

          <div style={{ background: 'var(--surface-sunken)', padding: '10px', borderRadius: '6px', fontSize: '12px' }}>
            <span>Leitura física bruta: <strong>21.6°C</strong></span>
            <br />
            <span>Leitura calibrada enviada: <strong>{(21.6 + tempOffset).toFixed(1)}°C</strong></span>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: INSPETOR DE JSON PAYLOAD MQTT */}
      {eventDetailModal && (
        <Modal
          isOpen={!!eventDetailModal}
          onClose={() => setEventDetailModal(null)}
          title={`Payload MQTT — ${eventDetailModal.topic}`}
          subtitle={`Registro capturado às ${eventDetailModal.timestamp} (QoS ${eventDetailModal.qos})`}
          icon="terminal"
          iconColor="blue"
          maxWidth={580}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Button
                variant="secondary"
                icon="copy"
                onClick={() => {
                  navigator.clipboard?.writeText(JSON.stringify(eventDetailModal.payload, null, 2))
                  toast.success('Payload JSON copiado para a área de transferência!')
                }}
              >
                Copiar JSON
              </Button>
              <Button variant="secondary" onClick={() => setEventDetailModal(null)}>
                Fechar
              </Button>
            </div>
          }
        >
          <pre
            style={{
              background: 'var(--canvas)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '14px',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: 'var(--ink)',
              overflowX: 'auto',
              maxHeight: '340px',
              lineHeight: 1.5,
            }}
          >
            {JSON.stringify(eventDetailModal.payload, null, 2)}
          </pre>
        </Modal>
      )}
    </div>
  )
}
