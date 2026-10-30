# Migração do Frontend para React (TypeScript) em Paralelo

## Objetivo
Criar uma aplicação moderna em **React + TypeScript + Vite** na pasta `frontend-react/`, implementando com fidelidade máxima o layout, design system corporativo (DM Sans/Manrope), telas de MDM fornecidas e integrando módulos dedicados para **Impressoras** e **Totens**, mantendo o frontend legado intacto durante o desenvolvimento.

## Tarefas

- [x] **Fase 1: Setup do Projeto Vite + React + TypeScript**
  - Inicializar `frontend-react/` com Vite, React 18/19, TypeScript e Vite Proxy para backend (`/api`, `/ws`).
  - Configurar `index.html` com fontes Google Fonts (*DM Sans* e *Manrope*) e favicon.
  - Integrar os tokens de design e estilos globais em `src/styles/index.css`.
  - → *Verificação:* Executar `npm run build` em `frontend-react/` sem erros de tipagem.

- [x] **Fase 2: Arquitetura de Componentes Core & Design System**
  - Implementar biblioteca de ícones vetoriais SVG (`src/components/Icon.tsx`) incluindo ícones de impressora e totem.
  - Implementar componentes reutilizáveis (`Button`, `StatusBadge`, `MetricCard`, `TableTools`, `Logo`).
  - Criar o Shell (`Sidebar`, `Header/Topbar`, `AppShell`) com responsividade e menu categorizado contendo MDM + Impressoras + Totens.
  - Implementar tela de autenticação Split-Screen (`Login.tsx`) conectada a JWT/sessão.
  - → *Verificação:* Renderizar AppShell e Login no navegador com alternância de tema e responsividade móvel.

- [x] **Fase 3: Páginas Principais de Operação (Core MDM)**
  - Implementar `Dashboard.tsx` (Métricas, Gráfico SVG de conformidade, atividade recente e frotas por SO).
  - Implementar `Assets.tsx` (Tabela com filtros dinâmicos, contadores de conformidade e paginação).
  - Implementar `DeviceDetail.tsx` (Score de saúde 98/100, hardware, gauges de armazenamento/memória e timeline).
  - → *Verificação:* Navegar entre Dashboard, Ativos e Ficha do Dispositivo verificando layout e estados.

- [x] **Fase 4: Módulos de Impressoras e Totens**
  - Implementar `Printers.tsx` (Painel com status de suprimentos/toner, filas, alertas e contadores de páginas baseado no backend existente).
  - Implementar `Totems.tsx` (Monitoramento de totens, status de periféricos: leitor, impressora térmica, tela touch, comandos rápidos).
  - → *Verificação:* Acessar novas rotas de menu lateral e verificar cartões de métricas e tabelas de status.

- [x] **Fase 5: Provisionamento, Comandos Remotos e Diagnóstico**
  - Implementar `Provisioning.tsx` (Wizard guiado em 4 etapas) e `ProvisionQr.tsx` (QR Code de auto-inscrição e links seguros).
  - Implementar `Commands.tsx` (Seletor de ações remotas, terminal bash integrado e histórico).
  - Implementar `Diagnostics.tsx` (Scan ring animado, checklist de integridade e recomendações).
  - → *Verificação:* Testar avanço e recuo no wizard de provisionamento e simulação de comandos.

- [x] **Fase 6: Gestão, Segurança, Auditoria e Relatórios**
  - Implementar `Modules.tsx` (Chaves *toggle* reativas de capacidades MDM).
  - Implementar `Policies.tsx` e `Groups.tsx` (Matriz de conformidade e árvore hierárquica de grupos).
  - Implementar `Admin.tsx`, `UserCreate.tsx` e `Profile.tsx` (Gestão de acessos, 2FA e permissões).
  - Implementar `Audit.tsx`, `ServerStatus.tsx` e `Reports.tsx` (Trilha de auditoria, uptime de microsserviços e sparklines).
  - Implementar `AppCatalog.tsx`, `Agent.tsx`, `AgentDownloads.tsx` e `MobileApp.tsx` (Distribuição e vitrine mobile).
  - → *Verificação:* Navegar por todas as 22 telas sem erros de runtime ou alertas de layout.

- [x] **Fase 7: Integração com Backend e Scripts de Validação**
  - Configurar serviço de API (`src/services/api.ts`) com autenticação e endpoints centralizados.
  - Adicionar script no `package.json` raiz (`npm run dev:react` e `npm run build:react`).
  - Atualizar `backend/server.js` com rota `/panel-react` para servir a nova build em paralelo com o `/panel` legado.
  - Executar build de produção sem erros de TypeScript (`tsc -b && vite build`).
  - → *Verificação:* Build de produção gerada em `frontend-react/dist` e servida com sucesso.
