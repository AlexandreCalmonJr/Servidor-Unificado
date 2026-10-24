# Relatório Técnico - Fase 2: Infraestrutura, Scripts de Inicialização & Agentes
> **Projeto:** MDM Corporativo - Servidor Unificado  
> **Status:** Concluído com Sucesso  
> **Data:** 24/10/2026  
> **Responsáveis:** Arquiteto de Software & Engenheiro DevOps

---

## 1. Escopo e Objetivos da Fase 2

A Fase 2 focou na adaptação do ambiente operacional para execução nativa e estável no host Windows (sem dependência mandatória de Docker), no isolamento de dependências para o agente de impressoras USB e na proteção criptográfica contra adulteração de comandos remotos.

---

## 2. Modificações e Entregáveis

### 2.1. Script de Inicialização Nativa Resiliente
- **Arquivos criados/modificados:**
  - [`iniciar.bat`](file:///c:/Users/Administrator/Documents/GitHub/Servidor-Unificado/iniciar.bat)
  - [`inciar.bat`](file:///c:/Users/Administrator/Documents/GitHub/Servidor-Unificado/inciar.bat) (redirect de compatibilidade)
- **Funcionalidades:**
  1. Verificação automática da presença do Node.js v18+ no PATH.
  2. Validação da existência do arquivo `.env` (com cópia automática do `.env.example` se ausente).
  3. Consulta do status do serviço Windows `MongoDB` via `sc query`. Se inativo, tenta inicializá-lo automaticamente via `net start MongoDB`.
  4. Execução do servidor com relatório visual limpo e tratamento de códigos de erro de saída.

---

### 2.2. Isolamento de Dependências do Agente Python de Impressoras
- **Arquivos criados:**
  - [`agents/requirements.txt`](file:///c:/Users/Administrator/Documents/GitHub/Servidor-Unificado/agents/requirements.txt)
  - [`agents/setup_env.bat`](file:///c:/Users/Administrator/Documents/GitHub/Servidor-Unificado/agents/setup_env.bat)
  - [`agents/run_agent.bat`](file:///c:/Users/Administrator/Documents/GitHub/Servidor-Unificado/agents/run_agent.bat)
- **Problema Anterior:**
  - O Python 3.15 do host não possuía o módulo `requests` instalado globalmente, gerando `ModuleNotFoundError` ao tentar iniciar o [usb_printer_agent.py](file:///c:/Users/Administrator/Documents/GitHub/Servidor-Unificado/agents/usb_printer_agent.py).
- **Solução Implementada:**
  - Criado `requirements.txt` com as versões pinadas de `requests`, `pystray` e `Pillow`.
  - Criado script `setup_env.bat` que cria um ambiente virtual isolado (`agents/.venv`) e instala os pacotes automaticamente sem poluir o Python global da máquina.
  - Criado script `run_agent.bat` que dispara o agente através do executável do virtualenv com suporte a parâmetros de linha de comando.

---

### 2.3. Assinatura Criptográfica Assimétrica de Comandos Remotos
- **Arquivos criados/modificados:**
  - [`utils/commandSignature.js`](file:///c:/Users/Administrator/Documents/GitHub/Servidor-Unificado/utils/commandSignature.js)
  - [`scripts/generateCommandKeys.js`](file:///c:/Users/Administrator/Documents/GitHub/Servidor-Unificado/scripts/generateCommandKeys.js)
  - `config/keys/command_private_key.pem`
  - `config/keys/command_public_key.pem`
- **Funcionalidades:**
  1. Criação do utilitário `generateCommandKeys.js` que gera chaves RSA-2048 padronizadas (PKCS#8 e SPKI) e orienta a injeção em variáveis de ambiente.
  2. Implementação da função `verifyCommand(command, signature, publicKey)` com algoritmo `RSA-SHA256` e canonização determinística de payload.
  3. Testes unitários validaram que comandos assinados pela chave privada são aceitos com sucesso e comandos adulterados (ex: alteração de parâmetro ou tipo de comando em trânsito) são sumariamente rejeitados.

---

## 3. Validação e Testes Realizados

1. **Geração de Chaves:**
   - Executado `node scripts/generateCommandKeys.js` -> Chaves salvas em `config/keys/`.
2. **Teste Criptográfico Automatizado:**
   - Assinatura gerada: `true`.
   - Assinatura válida: `true`.
   - Detecção de adulteração de comando: `false` (rejeitado com sucesso).
