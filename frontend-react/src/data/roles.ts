import type { UserRole, UserProfileData, RolePermission } from '../types/rbac'

export const roleDefinitions: Record<UserRole, { label: string; badgeTone: 'red' | 'amber' | 'blue' | 'cyan' | 'green'; summary: string }> = {
  root: {
    label: 'Super Administrador (Root)',
    badgeTone: 'red',
    summary: 'Acesso irrestrito a clusters, chaves criptográficas de alto nível, banco de dados e auditoria de kernel.'
  },
  master: {
    label: 'Administrador da Organização (Master)',
    badgeTone: 'amber',
    summary: 'Controle pleno do tenant corporativo, faturamento, gestão de administradores e políticas globais.'
  },
  gerente: {
    label: 'Gerente de Operações & TI',
    badgeTone: 'blue',
    summary: 'Gestão de frotas e setores, aprovação de acessos remotos com duplo controle, relatórios de SLA e custos.'
  },
  supervisor: {
    label: 'Supervisor de Campo & Frotas',
    badgeTone: 'cyan',
    summary: 'Monitoramento em tempo real de equipamentos e equipes, triagem de alertas e despacho de comandos em lote.'
  },
  tecnico: {
    label: 'Técnico de Manutenção / Helpdesk',
    badgeTone: 'green',
    summary: 'Atendimento operacional a ativos, diagnósticos de hardware, checklists e controle remoto assistido.'
  }
}

export const allPermissions: RolePermission[] = [
  // Sistema & Kernel
  { id: 'sys_baremetal', name: 'Acesso Bare-metal & Kernel', description: 'Controle de clusters, migração de nós e reinicialização de daemons centrais.', category: 'system' },
  { id: 'sys_crypto_keys', name: 'Gestão de Chaves Criptográficas', description: 'Geração e rotação de certificados TLS corporativos e chaves mestras AES-256.', category: 'system' },
  { id: 'sys_db_purge', name: 'Purga e Restauração de Banco de Dados', description: 'Execução de backups de baixo nível e purga de registros de quarentena.', category: 'system' },

  // Organização & Governança
  { id: 'org_tenants', name: 'Gestão de Filiais & Unidades', description: 'Criar, desativar ou configurar parâmetros específicos de filiais e tenants.', category: 'organization' },
  { id: 'org_billing', name: 'Faturamento & Licenciamento de Módulos', description: 'Adquirir licenças de agentes, módulos extras e planos de retenção de logs.', category: 'organization' },
  { id: 'org_users_admin', name: 'Gestão de Usuários e Permissões', description: 'Criar, suspender ou alterar credenciais e níveis de acesso de colaboradores.', category: 'organization' },

  // Cibersegurança & Conformidade
  { id: 'sec_quarantine', name: 'Quarentena e Isolamento de Rede', description: 'Isolar imediatamente computadores ou dispositivos suspeitos na rede.', category: 'security' },
  { id: 'sec_zero_trust', name: 'Políticas Zero-Trust e DLP', description: 'Configurar restrições de USB, VPN Always-On, BitLocker e biometria obrigatória.', category: 'security' },
  { id: 'sec_audit_export', name: 'Exportação de Trilha de Auditoria Forense', description: 'Gerar relatórios assinados digitalmente para auditorias externas e LGPD.', category: 'security' },

  // Operações & Dispositivos
  { id: 'dev_bulk_commands', name: 'Despacho de Comandos em Massa', description: 'Executar reinicialização ou atualização em lote para frotas inteiras.', category: 'operations' },
  { id: 'dev_remote_session', name: 'Acesso Remoto e Terminal Seguro', description: 'Iniciar streaming de tela e terminal de comando direto no dispositivo cliente.', category: 'operations' },
  { id: 'dev_diagnostics', name: 'Diagnóstico Avançado de Hardware', description: 'Executar testes de estresse de memória, disco, processador e periféricos.', category: 'operations' },
  { id: 'dev_supplies_mgmt', name: 'Gestão de Suprimentos & Impressoras', description: 'Monitorar toners, peças de desgaste e agendar substituição técnica.', category: 'operations' }
]

export const mockProfiles: Record<UserRole, UserProfileData> = {
  root: {
    id: 'usr-root-001',
    name: 'Alexandre',
    surname: 'Calmon Jr.',
    email: 'root@novara.internal',
    role: 'root',
    roleTitle: 'Super Administrador de Sistemas & CISO Global',
    sector: 'Infraestrutura Crítica & Cibersegurança',
    phone: '+55 11 99999-0001',
    avatarInitials: 'AC',
    twoFactorEnabled: true,
    memberSince: '12 Jan 2023',
    lastAccess: 'Em atividade agora',
    sessionsCount: 1,
    ipAddress: '10.0.0.1 (VPN Segura Novara-Priv)',
    badgeTone: 'red',
    description: 'Acesso irrestrito a todos os nós do cluster, credenciais mestras de criptografia, quarentena de rede e logs de baixo nível.',
    permissions: allPermissions.map(p => p.id),
    accessibleModules: ['all']
  },
  master: {
    id: 'usr-master-002',
    name: 'Beatriz',
    surname: 'Mendonça',
    email: 'beatriz.mendonca@novara.com.br',
    role: 'master',
    roleTitle: 'Diretora de Operações & Administradora Geral',
    sector: 'Diretoria Executiva & Governança',
    phone: '+55 11 98888-0002',
    avatarInitials: 'BM',
    twoFactorEnabled: true,
    memberSince: '04 Mar 2024',
    lastAccess: 'Há 12 min',
    sessionsCount: 2,
    ipAddress: '192.168.1.50 (Novara HQ)',
    badgeTone: 'amber',
    description: 'Gestão de contratos, filiais, criação de equipes administrativas, aprovação de orçamentos e relatórios executivos de conformidade.',
    permissions: [
      'org_tenants', 'org_billing', 'org_users_admin',
      'sec_quarantine', 'sec_zero_trust', 'sec_audit_export',
      'dev_bulk_commands', 'dev_remote_session', 'dev_diagnostics', 'dev_supplies_mgmt'
    ],
    accessibleModules: ['dashboard', 'assets', 'admin', 'reports', 'audit', 'policies', 'groups', 'cybersecurity']
  },
  gerente: {
    id: 'usr-gerente-003',
    name: 'Carlos',
    surname: 'Eduardo Silveira',
    email: 'carlos.silveira@novara.com.br',
    role: 'gerente',
    roleTitle: 'Gerente Regional de Infraestrutura & Frotas',
    sector: 'Operações de TI Região Sudeste',
    phone: '+55 21 97777-0003',
    avatarInitials: 'CS',
    twoFactorEnabled: true,
    memberSince: '15 Ago 2024',
    lastAccess: 'Há 45 min',
    sessionsCount: 1,
    ipAddress: '177.132.88.14 (Filial Rio)',
    badgeTone: 'blue',
    description: 'Alocação de frotas entre lojas e departamentos, aprovação de solicitações de acesso remoto assistido, análise de SLA e relatórios de custo.',
    permissions: [
      'sec_quarantine', 'sec_audit_export',
      'dev_bulk_commands', 'dev_remote_session', 'dev_diagnostics', 'dev_supplies_mgmt'
    ],
    accessibleModules: ['dashboard', 'assets', 'reports', 'groups', 'policies', 'cybersecurity', 'desktops', 'notebooks', 'panels', 'totems', 'printers', 'iot']
  },
  supervisor: {
    id: 'usr-supervisor-004',
    name: 'Daniela',
    surname: 'Fontes',
    email: 'daniela.fontes@novara.com.br',
    role: 'supervisor',
    roleTitle: 'Supervisora de Operações de Campo & Turno',
    sector: 'Suporte de Campo & Monitoramento',
    phone: '+55 11 96666-0004',
    avatarInitials: 'DF',
    twoFactorEnabled: true,
    memberSince: '10 Out 2024',
    lastAccess: 'Há 5 min',
    sessionsCount: 3,
    ipAddress: '10.42.12.8 (Mesa de Operações)',
    badgeTone: 'cyan',
    description: 'Supervisão direta das frotas de totens, painéis e estações em operação, despacho de comandos operacionais e triagem de chamados críticos.',
    permissions: [
      'dev_bulk_commands', 'dev_remote_session', 'dev_diagnostics', 'dev_supplies_mgmt'
    ],
    accessibleModules: ['dashboard', 'assets', 'desktops', 'notebooks', 'panels', 'totems', 'printers', 'iot', 'commands', 'diagnostics']
  },
  tecnico: {
    id: 'usr-tecnico-005',
    name: 'Eduardo',
    surname: 'Henrique Ramos',
    email: 'eduardo.ramos@novara.com.br',
    role: 'tecnico',
    roleTitle: 'Técnico de Suporte Especialista N2',
    sector: 'Helpdesk Técnico & Manutenção Preventiva',
    phone: '+55 11 95555-0005',
    avatarInitials: 'ER',
    twoFactorEnabled: true,
    memberSince: '02 Jan 2025',
    lastAccess: 'Em atividade agora',
    sessionsCount: 1,
    ipAddress: '10.42.8.91 (Bancada Técnica 04)',
    badgeTone: 'green',
    description: 'Execução de diagnósticos de hardware, sessões remotas assistidas com clientes, substituição de periféricos e verificação de suprimentos de impressão.',
    permissions: [
      'dev_remote_session', 'dev_diagnostics', 'dev_supplies_mgmt'
    ],
    accessibleModules: ['assets', 'device', 'desktops', 'notebooks', 'panels', 'totems', 'printers', 'iot', 'diagnostics', 'remoteAccess']
  }
}
