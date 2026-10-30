# Servidor MDM Unificado (v2.0.0)

> Plataforma centralizada de Gerenciamento de Dispositivos Móveis (MDM), Terminais de Autoatendimento (Totems), Desktops Corporativos, Impressoras e Ativos de TI em Tempo Real.

[![CI - MDM Servidor Unificado](https://github.com/AlexandreCalmonJr/Servidor-Unificado/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexandreCalmonJr/Servidor-Unificado/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![OpenAPI 3.0](https://img.shields.io/badge/OpenAPI-3.0-green.svg)](http://localhost:3000/api-docs)

---

## 🌟 Visão Geral da Arquitetura

O **Servidor MDM Unificado** foi completamente modernizado, estruturado e endurecido através de um plano de modernização de 6 fases (P0 a P5), com cobertura de testes automatizados ponta-a-ponta (198 asserções).

```
┌───────────────────────────────────────────────────────────────┐
│                     CLIENTES / AGENTES                        │
│  (Desktop Agent, Totem Agent, Mobile App, Impressoras SNMP)   │
└──────────────┬──────────────────────────────┬─────────────────┘
               │ HTTPS (Port 443)             │ WSS (/ws)
               ▼                              ▼
┌───────────────────────────────────────────────────────────────┐
│              REVERSE PROXY TLS (Caddy / Nginx)                │
│    Terminação SSL/TLS Automática + HSTS + WebSocket Proxy     │
└──────────────────────────────┬────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────┐
│               MDM BACKEND SERVICE (Node.js 20+)               │
│                                                               │
│  ┌───────────────────────┐       ┌─────────────────────────┐  │
│  │   Segurança e Auth    │       │  Validação & Contratos  │  │
│  │ Dual-Mode JWT/dev_tok │       │  JSON Schema (Ajv)      │  │
│  │ Quarentena e Rotação  │       │  OpenAPI 3.0 / Swagger  │  │
│  └───────────────────────┘       └─────────────────────────┘  │
│  ┌───────────────────────┐       ┌─────────────────────────┐  │
│  │ Performance & Escala  │       │     Tempo Real (WS)     │  │
│  │ Paginação Híbrida     │       │ Backoff + Jitter        │  │
│  │ Agregação $facet/N+1  │       │ StateStore Reativo      │  │
│  └───────────────────────┘       └─────────────────────────┘  │
└──────────────┬──────────────────────────────┬─────────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│       MongoDB Database       │ │      Redis Cache (Opt)       │
│  Índices Compostos + Ativos  │ │  Sessões e Métricas Rápidas  │
└──────────────────────────────┘ └──────────────────────────────┘
```

---

## 🛡️ Principais Recursos e Diferenciais

### 1. Segurança & Hardening (Fases P0 e P1)
- **Credenciais Individuais por Dispositivo:** Enroll automático com geração de tokens `dev_<hex>`, persistidos exclusivamente sob hash SHA-256 com suporte a dual-mode (compatibilidade retroativa com token global).
- **Gestão de Quarentena e Revogação:** Dispositivos comprometidos podem ser postos em quarentena imediatamente, bloqueando execução e recebimento de comandos remotos (código `DEVICE_IN_QUARANTINE`).
- **Assinatura Criptográfica Assimétrica (RSA-SHA256):** Todos os comandos remotos enviados para os agentes recebem assinatura criptográfica com chave privada, impedindo ataques de adulteração e falsificação em trânsito.
- **Docker Secrets Fallback:** Carregamento seguro de segredos de `/run/secrets/` com fallback para variáveis de ambiente sem expor senhas em texto puro nos manifests.
- **Proteção contra Mass Assignment:** Sanitização restrita de campos sensíveis (`is_deleted`, `token_hash`, `device_token`).

### 2. Contratos Canônicos & Schemas JSON (Fase P2)
- **Validação com Ajv (JSON Schema Draft-07):** Rejeição imediata de telemetrias corrompidas (`SCHEMA_VALIDATION_ERROR`).
- **Normalização Automática de Grandezas:**
  - Memória RAM padronizada em inteiros (`MB`).
  - Armazenamento em disco padronizado em inteiros (`GB`).
  - Bateria tratada com valor percentual válido ou `null` (sem valores corrompidos `-1%`).
- **Separação de Conectividade e Saúde:** `status` reflete conexão de rede (`online`, `offline`), enquanto `health_status` e `health_issues` refletem falhas de periféricos, impressoras e hardware.
- **Documentação OpenAPI 3.0 / Swagger UI:** Disponível em `/api-docs` e `/api-docs.json`.

### 3. Alta Performance & Eliminação de N+1 (Fase P3)
- **Paginação Híbrida (Cursor e Offset):** Suporte nativo a cursor estável baseado em `{ last_seen, _id }` com cast seguro de `ObjectId` no MongoDB.
- **Projeção Enxuta Padrão:** Listagens padrão omitem árvores pesadas de software e histórico, reduzindo o payload de **~1 MB para < 50 KB** (corte de 95% de uso de banda).
- **Agregações em Passagem Única:**
  - `GET /api/modules`: contagens de ativos agrupadas em uma única query MongoDB `$group`.
  - `GET /api/modules/:moduleId/stats`: cálculo de estatísticas em passagem única via pipeline `$facet` com invalidação ativa de cache em mutações.

### 4. Tempo Real & Frontend Fluido (Fase P4)
- **`StateStore` Reativo Único ([`frontend/js/state-store.js`](frontend/js/state-store.js)):** Padrão PubSub centralizado que elimina inconsistências de dados entre telas, modais e cards sem recarregar a página.
- **WebSocket com Backoff Exponencial e Jitter:** Intervalos dinâmicos de 1s a 30s com aleatoriedade para mitigar tempestade de reconexão.
- **Atualização Atômica no DOM:** O WebSocket altera pontualmente apenas as células de status (`data-asset-id`) e contadores dos módulos, garantindo zero oscilação visual (*zero flickering*).

### 5. Containers e CI/CD (Fase P5)
- **Dockerfile Multi-Stage:** Imagem Alpine minimalista, executando sob usuário `nodejs` (non-root) e com `dumb-init` como entrypoint.
- **Docker Compose com Secrets:** Configuração de produção com top-level secrets, limites de recursos e perfil TLS com Caddy (`--profile proxy`).
- **GitHub Actions CI:** Workflow automatizado em cada push/PR executando lint, MongoDB 6.0 service container, 6 suítes de testes e build de imagem Docker.

---

## 🚀 Como Iniciar

### Pré-requisitos
- Node.js >= 18.0.0 (recomendado v20.x ou v22.x)
- MongoDB >= 5.0 (ativo localmente em `localhost:27017` ou via Docker)
- Docker e Docker Compose (opcional para execução em container)

### 1. Execução Local com Node.js

```bash
# 1. Instalar dependências
npm ci --legacy-peer-deps

# 2. Configurar variáveis de ambiente
cp .env.example .env

# 3. Gerar chaves criptográficas para assinatura de comandos (se não existirem)
node scripts/generateCommandKeys.js

# 4. Criar usuário administrador padrão
node scripts/createAdminUser.js

# 5. Iniciar o servidor
npm start
```

O servidor estará disponível em:
- **Painel Administrativo:** http://localhost:3000
- **Swagger / OpenAPI 3.0:** http://localhost:3000/api-docs
- **Healthcheck:** http://localhost:3000/health
- **Métricas:** http://localhost:3000/metrics

### 2. Execução com Docker Compose

```bash
# Modo padrão (Backend + MongoDB + Redis)
docker compose up -d

# Modo produção com terminação TLS automática (Caddy na porta 80/443)
docker compose --profile proxy up -d
```

---

## 🧪 Bateria de Testes Automatizados

O projeto conta com suítes de testes automatizados modulares cobrindo todas as camadas arquiteturais:

```bash
# Executar a Full Suite de integração geral
npm test

# Executar bateria de segurança e hardening (P0)
node tests/test_p0_security.js

# Executar bateria de identidade e credenciais (P1)
node tests/test_p1_identity.js

# Executar bateria de validação de schemas e contratos (P2)
node tests/test_p2_contract_integrity.js

# Executar bateria de performance e paginação (P3)
node tests/test_p3_performance.js

# Executar bateria de frontend e tempo real (P4)
node tests/test_p4_frontend_realtime.js

# Executar bateria de infraestrutura e containers (P5)
node tests/test_p5_infrastructure.js
```

### Resultados da Validação

```
=================================================================
📊 PAINEL CONSOLIDADO DE TESTES DO SISTEMA MDM
=================================================================
  ✅ P0 — Security Hardening            (21/21 passed)
  ✅ P1 — Identidade e Transporte       (25/25 passed)
  ✅ P2 — Contrato de API e Schemas     (28/28 passed)
  ✅ P3 — API e Performance             (31/31 passed)
  ✅ P4 — Tempo Real e Frontend         (30/30 passed)
  ✅ P5 — Infraestrutura e CI/CD        (40/40 passed)
  ✅ Full Suite de Integração Geral     (23/23 passed)
-----------------------------------------------------------------
  🎉 TOTAL: 198/198 TESTES APROVADOS (100% DE SUCESSO)
=================================================================
```

---

## 📁 Estrutura de Diretórios

```
Servidor-Unificado/
├── .github/workflows/       # Pipelines de CI/CD (GitHub Actions)
├── backend/
│   ├── config/              # Secrets, banco e validação de ambiente
│   ├── controllers/         # Regras de negócio e controllers de rotas
│   ├── docs/                # Especificação OpenAPI 3.0 (openapi.json)
│   ├── middleware/          # Auth, JWT, deviceAuth, schemas e rate-limiters
│   ├── models/              # Schemas Mongoose (ManagedAsset, User, etc.)
│   ├── routes/              # Rotas REST da API
│   ├── schemas/             # JSON Schemas Draft-07 (Ajv)
│   ├── services/            # WebSocket, Cache e Notificações
│   └── utils/               # Factory de ativos, paginação e normalização
├── deploy/                  # Templates de reverse proxy (Caddyfile, nginx.conf)
├── frontend/
│   ├── css/                 # Design system modular (tokens, layout, feedback)
│   ├── js/                  # StateStore, WebSocket client, módulos e views
│   └── index.html           # Painel Administrativo SPA
├── scripts/                 # Scripts operacionais (chaves, admin, migração)
├── secrets/                 # Chaves assimétricas e segredos locais (não commitados)
├── tests/                   # Baterias automatizadas de testes (P0 a P5 + full)
├── Dockerfile               # Dockerfile multi-stage otimizado
└── docker-compose.yml       # Orquestração de containers com secrets e proxy
```

---

## 📜 Licença

Distribuído sob a licença MIT. Consulte `LICENSE` para mais informações.
