import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status, MetricCard } from '../components/UI'
import type { PageId } from '../types'

interface IoTDevice {
  id: string
  name: string
  type: string
  location: string
  protocol: 'MQTT' | 'HTTP/REST' | 'Modbus' | 'LoRaWAN'
  status: 'Online' | 'Alerta' | 'Offline'
  tone: 'green' | 'amber' | 'red'
  lastTelemetry: string
  reading: string
}

const mockIoTDevices: IoTDevice[] = [
  { id: 'IOT-ENV-01', name: 'Sensor Térmico & Umidade Rack A', type: 'ESP32-S3 Environment', location: 'Data Center SP (Rack 14)', protocol: 'MQTT', status: 'Online', tone: 'green', lastTelemetry: 'Há 5s', reading: '21.4°C · 44% UR' },
  { id: 'IOT-ENV-02', name: 'Sensor Ambiente Sala Bateria Nobreak', type: 'ESP32 Industrial', location: 'Subsolo Sala Técnica SP', protocol: 'MQTT', status: 'Alerta', tone: 'amber', lastTelemetry: 'Há 12s', reading: '29.8°C (Acima do limiar)' },
  { id: 'IOT-GW-01', name: 'Gateway Industrial LoRa/Modbus', type: 'Raspberry Pi CM4 Industrial', location: 'Galpão Logística RJ', protocol: 'Modbus', status: 'Online', tone: 'green', lastTelemetry: 'Há 2s', reading: '18 nós conectados' },
  { id: 'IOT-PDU-04', name: 'Medidor de Energia Trifásico Smart PDU', type: 'Smart Meter RS485', location: 'Quadro Geral CPD', protocol: 'HTTP/REST', status: 'Online', tone: 'green', lastTelemetry: 'Há 15s', reading: '3.4 kW · 220V est.' },
  { id: 'IOT-DISP-02', name: 'Painel Digital e-Paper Ocupação de Sala', type: 'ESP32 e-Paper 7.5"', location: 'Reunião Executiva 01', protocol: 'MQTT', status: 'Online', tone: 'green', lastTelemetry: 'Há 1 min', reading: 'Bateria 91% · Sala Livre' },
  { id: 'IOT-AC-01', name: 'Controlador Smart HVAC Chiller 1', type: 'BACnet / IP Gateway', location: 'Cobertura Data Center', protocol: 'Modbus', status: 'Online', tone: 'green', lastTelemetry: 'Agora', reading: 'Setpoint 19°C · Pressão OK' },
]

export function IoT({ go }: { go?: (p: PageId) => void }) {
  const [filter, setFilter] = useState<'all' | 'mqtt' | 'sensors'>('all')
  const [query, setQuery] = useState('')

  const filtered = mockIoTDevices.filter((d) => {
    const matchesQuery = `${d.name} ${d.id} ${d.location} ${d.type}`.toLowerCase().includes(query.toLowerCase())
    if (!matchesQuery) return false
    if (filter === 'mqtt') return d.protocol === 'MQTT'
    if (filter === 'sensors') return d.type.includes('Sensor')
    return true
  })

  return (
    <div className="page-stack">
      <div className="action-row">
        <div>
          <h2>Módulo de IoT, Sensores & Hardware Embarcado</h2>
          <p>Supervisão de telemetria de sensores, gateways e microcontroladores industriais (MQTT/REST).</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary" icon="sliders" onClick={() => go?.('modules')}>
            Configurar Módulo IoT
          </Button>
          <Button icon="plus">Novo Dispositivo IoT</Button>
        </div>
      </div>

      <section className="dashboard-grid">
        <MetricCard label="Dispositivos IoT Ativos" value="24" delta="+3 este mês" tone="positive" />
        <MetricCard label="Gateways Conectados" value="4" delta="100% online" tone="positive" />
        <MetricCard label="Alertas de Sensores" value="1" delta="Sala Bateria > 28°C" tone="warning" />
        <MetricCard label="Mensagens MQTT / seg" value="142 msg/s" delta="Broker Online v5.0" tone="positive" />
      </section>

      <section className="panel table-panel">
        <div className="table-header">
          <div className="segmented">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
              Todos os Dispositivos <b>{mockIoTDevices.length}</b>
            </button>
            <button className={filter === 'mqtt' ? 'active' : ''} onClick={() => setFilter('mqtt')}>
              Broker MQTT <b>4</b>
            </button>
            <button className={filter === 'sensors' ? 'active' : ''} onClick={() => setFilter('sensors')}>
              Sensores Críticos <b>3</b>
            </button>
          </div>

          <label className="search table-search">
            <Icon name="search" />
            <input
              placeholder="Buscar por tag, localização, protocolo ou ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Dispositivo IoT</th>
                <th>Tipo / Hardware</th>
                <th>Localização</th>
                <th>Protocolo</th>
                <th>Última Leitura</th>
                <th>Status</th>
                <th>Telemetria</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="device-cell">
                      <span>
                        <Icon name="cpu" />
                      </span>
                      <div>
                        <strong>{d.name}</strong>
                        <small>{d.id}</small>
                      </div>
                    </div>
                  </td>
                  <td>{d.type}</td>
                  <td>{d.location}</td>
                  <td>
                    <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'var(--canvas)', fontWeight: 600 }}>
                      {d.protocol}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{d.reading}</td>
                  <td>
                    <Status tone={d.tone}>{d.status}</Status>
                  </td>
                  <td>{d.lastTelemetry}</td>
                  <td>
                    <button className="card-more" aria-label="Opções">•••</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
