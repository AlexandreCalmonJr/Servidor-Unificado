import { Icon } from '../components/Icon'
import { Status } from '../components/UI'

export function MobileApp() {
  return (
    <div className="mobile-app-page">
      <section className="mobile-copy">
        <div className="mobile-app-icon">
          <span className="logo-mark">
            <span />
          </span>
        </div>
        <p className="eyebrow">NOVARA MOBILE PARA COLABORADORES</p>
        <h2>
          Segurança e autoatendimento
          <br />
          na palma da mão.
        </h2>
        <p>
          O aplicativo mobile conecta colaboradores ao suporte corporativo, oferece solicitação de apps
          homologados e assegura a proteção contínua dos smartphones da empresa.
        </p>

        <div className="store-buttons">
          <button type="button">
            <Icon name="phone" />
            <span>
              <small>DISPONÍVEL NA</small>
              <strong>App Store (Apple)</strong>
            </span>
          </button>
          <button type="button">
            <Icon name="arrow" />
            <span>
              <small>BAIXE NO</small>
              <strong>Google Play Store</strong>
            </span>
          </button>
        </div>

        <div className="mobile-features">
          <div>
            <Icon name="shield" />
            <span>
              <strong>Dispositivo protegido</strong>
              <small>Status e conformidade em tempo real</small>
            </span>
          </div>
          <div>
            <Icon name="agent" />
            <span>
              <strong>Suporte simplificado</strong>
              <small>Abertura de chamados em segundos</small>
            </span>
          </div>
          <div>
            <Icon name="blocks" />
            <span>
              <strong>Catálogo corporativo</strong>
              <small>Aplicativos autorizados para instalação</small>
            </span>
          </div>
        </div>
      </section>

      <section className="phone-showcase">
        <div className="phone-glow" />
        <div className="phone-device back">
          <div className="phone-screen">
            <div className="mobile-top">
              9:41 <span>● ● ▰</span>
            </div>
            <div className="mobile-greeting">
              <span className="logo-mark">
                <span />
              </span>
              <Icon name="bell" size={17} />
            </div>
            <p>Bom dia, Mariana</p>
            <h3>Seu smartphone está seguro</h3>
            <div className="mobile-shield">
              <Icon name="shield" size={42} />
            </div>
            <Status tone="green">100% em conformidade</Status>
            <div className="mobile-cards">
              <div>
                <Icon name="check" />
                <span>
                  Proteção<strong>Ativa</strong>
                </span>
              </div>
              <div>
                <Icon name="pulse" />
                <span>
                  Última análise<strong>Agora</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="phone-device front">
          <div className="phone-screen catalog">
            <div className="mobile-top">
              9:41 <span>● ● ▰</span>
            </div>
            <div className="catalog-head">
              <Icon name="chevron" />
              <strong>Catálogo Corporativo</strong>
              <Icon name="search" />
            </div>
            <label className="mobile-search">
              <Icon name="search" size={14} />
              Buscar aplicativos
            </label>
            {['Microsoft Teams', 'Figma Mobile', '1Password', 'Notion'].map((x, i) => (
              <div className="mobile-app-row" key={x}>
                <span className={`app-color c${i}`}>
                  <Icon name={i === 2 ? 'lock' : 'blocks'} size={18} />
                </span>
                <div>
                  <strong>{x}</strong>
                  <small>{i % 2 ? 'Produtividade' : 'Comunicação'}</small>
                </div>
                <button type="button">{i === 0 ? 'Abrir' : 'Instalar'}</button>
              </div>
            ))}
          </div>
        </div>

        <div className="qr-card">
          <span className="fake-qr" />
          <div>
            <strong>Instale no celular</strong>
            <small>Aponte a câmera para o QR code</small>
          </div>
        </div>
      </section>
    </div>
  )
}
