import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button } from '../components/UI'
import type { IconName } from '../types'

export function AgentDownloads() {
  const [channel, setChannel] = useState<'Estável' | 'Beta'>('Estável')

  const installers = [
    ['Windows 10 / 11 / Server', 'Compatível com 64 bits e ARM64', 'Instalador MSI Silencioso', '42,8 MB', 'laptop'],
    ['macOS Sequoia, Sonoma, Ventura', 'Apple Silicon M1/M2/M3/M4 & Intel', 'Pacote PKG Universal', '38,2 MB', 'laptop'],
    ['Linux Ubuntu, Debian & RHEL', 'Totens Kiosk e Servidores Headless', 'Pacotes DEB / RPM', '35,6 MB', 'terminal'],
    ['Android Enterprise', 'Android 11 ou superior (Kiosk / MDM)', 'Google Play / APK Corporativo', '28,1 MB', 'phone'],
    ['iOS & iPadOS', 'iOS 16 ou superior (Supervisionado)', 'Apple Business Manager / VPP', 'App Store', 'phone'],
  ] as const

  return (
    <div className="page-stack">
      <section className="download-hero">
        <div>
          <p className="eyebrow">NOVARA ENDPOINT AGENT v4.8.2</p>
          <h2>Central de Downloads dos Agentes</h2>
          <p>Instale manualmente ou utilize os instaladores MSI/PKG com argumentos silenciosos para implantação em massa.</p>
        </div>
        <div className="channel-picker">
          <span>Canal de distribuição</span>
          <div>
            <button
              className={channel === 'Estável' ? 'active' : ''}
              onClick={() => setChannel('Estável')}
              type="button"
            >
              Estável (LTS)
            </button>
            <button
              className={channel === 'Beta' ? 'active' : ''}
              onClick={() => setChannel('Beta')}
              type="button"
            >
              Beta (Early Access)
            </button>
          </div>
        </div>
      </section>

      <section className="download-grid">
        {installers.map((x, i) => (
          <article className={`panel download-card ${i === 0 ? 'recommended' : ''}`} key={x[0]}>
            {i === 0 && <b>RECOMENDADO</b>}
            <span className={`download-os os-${i}`}>
              <Icon name={x[4] as IconName} size={25} />
            </span>
            <h3>{x[0]}</h3>
            <p>{x[1]}</p>
            <div>
              <span>{x[2]}</span>
              <small>{x[3]}</small>
            </div>
            <Button
              variant={i < 3 ? 'primary' : 'secondary'}
              icon={i < 3 ? 'download' : 'arrow'}
            >
              {i < 3 ? 'Baixar instalador' : 'Abrir catálogo'}
            </Button>
          </article>
        ))}
      </section>

      <section className="deploy-grid">
        <article className="panel deploy-card">
          <span>
            <Icon name="terminal" />
          </span>
          <div>
            <h3>Instalação rápida via terminal (Linux / macOS)</h3>
            <p>Utilize um comando único em lote para provisionamento automático de servidores e totens.</p>
            <code>curl -sL https://mdm.novara.corp/install.sh | sudo bash -s -- --token=nvr-SU2026-HQ</code>
          </div>
          <Button variant="secondary">Copiar comando</Button>
        </article>

        <article className="panel deploy-card">
          <span>
            <Icon name="blocks" />
          </span>
          <div>
            <h3>Pacotes para Microsoft Intune / SCCM / GPO</h3>
            <p>Faça o download do template ADMX e script de implantação para Active Directory.</p>
          </div>
          <Button variant="secondary" icon="download">
            Baixar pacote GPO
          </Button>
        </article>
      </section>

      <section className="panel release-panel">
        <div>
          <span>
            <Icon name="check" />
          </span>
          <div>
            <h3>Novidades e melhorias da compilação v4.8.2</h3>
            <p>Novo driver de telemetria em tempo real, suporte ao macOS 15.5, melhoria no protocolo SNMP de impressoras e correções críticas.</p>
          </div>
        </div>
        <button className="text-link">
          Ver changelog detalhado <Icon name="arrow" size={14} />
        </button>
      </section>
    </div>
  )
}
