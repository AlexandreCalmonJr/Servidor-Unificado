import { Icon } from './Icon'
import type { PageId } from '../types'

export const pageMeta: Record<PageId, { title: string; subtitle: string }> = {
  dashboard: { title: 'Visão geral', subtitle: 'Acompanhe a saúde e a segurança do seu ambiente em tempo real.' },
  assets: { title: 'Gestão Geral de Ativos', subtitle: 'Inventário consolidado e unificado de toda a frota corporativa.' },
  desktops: { title: 'Estações Fixas & Desktops', subtitle: 'Supervisão de torres, estações de trabalho, portas de rede e Wake-on-LAN.' },
  desktopDetail: { title: 'Ficha da Estação de Trabalho', subtitle: 'Telemetria da torre, multi-monitores, GPU dedicada, portas de rede e Wake-on-LAN.' },
  notebooks: { title: 'Notebooks & Laptops Móveis', subtitle: 'Gestão de laptops, saúde da bateria, criptografia e rastreamento.' },
  notebookDetail: { title: 'Ficha do Notebook Corporativo', subtitle: 'Saúde e ciclos de bateria, custódia de chave BitLocker/FileVault e Wi-Fi.' },
  mobiles: { title: 'Smartphones & Tablets (EMM)', subtitle: 'Gestão móvel iOS e Android, IMEI, operadoras, Modo Perdido e wipe remoto.' },
  mobileDetail: { title: 'Ficha do Dispositivo Móvel', subtitle: 'Telefonia móvel, IMEI, contêiner EMM, Modo Perdido e wipe seletivo.' },
  panels: { title: 'Painéis Digitais & Signage', subtitle: 'Supervisão de TVs de chamada de senha, menuboards, video walls e HDMI-CEC.' },
  panelDetail: { title: 'Ficha do Painel & Signage', subtitle: 'Parâmetros HDMI-CEC, resolução 4K, canal de mídia em reprodução e alertas de tela.' },
  device: { title: 'Detalhes do dispositivo', subtitle: 'Informações, telemetria e atividade do ativo selecionado.' },
  totems: { title: 'Totens de Autoatendimento', subtitle: 'Monitoramento de periféricos, tela, impressora térmica e status operacional.' },
  totemDetail: { title: 'Ficha do Totem de Autoatendimento', subtitle: 'Telemetria, periféricos conectados, tela touch e ações de kiosk.' },
  printers: { title: 'Impressoras & Insumos', subtitle: 'Níveis de toner, suprimentos, contadores de páginas e alertas de falhas.' },
  printerDetail: { title: 'Detalhes da Impressora & Insumos', subtitle: 'Histórico de suprimentos, toners KCMY, contadores e filas de impressão.' },
  provisioning: { title: 'Provisionamento', subtitle: 'Prepare e distribua configurações para novos dispositivos.' },
  provisionQr: { title: 'QR de provisionamento', subtitle: 'Inscreva dispositivos móveis com rapidez e segurança.' },
  modules: { title: 'Módulos', subtitle: 'Gerencie as capacidades ativas na sua operação MDM.' },
  admin: { title: 'Administração', subtitle: 'Usuários, grupos, permissões e políticas globais de acesso.' },
  userCreate: { title: 'Novo usuário', subtitle: 'Crie uma conta e defina os acessos à plataforma.' },
  audit: { title: 'Auditoria', subtitle: 'Rastreabilidade completa das ações realizadas na plataforma.' },
  policies: { title: 'Políticas', subtitle: 'Defina os padrões de segurança e conformidade.' },
  policyCreate: { title: 'Criar Nova Política', subtitle: 'Configure padrões de conformidade, senhas, firewall e restrições.' },
  groups: { title: 'Grupos inteligentes', subtitle: 'Organize dispositivos e automatize atribuições.' },
  groupDetail: { title: 'Detalhes do Grupo Inteligente', subtitle: 'Dispositivos membros, regras de adesão e políticas atribuídas.' },
  groupCreate: { title: 'Novo Grupo Dinâmico', subtitle: 'Crie um grupo automatizado com base em critérios de hardware ou rede.' },
  groupRules: { title: 'Editar Regras de Adesão', subtitle: 'Defina os filtros de correspondência lógica (AND/OR) para o grupo.' },
  catalog: { title: 'Catálogo de aplicativos', subtitle: 'Distribua e mantenha aplicativos corporativos.' },
  appCreate: { title: 'Adicionar Pacote de Aplicativo', subtitle: 'Cadastre um novo software para distribuição silenciosa ou autoatendimento.' },
  agent: { title: 'Aplicativo agente', subtitle: 'Distribua o agente para computadores gerenciados.' },
  downloads: { title: 'Downloads dos agentes', subtitle: 'Instaladores e métodos de implantação para todas as plataformas.' },
  mobile: { title: 'Aplicativo mobile', subtitle: 'Acesso seguro e autoatendimento para colaboradores.' },
  diagnostics: { title: 'Diagnóstico', subtitle: 'Investigue a saúde e o desempenho dos dispositivos.' },
  server: { title: 'Status dos servidores', subtitle: 'Disponibilidade e desempenho da infraestrutura unificada.' },
  reports: { title: 'Relatórios', subtitle: 'Transforme dados da operação em decisões executivas.' },
  commands: { title: 'Comandos remotos', subtitle: 'Execute ações seguras nos dispositivos gerenciados.' },
  iot: { title: 'Módulo IoT & Hardware Embarcado', subtitle: 'Supervisão de telemetria MQTT, gateways industriais e microcontroladores.' },
  mappings: { title: 'Mapeamentos', subtitle: 'Gerencie unidades, pontos de acesso BSSID e faixas de IP corporativas.' },
  profiles: { title: 'Perfis de Configuração MDM', subtitle: 'Perfis de rede Wi-Fi, VPN, certificados e restrições de dispositivos.' },
  profile: { title: 'Meu perfil', subtitle: 'Informações pessoais, acesso e preferências.' },
}

export function Header({
  active,
  openMenu,
  searchQuery,
  onSearchChange,
}: {
  active: PageId
  openMenu: () => void
  searchQuery?: string
  onSearchChange?: (val: string) => void
}) {
  const meta = pageMeta[active] || { title: 'Servidor Unificado', subtitle: 'Painel Central' }

  return (
    <header className="topbar">
      <button className="menu-button" aria-label="Abrir menu" onClick={openMenu}>
        <Icon name="menu" />
      </button>

      <div className="page-title">
        <h1>{meta.title}</h1>
        <p>{meta.subtitle}</p>
      </div>

      <div className="header-actions">
        <label className="search">
          <Icon name="search" />
          <input
            placeholder="Buscar em tudo..."
            value={searchQuery ?? ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
          <kbd>⌘ K</kbd>
        </label>

        <button className="icon-button" aria-label="Notificações e Alertas">
          <Icon name="bell" />
          <span />
        </button>

        <span className="header-avatar" title="Administrador">SU</span>
      </div>
    </header>
  )
}
