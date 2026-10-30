import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'
import type { PageId } from '../types'

export function DeviceDetail({ go }: { go: (p: PageId) => void }) {
  const [tab, setTab] = useState<'geral' | 'hardware' | 'apps' | 'security' | 'activity'>('geral')

  return (
    <div className="page-stack">
      <div className="detail-heading">
        <button onClick={() => go('assets')}>
          <Icon name="arrow" size={16} /> Voltar para inventário de ativos
        </button>
        <div className="detail-device">
          <span>
            <Icon name="laptop" size={25} />
          </span>
          <div>
            <h2>MacBook Pro 14" — Mariana Costa</h2>
            <p>NVR-MAC-0142 · macOS Sequoia 15.5 · Apple M3 Pro</p>
          </div>
          <Status tone="green">Online e Conforme</Status>
        </div>
        <div className="detail-actions">
          <Button variant="secondary" icon="pulse" onClick={() => go('diagnostics')}>
            Diagnosticar
          </Button>
          <Button icon="terminal" onClick={() => go('commands')}>
            Executar comando
          </Button>
        </div>
      </div>

      <div className="detail-tabs">
        <button className={tab === 'geral' ? 'active' : ''} onClick={() => setTab('geral')}>
          Visão geral
        </button>
        <button className={tab === 'hardware' ? 'active' : ''} onClick={() => setTab('hardware')}>
          Hardware & Disco
        </button>
        <button className={tab === 'apps' ? 'active' : ''} onClick={() => setTab('apps')}>
          Aplicativos instalados
        </button>
        <button className={tab === 'security' ? 'active' : ''} onClick={() => setTab('security')}>
          Segurança & Políticas
        </button>
        <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>
          Trilha de eventos
        </button>
      </div>

      <section className="device-overview">
        <div className="page-stack">
          <article className="panel device-health">
            <div className="health-score">
              <div>
                <strong>98</strong>
                <span>/100</span>
              </div>
              <p>Saúde excelente</p>
            </div>
            <div className="health-copy">
              <h3>Este dispositivo está seguro e em conformidade</h3>
              <p>
                Todas as 6 políticas obrigatórias estão ativas, FileVault habilitado e nenhuma
                ameaça foi detectada nos últimos 30 dias.
              </p>
              <div>
                <Status tone="green">Criptografia FileVault ativa</Status>
                <Status tone="green">Firewall corporativo ativo</Status>
                <Status tone="green">SO atualizado</Status>
                <Status tone="blue">Agente v4.8.2</Status>
              </div>
            </div>
          </article>

          <article className="panel info-panel">
            <div className="panel-head">
              <div>
                <h3>Informações gerais de inventário</h3>
                <p>Identificação de hardware e atribuição de usuário</p>
              </div>
              <button className="text-link">Editar cadastro</button>
            </div>
            <div className="info-grid">
              {[
                ['Nome do dispositivo', 'MacBook Pro — Mariana'],
                ['Responsável', 'Mariana Costa'],
                ['Número de série', 'C02ZQ0L8MD6R'],
                ['Modelo', 'MacBook Pro 14-inch, M3 Pro (11-core CPU, 14-core GPU)'],
                ['Sistema operacional', 'macOS 15.5 (Build 24F74)'],
                ['Endereço IP', '10.42.18.119 (Wi-Fi 6E)'],
                ['MAC Address', 'F4:D4:88:51:7A:BC'],
                ['Departamento', 'Design & Produto'],
                ['Propriedade', 'Ativo Corporativo'],
                ['Data de ativação', '14 de março de 2024'],
              ].map((x) => (
                <div key={x[0]}>
                  <span>{x[0]}</span>
                  <strong>{x[1]}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="panel info-panel">
            <div className="panel-head">
              <div>
                <h3>Armazenamento e memória RAM</h3>
                <p>Telemetria de utilização em tempo real</p>
              </div>
            </div>
            <div className="resource-grid">
              <div>
                <div>
                  <span>Armazenamento SSD</span>
                  <strong>284 GB de 512 GB</strong>
                </div>
                <div className="progress large">
                  <i className="os-blue" style={{ width: '55%' }} />
                </div>
                <small>228 GB livres (45% disponíveis)</small>
              </div>
              <div>
                <div>
                  <span>Memória Unificada</span>
                  <strong>11,2 GB de 18 GB</strong>
                </div>
                <div className="progress large">
                  <i className="os-violet" style={{ width: '62%' }} />
                </div>
                <small>6,8 GB livres (Pressão de memória normal)</small>
              </div>
            </div>
          </article>
        </div>

        <aside className="page-stack">
          <article className="panel quick-info">
            <h3>Conexão & Rede</h3>
            <div>
              <span>Última telemetria</span>
              <strong>Agora (WebSocket ativo)</strong>
            </div>
            <div>
              <span>Versão do agente</span>
              <strong>v4.8.2 (Canal estável)</strong>
            </div>
            <div>
              <span>Ponto de acesso</span>
              <strong>Novara-Corp-HQ (BSSID 08:ec:f5:12:44:aa)</strong>
            </div>
            <div>
              <span>Uptime do sistema</span>
              <strong>8d 14h 22m</strong>
            </div>
            <div>
              <span>Bateria</span>
              <strong>94% (Carregador conectado)</strong>
            </div>
          </article>

          <article className="panel timeline-panel">
            <h3>Atividade recente do dispositivo</h3>
            {[
              { title: 'Inventário sincronizado', desc: 'Hardware, portas e 42 softwares conferidos', time: 'Há 5 min' },
              { title: 'Verificação de conformidade', desc: 'Score 98/100 · Nenhuma vulnerabilidade encontrada', time: 'Há 35 min' },
              { title: 'Política sincronizada', desc: 'Baseline corporativa v2.4 aplicada com sucesso', time: 'Hoje, 09:12' },
              { title: 'Conexão restabelecida', desc: 'Autenticado via certificado 802.1x', time: 'Hoje, 08:30' },
            ].map((a) => (
              <div className="timeline-item" key={a.title}>
                <i />
                <div>
                  <strong>{a.title}</strong>
                  <p>{a.desc}</p>
                  <time>{a.time}</time>
                </div>
              </div>
            ))}
          </article>
        </aside>
      </section>
    </div>
  )
}
