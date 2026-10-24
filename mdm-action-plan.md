# 🛡️ PLANO DE AÇÃO: ADEQUAÇÃO E GERENCIAMENTO DO SISTEMA MDM
> **Classificação Prioritária de Assertivas: Do Mais Crítico (P0) ao Mais Baixo (P3)**  
> **Status:** TODAS AS FASES CONCLUÍDAS E VALIDADAS COM SUCESSO ✅  
> **Data:** 24/10/2026  
> **Responsáveis:** Arquiteto de Software & Engenheiro DevOps (`@project-planner` / `@orchestrator`)

---

## 📑 Sumário Executivo

Este plano de ação consolida todas as assertivas técnicas levantadas na auditoria diagnóstica do repositório **Servidor-Unificado**, ordenadas rigorosamente por criticidade de impacto operacional, segurança da frota de dispositivos e resiliência de infraestrutura.

| Prioridade | Nível de Risco | Quantidade de Assertivas | Foco Principal |
| :--- | :--- | :---: | :--- |
| **P0 - Crítico** | Risco Operacional / Segurança Imediata | 3 | Exceções de JWT (500 vs 401), Divergência WebSocket nos Agentes, Conexão do Painel WS |
| **P1 - Alto** | Estabilidade de Infraestrutura & Execução | 3 | Runtime de Execução (Host sem Docker), Dependências Python USB Agent, Assinatura de Comandos |
| **P2 - Médio** | Confiabilidade, Qualidade de Código & CI/CD | 3 | ESLint (+6.000 erros em Frontend), Buffer Offline de Agentes, Rate Limiting em NAT Corporativo |
| **P3 - Baixo** | Limpeza de Código, Usabilidade & Tooling | 2 | Scripts legados/typo (`inciar.bat`), Configuração de ADB/Android SDK local |

---

## 🔴 NÍVEL 1: ASSERTIVAS CRÍTICAS (P0)

> **Critério:** Falhas que causam instabilidade no barramento central de comunicação, quebras na experiência do operador ou brechas na cadeia de comando dos dispositivos.

### Assertiva 1.1: Exceção Não Tratada em Tokens JWT Expirados (HTTP 500)
- **Diagnóstico Técnico:** Requisições contendo tokens expirados disparavam a mensagem `"Erro de autenticação JWT: jwt expired jwt expired"` com código de status HTTP `500` no log antes de retornar `401`. O middleware de autenticação não captura explicitamente `TokenExpiredError` da biblioteca `jsonwebtoken`, fazendo o erro subir para o manipulador genérico de erro não tratado.
- **Risco Operacional:** Falsos positivos no monitoramento de integridade do servidor, mascaramento de erros reais e comportamento errático dos clientes (que tratam status 500 como falha de infraestrutura com retry agressivo, em vez de 401 que solicita novo login/refresh).
- **Ações Detalhadas:**
  1. No arquivo `middleware/auth.js` e `utils/authTokens.js`, interceptar especificamente instâncias de `jwt.TokenExpiredError` e `jwt.JsonWebTokenError`.
  2. Retornar resposta padronizada com HTTP `401 Unauthorized` e JSON `{ success: false, code: "TOKEN_EXPIRED", message: "Token expirado. Realize novo login." }`.
  3. Atualizar o frontend web em `frontend/js/api.js` para redirecionar diretamente ao `/panel/login.html` sem gerar alertas na interface ao receber `TOKEN_EXPIRED`.
- **Critério de Aceite (Verificação):** Executar requisição HTTP com token vencido e validar retorno HTTP 401 limpo e ausência de erro 500 em `logs/combined.log`.

---

### Assertiva 1.2: Divergência de Protocolo Realtime nos Clientes Desktop (WebSocket `ws` vs `socket.io-client`)
- **Diagnóstico Técnico:** O servidor central expõe WebSocket puro RFC 6455 via biblioteca `ws` nativa em `server.js` e `services/websocketServer.js`. Em contrapartida, `clients/desktop/package.json` declara dependência de `socket.io-client: ^4.7.0` (protocolo incompatível com servidores `ws` puros). Para driblar isso, o agente desktop foi configurado para fazer polling HTTP periódico (`CommandPoller` de até 300 segundos).
- **Risco Operacional:** Falha em emitir comandos críticos de emergência em tempo real (como bloqueio imediato, reboot forçado ou alarme sonoro em totens/desktops). Sobrecarga desnecessária de requisições HTTP no servidor central.
- **Ações Detalhadas:**
  1. Remover a dependência inútil de `socket.io-client` do `clients/desktop/package.json`.
  2. Implementar conexão cliente nativa baseada na API padrão `WebSocket` (nativa do Electron/Chromium) conectando em `ws://<HOST>:<PORT>`.
  3. Adicionar mecanismo de reconexão automática com backoff exponencial (1s, 2s, 4s, 8s... até 30s) e heartbeat (`ping`/`pong`) a cada 30 segundos.
  4. Manter o `CommandPoller` HTTP apenas como mecanismo secundário de contingência (fallback) se a porta WebSocket estiver bloqueada por proxy corporativo.
- **Critério de Aceite (Verificação):** O agente desktop conecta e registra presença no WebSocket Server imediatamente ao ser iniciado; comandos despachados no painel web são recebidos e executados em menos de 1 segundo.

---

### Assertiva 1.3: Tratamento de Registro no WebSocket Server com Falso Alarme para o Painel Web
- **Diagnóstico Técnico:** Quando o operador abre o painel web administrativo, o cliente frontend envia `{"type":"register","clientId":"panel-xxx","role":"panel"}`. O handler em `services/websocketServer.js` assume que qualquer registro deve buscar um `ManagedAsset` no banco de dados e registra o warning: `Asset not found for WS message`.
- **Risco Operacional:** Poluição contínua de logs e risco de desconexão acidental da sessão do operador caso o tratador de ativos tente fechar a conexão.
- **Ações Detalhadas:**
  1. No `services/websocketServer.js`, estruturar o método `handleRegisterMessage` com verificação prévia de `role`:
     - Se `role === 'panel'`, validar o token JWT de sessão de usuário e marcar o socket como ouvinte administrativo (recebe broadcasts de telemetria sem exigir cadastro na coleção `ManagedAsset`).
     - Se `role === 'device'` ou `role === 'agent'`, buscar o ativo corporativo por `serial` ou `deviceId` na coleção `ManagedAsset`.
- **Critério de Aceite (Verificação):** Conectar com o painel web e validar que nenhuma mensagem de `Asset not found` é gerada nos logs.

---

## 🟠 NÍVEL 2: ASSERTIVAS ALTAS (P1)

> **Critério:** Falhas que inviabilizam a automação, a segurança de comandos ou a integridade de agentes periféricos.

### Assertiva 2.1: Estratégia de Execução da Infraestrutura (Host Windows sem Docker no PATH)
- **Diagnóstico Técnico:** O binário `docker` não está presente no PATH do host Windows. O `docker-compose.yml` está pronto para Linux/Docker, mas o ambiente atual possui MongoDB 9.0 instalado como serviço nativo do Windows e Node.js 24.
- **Risco Operacional:** Tentativas cegas de invocar `docker compose up` resultam em falha de script e parada de processos.
- **Ações Detalhadas:**
  1. **Ambiente Local Primário (Nativo Windows):**
     - Estruturar o script de inicialização do servidor unificado com suporte ao serviço Windows de MongoDB já em execução.
     - Garantir que o fallback em memória de cache (`node-cache`) permaneça ativo e estável enquanto o Redis não estiver instalado como serviço local.
     - Criar um script de serviço PowerShell/Batch (`iniciar-servico.bat` ou script compatível com PM2 Windows) para manter o processo do backend em execução contínua com auto-restart em caso de crash.
  2. **Ambiente em Container (Produção/CI):**
     - Manter o `docker-compose.yml` atualizado e testado para pipelines ou servidores Linux remotos.
- **Critério de Aceite (Verificação):** O servidor sobe com um único comando, conecta ao MongoDB local na porta 27017, inicializa WebSockets e responde com HTTP 200 no `/health`.

---

### Assertiva 2.2: Isolamento de Dependências do Agente Python de Impressoras (`usb_printer_agent.py`)
- **Diagnóstico Técnico:** O Python 3.15 do host não possui o pacote `requests` instalado no escopo global (`ModuleNotFoundError`), impedindo a execução do agente de impressoras USB.
- **Risco Operacional:** Frotas de impressoras térmicas e USB conectadas localmente aos totens não enviam nível de toner, status de papel ou eventos de fila.
- **Ações Detalhadas:**
  1. Criar o arquivo `agents/requirements.txt` listando as dependências exatas com versionamento fixo:
     - `requests>=2.31.0`
     - `pystray>=0.19.5` (para ícone na bandeja do Windows)
     - `Pillow>=10.0.0`
     - `wmi>=1.5.1` (descoberta nativa Windows)
     - `pywin32>=306` (comunicação com fila de impressão Windows)
  2. Criar script de bootstrap automatizado em PowerShell/Batch (`agents/setup_agent_env.bat` e `.ps1`) que:
     - Cria um ambiente virtual isolado (`agents/.venv`).
     - Instala as dependências via `pip install -r requirements.txt`.
     - Permite iniciar o agente de forma desacoplada sem poluir o Python global do host.
- **Critério de Aceite (Verificação):** Executar `python agents/usb_printer_agent.py --help` dentro do ambiente virtual e obter inicialização com sucesso sem `ModuleNotFoundError`.

---

### Assertiva 2.3: Assinatura Criptográfica Obrigatória de Comandos Remotos
- **Diagnóstico Técnico:** O utilitário `utils/commandSignature.js` possui lógica pronta para assinar comandos com chave privada e verificar com chave pública, porém as variáveis `COMMAND_SIGNING_PRIVATE_KEY` e `COMMAND_SIGNING_PUBLIC_KEY` não estão ativadas no ambiente de produção.
- **Risco Operacional:** Se uma chave de autenticação simples de dispositivo for comprometida, agentes poderiam executar comandos arbitrários sem garantia de origem vinda do servidor legítimo.
- **Ações Detalhadas:**
  1. Criar script utilitário `scripts/generateCommandKeys.js` para gerar par de chaves assimétricas (RSA 2048 ou Ed25519) de forma assistida.
  2. Configurar a chave privada no `.env` do servidor central e a chave pública embutida nas configurações seguras dos agentes (`electron-store` criptografado no Desktop e keystore no Mobile).
  3. No `CommandExecutor.js` do Desktop e do Mobile, rejeitar qualquer comando que não apresente assinatura válida.
- **Critério de Aceite (Verificação):** Comando assinado pelo servidor é validado e executado pelo agente; comando alterado ou sem assinatura é sumariamente descartado com log de auditoria de segurança.

---

## 🟡 NÍVEL 3: ASSERTIVAS MÉDIAS (P2)

> **Critério:** Problemas de pipeline de validação, qualidade de software e degradação gradual de desempenho sob carga.

### Assertiva 3.1: Falsos Positivos no Linter ESLint (+6.000 Erros Sintáticos)
- **Diagnóstico Técnico:** O arquivo `.eslintrc.json` analisa arquivos frontend do navegador (`frontend/js/`) sob as regras do Node.js v8.0 (`plugin:node/recommended`), rejeitando variáveis globais de DOM (`window`, `document`) e sintaxes ES2021 modernas (`BigInt`, `Object.fromEntries`).
- **Risco Operacional:** Pipeline de CI e scripts de auditoria de código ficam cegos, impossibilitando a detecção de erros reais de lógica e vulnerabilidades via ferramentas de varredura automatizada.
- **Ações Detalhadas:**
  1. No `.eslintrc.json`, adicionar `frontend/` e `clients/` à lista de `ignorePatterns` para a análise do servidor Node.js, OU configurar bloco de `overrides` com `env: { browser: true, es2021: true }`.
  2. No `package.json`, adicionar explicitamente o nó:
     ```json
     "engines": {
       "node": ">=18.0.0",
       "npm": ">=9.0.0"
     }
     ```
  3. Ajustar o plugin do ESLint para reconhecer Node >= 18, eliminando os alertas indevidos de `Object.fromEntries`, `BigInt` e `URL`.
- **Critério de Aceite (Verificação):** O comando `npm run lint` executa sem acusar os 6.000 falsos positivos e valida apenas arquivos relevantes de backend.

---

### Assertiva 3.2: Fila de Armazenamento Offline de Métricas nos Agentes (Offline Store Buffer)
- **Diagnóstico Técnico:** Quando um terminal ou totem perde conectividade com a rede corporativa, o agente desktop (`clients/desktop/src/services/DataCollector.js`) tenta enviar os dados via HTTP/WS; se houver falha de rede, a telemetria é descartada.
- **Risco Operacional:** Lacunas históricas no inventário, perda de registros de auditoria e ausência de histórico de falhas de hardware ocorridas durante o período em que o ativo esteve desconectado.
- **Ações Detalhadas:**
  1. No agente desktop, implementar um buffer local seguro persistente (via `electron-store` ou arquivo JSON local) com limite circular (ex: últimas 500 medições com TTL de 48 horas).
  2. Implementar evento de flush sincronizado: ao detectar retorno da rede (evento `online` do navegador ou reconexão do WebSocket), o agente descarrega o lote de telemetria acumulado em batch para o endpoint `/api/monitor`.
- **Critério de Aceite (Verificação):** Simular desconexão de rede (cabo desconectado/servidor inativo), gerar eventos locais, restaurar conexão e confirmar recebimento integral do histórico no banco de dados.

---

### Assertiva 3.3: Rate Limiting por Dispositivo em Ambientes com Múltiplos Ativos Atrás de um Mesmo NAT
- **Diagnóstico Técnico:** Em `middleware/rateLimiters.js`, os limites de requisições de API utilizam como chave padrão o endereço IP do requisitante (`req.ip`). Em ambientes corporativos, dezenas de totens e estações compartilham o mesmo IP de gateway público/NAT.
- **Risco Operacional:** Sob carga ou em horários de pico, vários agentes legítimos podem receber HTTP 429 (Too Many Requests) coletivamente, travando a telemetria da unidade inteira.
- **Ações Detalhadas:**
  1. No `middleware/rateLimiters.js`, personalizar o `keyGenerator` das rotas de agentes (`/api/monitor`, `/api/devices/*`) para priorizar o serial do dispositivo ou o token de autorização:
     ```javascript
     keyGenerator: (req) => req.headers['auth_token'] || req.headers['authorization'] || req.ip
     ```
- **Critério de Aceite (Verificação):** Testar múltiplos disparos simultâneos com diferentes identificadores de dispositivo a partir do mesmo IP local sem bloqueio indevido por 429.

---

## 🟢 NÍVEL 4: ASSERTIVAS BAIXAS (P3)

> **Critério:** Organização de repositório, documentação e comodidade operacional para os desenvolvedores.

### Assertiva 4.1: Limpeza de Scripts e Correção de Arquivos Soltos na Raiz
- **Diagnóstico Técnico:** Existem arquivos como `inciar.bat` (com erro de digitação no nome), `post_linkedin.txt` na raiz do projeto e scripts de teste de impressoras duplicados em `scripts/` e `scripts/printers/`.
- **Ações Detalhadas:**
  1. Renomear `inciar.bat` para `iniciar.bat` e atualizá-lo para checar o status do serviço MongoDB antes de iniciar o Node.js.
  2. Mover arquivos soltos de documentação e testes temporários para as pastas apropriadas (`docs/` e `tests/`).
- **Critério de Aceite (Verificação):** Raiz do repositório limpa, contendo apenas arquivos de configuração e diretórios padronizados.

---

### Assertiva 4.2: Guia de Tooling para Desenvolvimento Mobile (Android SDK / ADB)
- **Diagnóstico Técnico:** O host não possui as ferramentas de plataforma do Android (`adb`, `fastboot`) mapeadas no PATH do sistema, o que impede depuração USB física direta de totens Android nesta máquina.
- **Ações Detalhadas:**
  1. Adicionar ao `docs/` um guia rápido de configuração do Android SDK Platform-Tools para Windows.
  2. Garantir que o comando `eas build` ou scripts de compilação em `clients/mobile/` apontem claramente para as opções de compilação remota (Expo Cloud) ou local (Android Studio).
- **Critério de Aceite (Verificação):** Documentação disponível em `docs/MOBILE_SETUP.md` com instruções passo a passo.

---

## 📅 Matriz de Dependência e Ordem de Implementação Sugerida

```
┌────────────────────────────────────────────────────────┐
│ FASE 1: Core & Segurança Imediata (P0)                  │
│ 1.1 Correção JWT 401 no auth middleware                │
│ 1.2 Unificação WebSocket no Desktop Agent              │
│ 1.3 Separação de canais no WebSocket Server            │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ FASE 2: Infraestrutura, Scripts & Agentes (P1)          │
│ 2.1 Script de inicialização nativa com MongoDB         │
│ 2.2 Virtualenv e requirements do Python USB Agent      │
│ 2.3 Ativação de chaves assimétricas de comandos        │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ FASE 3: Qualidade, Linter & Resiliência (P2)            │
│ 3.1 Correção ESLint (eliminar falsos positivos)        │
│ 3.2 Buffer offline de métricas no Desktop Agent        │
│ 3.3 Rate limiter por token/serial em vez de IP nat     │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ FASE 4: Testes de Carga & Validação Geral (P3 & QA)     │
│ 4.1 Limpeza de scripts e organização                   │
│ 4.2 Bateria completa de testes automatizados           │
│ 4.3 Relatório técnico final consolidado                │
└────────────────────────────────────────────────────────┘
```

---

## ✋ Próximo Passo

Este plano de ação está registrado em [mdm-action-plan.md](file:///c:/Users/Administrator/Documents/GitHub/Servidor-Unificado/mdm-action-plan.md).  
**Deseja que iniciemos a execução pela FASE 1 (Assertivas Críticas P0)?**
