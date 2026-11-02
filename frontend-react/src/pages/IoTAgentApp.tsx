import { useState } from 'react'
import PageIcon from '../components/PageIcon'
import { Button, Status } from '../components/UI'
import { useToast } from '../components/Toast'
import type { PageId } from '../types'

export function IoTAgentApp({ go }: { go?: (p: PageId) => void }) {
  const toast = useToast()
  const [mqttConnected, setMqttConnected] = useState(true)
  const [watchdogActive, setWatchdogActive] = useState(true)

  const handleTestPayload = () => {
    toast.success('Mensagem MQTT publicada com sucesso no tópico: iot/edge-01/telemetry')
  }

  return (
    <div className="page-stack">
      <div className="action-row" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ background: '#ecfeff', color: '#0e7490', padding: '6px', borderRadius: 8, display: 'inline-flex' }}>
              <PageIcon name="cpu" size={24} />
            </span>
            <h2 style={{ margin: 0 }}>Agente MDM IoT & Edge Gateways</h2>
            <Status tone={mqttConnected ? 'green' : 'red'}>
              {mqttConnected ? 'MQTT Conectado (v3.1.1)' : 'Desconectado'}
            </Status>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Controlador embarcado para automação, sensores industriais e comunicação Modbus RTU / MQTT.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" icon="refresh" onClick={handleTestPayload}>
            Publicar Teste MQTT
          </Button>
          {go && (
            <Button icon="arrow" onClick={() => go('iot')}>
              Ver Dispositivos IoT
            </Button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <section className="panel" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Conexão com Broker MQTT</h3>
          <div className="form-grid">
            <div>
              <small style={{ color: '#64748b' }}>Broker Host</small>
              <div style={{ fontWeight: 600 }}>mqtt.novara.internal:8883 (MQTTS)</div>
            </div>
            <div>
              <small style={{ color: '#64748b' }}>Client ID</small>
              <div style={{ fontWeight: 600 }}>edge-gateway-hub-01</div>
            </div>
            <div>
              <small style={{ color: '#64748b' }}>QoS Padrão</small>
              <div style={{ fontWeight: 600 }}>QoS 1 (At least once)</div>
            </div>
            <div>
              <small style={{ color: '#64748b' }}>Keep-Alive</small>
              <div style={{ fontWeight: 600 }}>60 segundos</div>
            </div>
          </div>
        </section>

        <section className="panel" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Portas Industriais & Barramentos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Porta Serial RS-485:</span>
              <strong style={{ color: '#059669' }}>/dev/ttyS1 (9600-8-N-1)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Barramento Modbus:</span>
              <strong style={{ color: '#2563eb' }}>RTU Master (8 Slaves)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Watchdog de Hardware:</span>
              <strong style={{ color: '#059669' }}>{watchdogActive ? 'Ativo (Timeout 120s)' : 'Desativado'}</strong>
            </div>
          </div>
        </section>
      </div>

      {/* Monitor de Tópicos MQTT */}
      <section className="panel" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Tópicos Publicados & Assinados</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tópico</th>
                <th>Tipo</th>
                <th>QoS</th>
                <th>Frequência</th>
                <th>Última Mensagem</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>novara/iot/edge-01/telemetry</code></td>
                <td>Publicação</td>
                <td>1</td>
                <td>A cada 10s</td>
                <td><code>{`{"temp": 24.5, "humidity": 58, "voltage": 12.1}`}</code></td>
              </tr>
              <tr>
                <td><code>novara/iot/edge-01/commands</code></td>
                <td>Assinatura</td>
                <td>2</td>
                <td>Sob demanda</td>
                <td>Aguardando ordens da central</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
