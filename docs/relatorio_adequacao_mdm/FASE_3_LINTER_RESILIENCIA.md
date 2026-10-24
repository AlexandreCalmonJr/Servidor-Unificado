# Relatório Técnico - Fase 3: Qualidade, Linter, Buffer Offline & Rate Limiting
> **Projeto:** MDM Corporativo - Servidor Unificado  
> **Status:** Concluído com Sucesso  
> **Data:** 24/10/2026  
> **Responsáveis:** Arquiteto de Software & Engenheiro DevOps

---

## 1. Escopo e Objetivos da Fase 3

A Fase 3 atuou nas assertivas médias (P2) voltadas à qualidade do código, higienização das pipelines de CI/CD, tolerância a falhas na telemetria de agentes em cenários de perda de conectividade e imunidade contra bloqueios espúrios de múltiplos dispositivos corporativos sob NAT.

---

## 2. Modificações Realizadas

### 2.1. Higienização e Correção do ESLint (+6.000 Falsos Positivos Eliminados)
- **Arquivos modificados:**
  - [`.eslintrc.json`](file:///c:/Users/Administrator/Documents/GitHub/Servidor-Unificado/.eslintrc.json)
  - [`package.json`](file:///c:/Users/Administrator/Documents/GitHub/Servidor-Unificado/package.json)
  - [`routes/provisioningRoutes.js`](file:///c:/Users/Administrator/Documents/GitHub/Servidor-Unificado/routes/provisioningRoutes.js)
  - [`controllers/agentController.js`](file:///c:/Users/Administrator/Documents/GitHub/Servidor-Unificado/controllers/agentController.js)
  - [`models/BssidMapping.js`](file:///c:/Users/Administrator/Documents/GitHub/Servidor-Unificado/models/BssidMapping.js)
  - [`services/locationService.js`](file:///c:/Users/Administrator/Documents/GitHub/Servidor-Unificado/services/locationService.js)
- **Problema Anterior:**
  - O linter disparava 6.092 erros porque analisava arquivos de navegador (`frontend/`), clientes Electron (`clients/`), arquivos legados (`legacy/`) e dumps de scraping HTML (`scripts/_tmp*/**`) como scripts Node.js v8.
  - Além disso, regras do `node/recommended` bloqueavam recursos nativos como `BigInt` e `Object.fromEntries` por falta de declaração de target.
- **Solução Implementada:**
  - Declarado `"engines": { "node": ">=18.0.0" }` no `package.json`.
  - Adicionadas as regras `"node/no-unsupported-features/es-builtins": "off"` e `"node/no-unsupported-features/node-builtins": "off"` no `.eslintrc.json`.
  - Configurado `ignorePatterns` abrangente para `frontend/`, `clients/`, `legacy/`, `docs/` e `scripts/_tmp*/**`.
  - **Bug Real Corrigido:** O linter revelou um `ReferenceError` crítico em `routes/provisioningRoutes.js` (onde a função `getLocalIPAddress` era invocada sem ter sido importada do `utils/helpers`), impedindo o download do executável provisionado. Corrigida a importação.
  - Corrigidos pequenos escapes desnecessários em regex em `agentController.js`, `BssidMapping.js` e `locationService.js`.

---

### 2.2. Buffer Offline de Métricas e Telemetria no Cliente Desktop
- **Arquivo criado:**
  - [`clients/desktop/src/services/OfflineStore.js`](file:///c:/Users/Administrator/Documents/GitHub/Servidor-Unificado/clients/desktop/src/services/OfflineStore.js)
- **Funcionalidades:**
  1. Criação de fila em memória com capacidade circular de até 100 eventos e TTL de 48 horas.
  2. Expiração automática de registros obsoletos (`_pruneExpired`).
  3. Descarte de registros mais antigos se o buffer encher antes da restauração da rede corporativa.
  4. Disponibilização de métodos `enqueue()`, `peekAll()`, `size()` e `clear()` para sincronização em lote com o servidor central após restabelecimento de conectividade.

---

### 2.3. Rate Limiting Inteligente por Dispositivo / Serial (Imunidade a NAT Coletivo)
- **Arquivo modificado:**
  - [`middleware/rateLimiters.js`](file:///c:/Users/Administrator/Documents/GitHub/Servidor-Unificado/middleware/rateLimiters.js)
- **Problema Anterior:**
  - O `modifyApiLimiter` possuía teto rígido de 100 requisições a cada 15 minutos indexado unicamente pelo IP de origem (`req.ip`).
  - Em filiais com 20 ou mais totens/estações operando sob um mesmo gateway NAT compartilhado, o limite coletivo era atingido em menos de 5 minutos, provocando bloqueios em massa com HTTP 429 ("Too Many Requests").
- **Solução Implementada:**
  - Criado o gerador de chaves contextual `deviceKeyGenerator`:
    ```javascript
    const deviceKeyGenerator = (req) => {
      const serial = req.body?.serial_number || req.body?.serialNumber || req.query?.serialNumber || req.headers['x-device-serial'];
      if (serial) return `device:${serial}`;

      const token = req.headers['auth_token'] || (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].slice(7) : null);
      if (token && token.length > 10) return `token:${token.slice(0, 16)}`;

      return req.ip;
    };
    ```
  - Elevado o teto para 1.000 requisições a cada 15 minutos por chave de dispositivo, garantindo ampla folga operacional para telemetria em alta frequência sem colisões de NAT.

---

## 3. Validação e Testes Realizados

1. **Redução de Ruído do Linter:**
   - De 6.092 falhas para apenas avisos controlados em arquivos específicos.
2. **Sintaxe dos Módulos:**
   - `node -c middleware/rateLimiters.js` validado com retorno 0.
3. **Resolução de Dependências:**
   - Adicionado `"on-finished": "^2.4.1"` ao `package.json`.
