import { useState, useMemo } from 'react'
import { Icon } from '../components/Icon'
import { Button, Status } from '../components/UI'
import type { PageId } from '../types'

interface AppItem {
  id: string
  name: string
  vendor: string
  category: string
  version: string
  color: string
  type: 'baseline' | 'selfService'
  hasUpdate: boolean
  installedCount: number
  targetCount: number
}

const catalogApps: AppItem[] = [
  { id: 'app-1', name: 'Microsoft 365 Apps', vendor: 'Microsoft Corp', category: 'Produtividade', version: 'v16.86', color: 'blue', type: 'baseline', hasUpdate: false, installedCount: 247, targetCount: 247 },
  { id: 'app-2', name: 'Google Chrome Enterprise', vendor: 'Google LLC', category: 'Navegador Web', version: 'v126.0', color: 'green', type: 'baseline', hasUpdate: false, installedCount: 247, targetCount: 247 },
  { id: 'app-3', name: '1Password 8', vendor: 'AgileBits', category: 'Segurança & Senhas', version: 'v8.10.34', color: 'cyan', type: 'baseline', hasUpdate: false, installedCount: 245, targetCount: 247 },
  { id: 'app-4', name: 'Slack Enterprise Grid', vendor: 'Salesforce Inc', category: 'Comunicação', version: 'v4.39.1', color: 'rose', type: 'selfService', hasUpdate: true, installedCount: 164, targetCount: 180 },
  { id: 'app-5', name: 'Figma Desktop', vendor: 'Figma Inc.', category: 'Design & UI/UX', version: 'v124.5', color: 'violet', type: 'selfService', hasUpdate: false, installedCount: 34, targetCount: 40 },
  { id: 'app-6', name: 'Zoom Workplace', vendor: 'Zoom Video', category: 'Videoconferência', version: 'v6.1.2', color: 'blue', type: 'selfService', hasUpdate: true, installedCount: 118, targetCount: 150 },
  { id: 'app-7', name: 'Visual Studio Code', vendor: 'Microsoft', category: 'Desenvolvimento', version: 'v1.90.2', color: 'violet', type: 'selfService', hasUpdate: false, installedCount: 48, targetCount: 60 },
  { id: 'app-8', name: 'Notion Desktop', vendor: 'Notion Labs', category: 'Gestão & Wiki', version: 'v3.8.0', color: 'gray', type: 'selfService', hasUpdate: false, installedCount: 62, targetCount: 80 },
  { id: 'app-9', name: 'CrowdStrike Falcon Sensor', vendor: 'CrowdStrike', category: 'EDR & Proteção Endpoint', version: 'v7.12.0', color: 'rose', type: 'baseline', hasUpdate: false, installedCount: 247, targetCount: 247 },
]

export function AppCatalog({ go }: { go?: (p: PageId) => void }) {
  const [tab, setTab] = useState<'all' | 'baseline' | 'selfService' | 'updates'>('all')
  const [search, setSearch] = useState('')
  const [installed, setInstalled] = useState<string[]>(['Microsoft 365 Apps', 'Google Chrome Enterprise', '1Password 8', 'CrowdStrike Falcon Sensor'])

  const filteredApps = useMemo(() => {
    return catalogApps.filter((app) => {
      const matchSearch = `${app.name} ${app.vendor} ${app.category}`.toLowerCase().includes(search.toLowerCase())
      if (!matchSearch) return false

      if (tab === 'baseline') return app.type === 'baseline'
      if (tab === 'selfService') return app.type === 'selfService'
      if (tab === 'updates') return app.hasUpdate
      return true
    })
  }, [tab, search])

  const pendingUpdatesCount = useMemo(() => catalogApps.filter(a => a.hasUpdate).length, [])
  const baselineCount = useMemo(() => catalogApps.filter(a => a.type === 'baseline').length, [])
  const selfServiceCount = useMemo(() => catalogApps.filter(a => a.type === 'selfService').length, [])

  const handleToggleInstall = (appName: string) => {
    setInstalled((old) =>
      old.includes(appName) ? old.filter((x) => x !== appName) : [...old, appName]
    )
  }

  return (
    <div className="page-stack">
      <div className="action-row">
        <div>
          <h2>Catálogo Corporativo de Aplicativos</h2>
          <p>Disponibilize softwares homologados, pacotes silenciosos e mantenha as versões atualizadas nos ativos.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button icon="plus" onClick={() => go?.('appCreate')}>
            Adicionar pacote de aplicativo
          </Button>
        </div>
      </div>

      <section className="catalog-banner">
        <span>
          <Icon name="blocks" size={25} />
        </span>
        <div style={{ flex: 1 }}>
          <strong>{catalogApps.length} softwares homologados no repositório corporativo</strong>
          <p>{pendingUpdatesCount} atualizações de segurança estão homologadas e aguardando aprovação para distribuição em lote.</p>
        </div>
        <Button variant="secondary" onClick={() => setTab('updates')}>
          Revisar fila de atualizações ({pendingUpdatesCount})
        </Button>
      </section>

      <div className="report-toolbar">
        <div className="admin-tabs">
          <button
            className={tab === 'all' ? 'active' : ''}
            onClick={() => setTab('all')}
          >
            Todos os aplicativos ({catalogApps.length})
          </button>
          <button
            className={tab === 'baseline' ? 'active' : ''}
            onClick={() => setTab('baseline')}
          >
            Obrigatórios da Baseline ({baselineCount})
          </button>
          <button
            className={tab === 'selfService' ? 'active' : ''}
            onClick={() => setTab('selfService')}
          >
            Autoatendimento ({selfServiceCount})
          </button>
          <button
            className={tab === 'updates' ? 'active' : ''}
            onClick={() => setTab('updates')}
          >
            Atualizações pendentes ({pendingUpdatesCount})
          </button>
        </div>
        <label className="search table-search">
          <Icon name="search" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar aplicativo por nome, fabricante ou categoria..."
          />
        </label>
      </div>

      {filteredApps.length === 0 ? (
        <div className="panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)' }}>Nenhum aplicativo encontrado nesta categoria ou termo de busca.</p>
        </div>
      ) : (
        <section className="app-catalog-grid">
          {filteredApps.map((a) => (
            <article className="panel app-card" key={a.id}>
              <div className={`app-logo ${a.color}`}>
                <Icon
                  name={
                    a.name.includes('1Password')
                      ? 'lock'
                      : a.name.includes('Visual Studio')
                      ? 'terminal'
                      : a.name.includes('Falcon')
                      ? 'shield'
                      : 'blocks'
                  }
                  size={25}
                />
              </div>
              <div className="app-info">
                <h3>{a.name}</h3>
                <p>
                  {a.vendor} · {a.category}
                </p>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.25rem' }}>
                  <small style={{ fontWeight: 600 }}>{a.version}</small>
                  <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: a.type === 'baseline' ? 'var(--primary-soft)' : 'var(--canvas)', color: a.type === 'baseline' ? 'var(--primary)' : 'var(--muted)' }}>
                    {a.type === 'baseline' ? 'Baseline Obrigatória' : 'Autoatendimento'}
                  </span>
                </div>
              </div>
              <button className="card-more" aria-label="Opções do app">•••</button>
              <div className="app-meta">
                <span>
                  <small>Instalado em</small>
                  <strong>{a.installedCount} de {a.targetCount} ativos</strong>
                </span>
                <Status tone={a.hasUpdate ? 'amber' : 'green'}>
                  {a.hasUpdate ? 'Atualização' : 'Atualizado'}
                </Status>
              </div>
              <Button
                variant={installed.includes(a.name) ? 'secondary' : 'primary'}
                icon={installed.includes(a.name) ? 'check' : 'download'}
                onClick={() => handleToggleInstall(a.name)}
              >
                {installed.includes(a.name) ? 'Distribuído (Instalado)' : 'Distribuir nos ativos'}
              </Button>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
