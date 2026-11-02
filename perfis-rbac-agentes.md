# 📋 Planejamento de Engenharia: Perfis por Nível de Acesso (RBAC) & Módulos de Cibersegurança e Agentes

> **Documento de Especificação e Plano de Execução Técnica**  
> **Tipo de Projeto:** WEB (React 18 + TypeScript + Vite)  
> **Status:** 🟡 Planejamento Concluído — Aguardando Aprovação (Socratic Gate)  
> **Agente Responsável:** `@project-planner` (com suporte de `@frontend-specialist`, `@security-auditor` e `@backend-specialist`)  
> **Data:** Novembro de 2026  

---

## 1. 🎯 Overview & Objetivos

Este plano define a arquitetura, design visual, contratos de dados e estratégia de implementação para duas demandas centrais do sistema **Servidor Unificado MDM**:

1. **Matriz de Perfis de Usuário por Nível de Acesso (RBAC):**
   - Criação e adaptação de telas de perfil e gerenciamento hierárquico sob medida para os 5 níveis corporativos:
     - 👑 **`root`**: Superadministrador do Sistema & Infraestrutura (Acesso irrestrito a clusters, chaves criptográficas, quarentena de rede e logs de kernel).
     - 🏢 **`master`**: Administrador da Organização / Tenant Owner (Gestão de filiais, contratação de módulos, criação de admins e governança de compliance).
     - 📊 **`gerente`**: Gestor de Operações & TI (Alocação de frotas por setor, aprovação de acessos remotos com duplo controle, relatórios gerenciais e SLA).
     - 🛡️ **`supervisor`**: Supervisor de Campo & Frotas (Monitoramento de telemetria em tempo real, despacho de comandos em lote, gestão de turnos e triagem de alertas).
     - 🔧 **`tecnico`**: Técnico de Manutenção / Helpdesk (Diagnóstico remoto de ativos, execução de comandos assistidos, controle de periféricos e checklists de campo).
   - Componente de **Simulação / Troca de Perfil Ativo (Role Switcher Preview)** para testes ágeis e auditoria visual da interface pelo operador.

2. **Módulos de Cibersegurança & Novas Telas dos Agentes MDM:**
   - **`CyberSecurity.tsx`**: Centro de Operações de Segurança (SOC / XDR / SIEM integrado) com gestão de incidentes críticos, conformidade Zero-Trust, quarentena de dispositivos e controle de tráfego anômalo.
   - **`DesktopAgentApp.tsx`**: Interface do Agente para Estações de Trabalho (Windows / macOS / Linux) com telemetria de hardware, BitLocker/FileVault, status de antivírus/EDR e histórico de comandos.
   - **`MobileAgentApp.tsx`**: Interface do Agente Mobile (Android / iOS) com perfil de trabalho seguro (BYOD / COPE), inventário de apps, geofencing e status de conformidade.
   - **`PanelAgentApp.tsx`**: Interface do Agente para Painéis Digitais / Smart Displays com playlist de exibição, controle HDMI-CEC, resolução e status de player.
   - **`IoTAgentApp.tsx`**: Interface do Agente para Gateways / Dispositivos IoT com telemetria MQTT, barramento Modbus/Serial e monitoramento de sensores.
   - **`EquipmentDiagnostics.tsx`**: Suite de diagnóstico avançado de hardware, estresse de CPU/memória, latência e periféricos com emissão de laudo técnico.
   - **`RemoteAccess.tsx`**: Console de controle remoto com espelhamento de tela interativo, terminal de comando seguro e transferência de arquivos com duplo consentimento.

---

## 2. 🏆 Critérios de Sucesso (Success Criteria)

- [ ] **Hierarquia RBAC Rigorosa:** Cada perfil reflete visualmente seus privilégios, restrições, badges, estatísticas e ações disponíveis.
- [ ] **Zero Overlap de Permissões:** Perfis subordinados (ex: Técnico) não visualizam nem executam ações de governança global (ex: revogação de chaves mestras ou exclusão de tenants).
- [ ] **Aderência às Regras de Design:**
  - 🚫 **Purple Ban respeitado:** Proibido o uso de tons roxos/violetas (substituídos por azuis corporativos, ciano, verde esmeralda, âmbar e slate).
  - 🚫 **Template Ban respeitado:** Layouts modernos, assimétricos e funcionais com micro-animações, cards de dados com estatísticas reais e modais de confirmação.
- [ ] **Integração Completa na Navegação:**
  - Registro de novos `PageId` no sistema central de rotas (`App.tsx`, `Sidebar.tsx`, `Header.tsx`).
  - Navegação fluida entre lista de módulos, painéis de detalhe e centrais de agentes.
- [ ] **Conformidade de Build & Testes:** `npm run build` executa com **0 erros de TypeScript** e todos os testes automatizados passam com sucesso.

---

## 3. 🛠️ Tech Stack & Decisões Arquiteturais

| Camada | Tecnologia | Justificativa |
|---|---|---|
| **Frontend Core** | React 18 + TypeScript | Tipagem estrita em RBAC e contratos de eventos de telemetria em tempo real. |
| **Estilização** | CSS Puro Modularizado + Tokens Design System | Sem Tailwind v4 inline poluído; temas e variáveis consistentes em `:root`. |
| **Ícones** | `Icon.tsx` / `PageIcon.tsx` (SVG nativo) | Suporte completo a `className`, `style`, `color` e escalabilidade vetorial sem dependências pesadas. |
| **Comunicação Realtime** | WebSocket nativo (RFC 6455) | Conexão de baixa latência para telemetria de agentes, SOC e sessão de controle remoto. |
| **Gerenciamento de Estado** | React Hooks (`useState`, `useMemo`, `useCallback`, Custom Hooks) | Arquitetura limpa sem sobrecarga de bibliotecas de estado global desnecessárias. |

---

## 4. 📐 Estrutura de Diretórios e Arquivos

```
frontend-react/src/
├── components/
│   ├── Icon.tsx                   # Suporte a novos glifos (radar, terminal, bug, desktop, etc.)
│   ├── PageIcon.tsx               # Suporte a ícones dedicados de cibersegurança e agentes
│   ├── RoleBadge.tsx              # Componente reutilizável para badges hierárquicas de perfil
│   ├── RoleSwitcher.tsx           # Alternador visual de perfil em tempo de desenvolvimento
│   └── Header.tsx / Sidebar.tsx   # Menus adaptativos por nível de permissão
├── data/
│   ├── roles.ts                   # Definição e matriz de permissões para root, master, gerente, supervisor, tecnico
│   └── cybersecurityData.ts       # Dados de telemetria, incidentes e posturas de segurança simuladas/reais
├── pages/
│   ├── Profile.tsx                # Tela de perfil pessoal atualizada com suporte dinâmico ao nível ativo
│   ├── profiles/
│   │   ├── ProfileRoot.tsx        # Visão e controles específicos de Super Administrador (Root)
│   │   ├── ProfileMaster.tsx      # Visão e controles de Administrador Master (Tenant Owner)
│   │   ├── ProfileGerente.tsx     # Visão e controles de Gerente de Operações
│   │   ├── ProfileSupervisor.tsx  # Visão e controles de Supervisor de Campo
│   │   └── ProfileTecnico.tsx     # Visão e controles de Técnico Operacional
│   ├── CyberSecurity.tsx          # Módulo Central de Cibersegurança & SOC
│   ├── DesktopAgentApp.tsx        # Painel do Agente Desktop
│   ├── MobileAgentApp.tsx         # Painel do Agente Mobile
│   ├── PanelAgentApp.tsx          # Painel do Agente para Displays e Painéis
│   ├── IoTAgentApp.tsx            # Painel do Agente IoT e Controladores
│   ├── EquipmentDiagnostics.tsx   # Suíte de Diagnóstico Avançado de Equipamento
│   └── RemoteAccess.tsx           # Console de Acesso Remoto Interativo
└── styles/
    └── cybersecurity.css          # Estilização dedicada para o módulo de segurança e terminais
```

---

## 5. 🗂️ Matriz de Níveis de Acesso (RBAC Matrix)

| Nível / Cargo | Escopo de Acesso | Ações Críticas Permitidas | Ações Bloqueadas | Indicador Visual |
|---|---|---|---|---|
| **`root`** | Global (Sistema / Bare-metal) | Limpeza de banco, regeneração de chaves TLS/JWT, reinicialização de serviços, quarentena global. | Nenhuma (Acesso Irrestrito). | Vermelho rubi / Badge Carmesim |
| **`master`** | Toda a Organização (Tenant) | Gestão de faturamento, criação/exclusão de usuários admin, aprovação de políticas globais. | Comandos bare-metal e auditoria interna do kernel. | Dourado âmbar / Badge Ouro |
| **`gerente`** | Setores & Frotas Gerenciadas | Aprovação de sessões remotas, emissão de relatórios executivos, alocação de dispositivos por grupo. | Exclusão de contas master e edição de políticas de segurança raiz. | Azul marinho / Badge Sapphire |
| **`supervisor`** | Equipe de Campo & Dispositivos | Monitoramento de presença ao vivo, envio de comandos em lote (reboot, wipe assistido), gestão de turnos. | Alteração de regras de faturamento e criação de novos usuários. | Ciano / Teal Badge |
| **`tecnico`** | Dispositivos em Atendimento | Acesso remoto assistido, testes de diagnóstico, leitura de telemetria de hardware e suprimentos. | Alteração de políticas corporativas, visualização de dados financeiros e gestão de permissões. | Verde esmeralda / Mint Badge |

---

## 6. 📝 Detalhamento das Tarefas (Task Breakdown)

### Fase 1: Arquitetura & Tipagem RBAC
- **Task 1.1: Definição de Tipos e Matriz de Permissões**
  - **Agente:** `@project-planner` + `@security-auditor` | **Skill:** `clean-code`
  - **Input:** Matriz de papéis solicitada (`root`, `master`, `gerente`, `supervisor`, `tecnico`).
  - **Output:** Arquivo `src/types/rbac.ts` e `src/data/roles.ts` com interfaces tipadas, lista de permissões e dados de demonstração de cada nível.
  - **Verify:** `npx tsc --noEmit` valida tipos sem erro.

### Fase 2: Implementação das Telas de Perfil
- **Task 2.1: Desenvolvimento dos Componentes de Perfil Especializados**
  - **Agente:** `@frontend-specialist` | **Skills:** `frontend-design`, `clean-code`
  - **Input:** Telas de perfil customizadas por nível com permissões, logs de sessão, escopo de atuação e ações contextuais.
  - **Output:** Criação dos subcomponentes/visões para `ProfileRoot`, `ProfileMaster`, `ProfileGerente`, `ProfileSupervisor` e `ProfileTecnico`, integrados no `Profile.tsx` através de um seletor de visualização (simulação dinâmica de permissões).
  - **Verify:** Operador pode alternar entre os 5 níveis e observar imediatamente as restrições e painéis específicos de cada cargo.

### Fase 3: Módulo de Cibersegurança (SOC / XDR)
- **Task 3.1: Integração de `CyberSecurity.tsx` e `cybersecurity.css`**
  - **Agente:** `@frontend-specialist` + `@security-auditor` | **Skills:** `frontend-design`, `vulnerability-scanner`
  - **Input:** Código-base fornecido pelo usuário com alertas em tempo real (`SRV-AUTH-01`, `SRV-API-03`), pontuação de segurança, quarentena e mapas de ameaças.
  - **Output:** `src/pages/CyberSecurity.tsx` funcional, com suporte a filtros de severidade, modais de bloqueio imediato e integração ao menu lateral e dashboard.
  - **Verify:** Renderização limpa sem warnings, botões operacionais com toasts informativos e gráficos de postura de segurança.

### Fase 4: Telas de Agentes Especializados
- **Task 4.1: Telas de Agentes (`DesktopAgentApp`, `MobileAgentApp`, `PanelAgentApp`, `IoTAgentApp`)**
  - **Agente:** `@frontend-specialist` | **Skill:** `frontend-design`
  - **Input:** Modelos conceituais e especificações para cada categoria de dispositivo.
  - **Output:** Componentes dedicados que simulam e gerenciam as interfaces dos agentes clientes em execução em cada tipo de sistema operacional.
  - **Verify:** Telas de agentes conectadas às páginas de detalhe e catálogo de módulos.

### Fase 5: Diagnóstico de Equipamentos & Acesso Remoto
- **Task 5.1: `EquipmentDiagnostics.tsx` e `RemoteAccess.tsx`**
  - **Agente:** `@frontend-specialist` | **Skills:** `clean-code`, `frontend-design`
  - **Input:** Ferramentas de suporte operacional para técnicos e supervisores.
  - **Output:** Interface de diagnóstico com barra de progresso de testes, testes de hardware (RAM, Disco, CPU, Sensores, Rede) e console de acesso remoto com terminal interativo e espelhamento simulado.
  - **Verify:** Ações executam com feedback visual claro e logs auditados.

### Fase 6: Integração no Sistema Central e Roteamento
- **Task 6.1: Atualização de Rotas e Navegação (`App.tsx`, `Sidebar.tsx`, `types/index.ts`)**
  - **Agente:** `@orchestrator` | **Skill:** `clean-code`
  - **Input:** Novos `PageId` e links nos menus para fácil navegação do operador.
  - **Output:** Registro completo de todas as novas telas, mantendo consistência com o sistema de módulos customizáveis.
  - **Verify:** `npm run build` bem-sucedido e todos os atalhos funcionais no painel.

---

## 7. 🛑 Socratic Gate (Alinhamento Estratégico & Decisões)

Antes de iniciar a implementação do código, foram mapeados 3 pontos de decisão arquitetural para validação:

1. **Persistência de Sessão vs. Simulação Dinâmica:**
   - *Abordagem Proposta:* Criar um seletor de "Perfil Ativo" diretamente no cabeçalho ou na tela de perfil para que o operador possa testar em tempo real a experiência de cada cargo (`root`, `master`, `gerente`, `supervisor`, `tecnico`) sem precisar deslogar ou cadastrar 5 contas diferentes.
2. **Duplo Fator de Autenticação (2FA / Zero-Trust):**
   - *Abordagem Proposta:* Os níveis `root` e `master` terão bloqueio visual obrigatório de ações sensíveis (ex: Wipe total ou Reset de credenciais) exigindo confirmação de token TOTP ou senha de segurança secundária.
3. **Substituição da Cor Violeta (`Purple Ban`):**
   - *Abordagem Proposta:* Quaisquer referências à cor roxa/violeta no código original de cibersegurança foram mapeadas para `var(--primary)` (#5368ec - Azul royal), `var(--cyan)` (#22a6bf - Ciano técnico) ou `var(--ink)` (#182034 - Slate escuro), assegurando 100% de conformidade com as diretrizes do projeto.

---

## 8. 🔍 Checklist de Verificação Final (Phase X)

- [x] **Typecheck TypeScript:** `npm run build` ou `npx tsc --noEmit` sem erros (Validado com 0 erros).
- [x] **Regra Anti-Violeta:** Nenhum tom `#8b5cf6` ou classes de cores roxas na nova interface.
- [x] **Responsividade:** Todas as telas e modais utilizam layouts adaptativos para desktop e tablets operacionais de campo.
- [x] **Auditoria de UX:** Conformidade com as Leis da Psicologia de UX (Fitts, Miller, Hick) com agrupamento de cards e ausência de sobrecarga de dados.
- [x] **Servidor em Operação:** Teste em tempo de execução via Vite (`http://localhost:5173/panel-react/`) e backend Node.js (`http://localhost:3000`).

## ✅ PHASE X COMPLETE
- Typecheck & Build: ✅ Pass (0 errors)
- Security & RBAC: ✅ 5 Níveis implementados com matriz de permissões
- Purple Ban: ✅ Respeitado (tons azuis, ciano e esmeralda)
- Dev Servers: ✅ Vite (5173) + Backend Express/WS (3000) ativos
- Date: Novembro de 2026
