import { useState } from 'react'
import PageIcon from '../components/PageIcon'
import { Button, Status } from '../components/UI'
import { useToast } from '../components/Toast'
import type { PageId } from '../types'

export function PanelAgentApp({ go }: { go?: (p: PageId) => void }) {
  const toast = useToast()
  const [screenPower, setScreenPower] = useState(true)
  const [brightness, setBrightness] = useState(85)
  const [activeMedia, setActiveMedia] = useState('Campanha Black Friday 2026 - Loop 60s.mp4')

  const handleTogglePower = () => {
    const next = !screenPower
    setScreenPower(next)
    toast.info(`Comando HDMI-CEC enviado: Display ${next ? 'LIGADO' : 'SUSPENSO'}.`)
  }

  const handleReloadPlaylist = () => {
    toast.success('Playlist recarregada no cache local do player.')
  }

  return (
    <div className="page-stack">
      <div className="action-row" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ background: '#fef3c7', color: '#92400e', padding: '6px', borderRadius: 8, display: 'inline-flex' }}>
              <PageIcon name="blocks" size={24} />
            </span>
            <h2 style={{ margin: 0 }}>Agente MDM para Painéis Digitais & Smart Displays</h2>
            <Status tone={screenPower ? 'green' : 'amber'}>
              {screenPower ? 'Exibindo Mídia (HDMI Ativo)' : 'Painel em Standby'}
            </Status>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Player de sinalização digital corporativa com controle de hardware via protocolo HDMI-CEC e sincronização de grade.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" icon="refresh" onClick={handleReloadPlaylist}>
            Recarregar Playlist
          </Button>
          <Button
            variant={screenPower ? 'danger' : 'primary'}
            icon="pulse"
            onClick={handleTogglePower}
          >
            {screenPower ? 'Desligar Tela (CEC)' : 'Ligar Tela (CEC)'}
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Painel do Player / Preview */}
        <section className="panel" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PageIcon name="blocks" size={18} />
            Preview do Conteúdo em Exibição
          </h3>
          <div
            style={{
              height: 200,
              background: screenPower ? '#0f172a' : '#1e293b',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: '#ffffff',
              border: '2px solid #334155',
              position: 'relative'
            }}
          >
            {screenPower ? (
              <>
                <div style={{ fontSize: 13, color: '#10b981', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  Reproduzindo 3840x2160 @ 60fps
                </div>
                <strong style={{ fontSize: 15, textAlign: 'center', padding: '0 20px' }}>{activeMedia}</strong>
                <span style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Tempo decorrido: 00:24 / 01:00</span>
              </>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: 14 }}>Display desligado via comando remoto</div>
            )}
          </div>
        </section>

        {/* Controles de Hardware do Painel */}
        <section className="panel" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PageIcon name="cpu" size={18} />
            Ajustes de Hardware & Periféricos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>Brilho do Display:</span>
                <strong style={{ color: '#2563eb' }}>{brightness}%</strong>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={brightness}
                onChange={e => setBrightness(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-grid">
              <div>
                <small style={{ color: '#64748b' }}>Orientação de Tela</small>
                <div style={{ fontWeight: 600 }}>Paisagem (16:9 - 3840x2160)</div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Porta de Vídeo</small>
                <div style={{ fontWeight: 600 }}>HDMI-1 (eARC Ativo)</div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Temperatura do Painel</small>
                <div style={{ fontWeight: 600, color: '#059669' }}>41.8°C (Normal)</div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Espaço em Cache</small>
                <div style={{ fontWeight: 600 }}>18.4 GB Livres</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
