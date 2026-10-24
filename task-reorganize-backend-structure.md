# Plano de Tarefa: Reorganização da Arquitetura do Projeto (Clean Monorepo)

**Status:** Em Execução  
**Data:** 24/10/2026  
**Objetivo:** Centralizar todos os módulos, controladores, rotas, modelos, serviços e o entrypoint do backend em uma pasta dedicada `backend/`, mantendo a raiz do projeto limpa, modular e compreensível, sem quebrar nenhuma funcionalidade existente.

---

## 1. Visão Geral da Nova Estrutura

```
Servidor-Unificado/
├── backend/                  <-- NÚCLEO DO SERVIDOR CENTRALIZADO
│   ├── config/               (banco, logs, validação, chaves RSA)
│   ├── controllers/          (lógica de controladores de agentes e painel)
│   ├── middleware/           (auth, deviceAuth, rate limiters, error, etc.)
│   ├── models/               (schemas do Mongoose)
│   ├── routes/               (rotas Express modulares e públicas)
│   ├── services/             (WebSocket, cache, impressoras, dynamic loader)
│   ├── utils/                (assinatura RSA, helpers, métricas)
│   └── server.js             (entrypoint principal do servidor HTTP/WS)
├── frontend/                 <-- Painel Web Administrativo SPA
├── clients/                  <-- Aplicações cliente
│   ├── desktop/              (Agente Electron Windows/Linux)
│   └── mobile/               (Agente Android/iOS React Native Expo)
├── agents/                   <-- Agente Python de monitoramento USB de impressoras
├── docs/                     <-- Documentação Técnica e Corporativa
│   ├── planejamento/         (mdm-action-plan.md, etc.)
│   ├── marketing/            (post_linkedin.txt, etc.)
│   └── relatorio_adequacao_mdm/
├── public/                   <-- Arquivos estáticos de download (APKs, executáveis)
├── scripts/                  <-- Scripts operacionais e de manutenção
├── tests/                    <-- Bateria de testes de integração e endpoints
├── iniciar.bat               <-- Launcher Windows com checagem automática de MongoDB e Node
├── package.json              <-- Scripts de execução atualizados para 'backend/server.js'
├── Dockerfile                <-- Containerização atualizada
└── .env                      <-- Variáveis de ambiente
```

---

## 2. Etapas de Execução

- [ ] **Etapa 1: Criação da pasta `backend/` e migração dos arquivos do servidor**
  - Mover `config/`, `controllers/`, `middleware/`, `models/`, `routes/`, `services/`, `utils/`, `server.js` para `backend/`.
- [ ] **Etapa 2: Organização de arquivos soltos na raiz**
  - Criar `docs/planejamento/` e mover `mdm-action-plan.md`.
  - Criar `docs/marketing/` e mover `post_linkedin.txt`.
  - Excluir o arquivo redundante com erro de digitação `inciar.bat`.
- [ ] **Etapa 3: Ajuste de caminhos e referências**
  - No `backend/server.js`: configurar `ROOT_DIR`, `PUBLIC_DIR` e `FRONTEND_DIR` canônicos; ajustar path do `assetStatusUpdater`.
  - Em `backend/routes/`: ajustar paths para `public/` em `publicRoutes.js`, `serverRoutes.js` e `provisioningRoutes.js`.
  - No `package.json`: atualizar `"main": "backend/server.js"`, `"start": "node backend/server.js"`, `"dev": "nodemon backend/server.js"`.
  - No `iniciar.bat`: atualizar chamada para `node backend/server.js`.
  - No `Dockerfile` e `railway.toml`: atualizar entrypoint para `backend/server.js`.
  - Em `tests/test_full_suite.js`: atualizar imports relativos para `../backend/utils` e `../backend/config`.
  - Em `scripts/`: atualizar caminhos para `../backend/models`, `../backend/services`, etc.
- [ ] **Etapa 4: Validação e Testes de Regressão**
  - Executar linter (`npm run lint`).
  - Iniciar o servidor em background.
  - Executar `npm test` (garantir 23 testes passando).
  - Executar `npm run test:endpoints`.
  - Gerar documentação técnica em `docs/relatorio_adequacao_mdm/FASE_5_REORGANIZACAO_ARQUITETURA.md`.
