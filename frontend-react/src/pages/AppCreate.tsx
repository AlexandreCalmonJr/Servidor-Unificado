import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button } from '../components/UI'
import type { PageId } from '../types'

export function AppCreate({ go }: { go: (p: PageId) => void }) {
  const [name, setName] = useState('')
  const [vendor, setVendor] = useState('')
  const [version, setVersion] = useState('')
  const [category, setCategory] = useState('Produtividade')
  const [deploymentType, setDeploymentType] = useState<'mandatory' | 'selfService'>('mandatory')
  const [platform, setPlatform] = useState('Windows')
  const [silentArgs, setSilentArgs] = useState('/qn /norestart ALLUSERS=1')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => {
      go('catalog')
    }, 1200)
  }

  return (
    <div className="provision-layout" style={{ gridTemplateColumns: 'minmax(0, 780px) 300px' }}>
      <section className="panel form-panel">
        <div className="form-heading">
          <span>NOVO PACOTE DE SOFTWARE</span>
          <h3>Adicionar Aplicativo Corporativo</h3>
          <p>Cadastre executáveis ou pacotes para distribuição remota silenciosa ou autoatendimento.</p>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Nome do Aplicativo</span>
            <input
              placeholder="Ex.: Google Chrome Enterprise / Notion Desktop"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Fabricante / Desenvolvedor</span>
            <input
              placeholder="Ex.: Google LLC / Microsoft"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Versão Homologada</span>
            <input
              placeholder="Ex.: v128.0.6613"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Categoria</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Produtividade">Produtividade & Escritório</option>
              <option value="Navegador">Navegador Web</option>
              <option value="Comunicação">Comunicação & Chat</option>
              <option value="Segurança">Segurança & VPN</option>
              <option value="Desenvolvimento">Ferramentas de Desenvolvimento</option>
              <option value="Kiosk">Aplicação de Totem Kiosk</option>
            </select>
          </label>

          <div className="full">
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#3f485c', display: 'block', marginBottom: '8px' }}>
              Tipo de Distribuição
            </span>
            <div className="option-grid">
              <button
                type="button"
                className={deploymentType === 'mandatory' ? 'selected' : ''}
                onClick={() => setDeploymentType('mandatory')}
              >
                <span className="platform-icon">
                  <Icon name="check" />
                </span>
                <strong>Obrigatório (Baseline Silenciosa)</strong>
                <small>O agente instala automaticamente em segundo plano sem exigir ação do colaborador.</small>
                {deploymentType === 'mandatory' && (
                  <i className="selected-check">
                    <Icon name="check" size={13} />
                  </i>
                )}
              </button>

              <button
                type="button"
                className={deploymentType === 'selfService' ? 'selected' : ''}
                onClick={() => setDeploymentType('selfService')}
              >
                <span className="platform-icon">
                  <Icon name="blocks" />
                </span>
                <strong>Autoatendimento (Catálogo Livre)</strong>
                <small>Fica disponível na central de aplicativos para o colaborador instalar quando precisar.</small>
                {deploymentType === 'selfService' && (
                  <i className="selected-check">
                    <Icon name="check" size={13} />
                  </i>
                )}
              </button>
            </div>
          </div>

          <label className="field">
            <span>Plataforma Alvo</span>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="Windows">Windows (MSI / EXE)</option>
              <option value="macOS">macOS (PKG / DMG)</option>
              <option value="Linux">Linux (DEB / RPM)</option>
              <option value="Android">Android (APK Corporativo)</option>
            </select>
          </label>

          <label className="field">
            <span>Grupo de Dispositivos Alvo</span>
            <select>
              <option>Todos os dispositivos</option>
              <option>Corporativo HQ</option>
              <option>Desenvolvimento</option>
              <option>Financeiro</option>
              <option>Totens Kiosk</option>
            </select>
          </label>

          <label className="field full">
            <span>Argumentos de Instalação Silenciosa</span>
            <input
              placeholder="Ex.: /qn /norestart ALLUSERS=1"
              value={silentArgs}
              onChange={(e) => setSilentArgs(e.target.value)}
            />
          </label>

          <label className="field full">
            <span>URL do Pacote / Repositório Binário</span>
            <input
              placeholder="https://binarios.novara.corp/pacotes/googlechrome-enterprise.msi"
              defaultValue="https://binarios.novara.corp/pacotes/app-enterprise.msi"
            />
          </label>
        </div>

        <div className="form-actions">
          <Button variant="ghost" onClick={() => go('catalog')}>
            Cancelar
          </Button>
          <Button icon="check" onClick={handleSave} disabled={!name}>
            {saved ? 'Pacote Adicionado!' : 'Cadastrar Pacote no Catálogo'}
          </Button>
        </div>
      </section>

      <aside className="create-help">
        <span>
          <Icon name="download" />
        </span>
        <h3>Instalações Zero-Touch</h3>
        <p>Ao cadastrar pacotes com argumentos silenciosos:</p>
        <ul>
          <li>O download ocorre com controle de banda para não congestionar a rede</li>
          <li>A instalação não exige privilégios de administrador do colaborador</li>
          <li>O MDM valida o código de saída (Exit Code 0) para confirmar o sucesso</li>
        </ul>
      </aside>
    </div>
  )
}
