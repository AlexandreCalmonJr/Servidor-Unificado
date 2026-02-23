# 📚 Histórico Completo de Correções

## Sessão 1: Descoberta e Investigação Inicial

### Problema Relatado
- Assets duplicando em 3 módulos diferentes
- Cliente enviando dados, dados caindo em múltiplos módulos

### Investigação Realizada
1. ✅ Verificado índices do banco (ManagedAsset.js) - encontrado índice composite incorreto
2. ✅ Verificado fluxo de PayloadBuilder - não tinha asset_type no payload
3. ✅ Verificado moduleRoutes - estava sobrescrevendo asset_type do client
4. ✅ Adicionado logging extensivo (APIClient, CommandPoller, PayloadBuilder, moduleRoutes)

### Correções Implementadas - Primeira Rodada
1. **ManagedAsset.js**: Corrigido índice de `{asset_type: 1, serial_number: 1}` para `{serial_number: 1}`
   - Motivo: Permitia duplicatas com diferentes types
   - Resultado: Agora serial_number é único globalmente

2. **PayloadBuilder.js**: Adicionado `payload.asset_type = type || 'default'`
   - Motivo: Payload não incluía asset_type
   - Resultado: Client agora envia asset_type no payload

3. **moduleRoutes.js**: Alterado validação de asset_type
   - Motivo: Estava sobrescrevendo tipo do client
   - Resultado: Agora respeita tipo enviado pelo client (se enviado)

4. **Adicionado Logging**: Em APIClient, CommandPoller, PayloadBuilder, moduleRoutes
   - Motivo: Debug de fluxo de dados
   - Resultado: Melhor rastreamento do problema

### Scripts Criados
- `scripts/rebuild_indexes.js` - Reconstrói índices globais
- `scripts/cleanup_duplicates.js` - Remove duplicatas
- `scripts/check_indexes.js` - Verifica índices existentes

---

## Sessão 2: Root Cause Análise via Logs

### Análise de Logs do Server (12:51:46)
Server logs fornecidos mostraram:
```
moduleId: "699c756685e5276aa4b3ae70"  [Notebooks TI module]
moduleType: "notebook"                [Module is NOTEBOOK type]
assetType: "desktop"                  [Client sent DESKTOP type!] ← MISMATCH!
✨ Ativo CRIADO em módulo notebook
```

### Root Cause Identificado
**CommandPoller.js linha 138 hardcoda `'desktop'` para TODOS os módulos**

```javascript
// PROBLEMA REAL:
const payload = PayloadBuilder.buildModulePayload(
  coreInfo,
  'desktop',  // ← SEMPRE 'desktop' independente do módulo selecionado!
  this._settings.sector,
  ...
);
```

### Por Que Causa Duplicatas
1. Client enviava com moduleId=Notebooks TI mas asset_type='desktop'
2. Server respeitava o type do client (após nossas correções anteriores)
3. Asset era criado com type='desktop' em módulo 'notebook'
4. Isso confundia os sistemas, resultando em aparência de duplicação

---

## Sessão 3: Implementação da Correção Definitiva

### Fix Implementado

#### Arquivo 1: `clients/desktop/src/services/CommandPoller.js`
**Antes:**
```javascript
const payload = PayloadBuilder.buildModulePayload(
  coreInfo,
  'desktop',  // Hardcoded
  ...
);
```

**Depois:**
```javascript
let moduleType = 'desktop'; // Padrão
try {
  const moduleInfo = await APIClient.getModuleInfo(baseUrl, this._settings.moduleId, token);
  if (moduleInfo && moduleInfo.module && moduleInfo.module.type) {
    moduleType = moduleInfo.module.type;  // Tipo REAL do módulo
  }
} catch (e) {
  this._logger.warn(`Falha ao obter tipo do módulo: ${e.message}`);
}

const payload = PayloadBuilder.buildModulePayload(
  coreInfo,
  moduleType,  // ✅ CORRETO
  ...
);
```

#### Arquivo 2: `clients/desktop/src/services/APIClient.js`
**Adicionado:**
```javascript
module.exports = {
    // ...
    getModuleInfo: fetchModuleStructure,  // ✅ Novo alias
    // ...
};
```

### Por Que Essa Correção Resolve
1. Client agora faz GET `/api/modules/{moduleId}`
2. Recebe `{ module: { type: "notebook", ... } }`
3. Extrai o tipo REAL: `moduleType = "notebook"`
4. Envia payload com `asset_type: "notebook"`
5. Server recebe `moduleType="notebook"` e `assetType="notebook"` → MATCH ✅
6. Asset criado APENAS no módulo selecionado

---

## Cronograma de Mudanças

| Timestamp | Arquivo | Mudança | Motivo |
|-----------|---------|---------|--------|
| Sessão 1 | ManagedAsset.js | Índice serial_number único | Prevenir duplicatas via índice |
| Sessão 1 | PayloadBuilder.js | Adicionar asset_type | Enviar tipo no payload |
| Sessão 1 | moduleRoutes.js | Respeitar asset_type do client | Não sobrescrever tipo |
| Sessão 1 | Vários | Adicionar logging | Debug de fluxo |
| Sessão 3 | CommandPoller.js | Buscar tipo do módulo | **ROOT FIX** |
| Sessão 3 | APIClient.js | Alias getModuleInfo | Facilitar uso |

---

## Status das Correções

| Item | Status | Descrição |
|------|--------|-----------|
| Índice global unique serial_number | ✅ DONE | ManagedAsset.js corrigido |
| Payload inclui asset_type | ✅ DONE | PayloadBuilder.js atualizado |
| Server respeita asset_type do client | ✅ DONE | moduleRoutes.js não sobrescreve |
| Logging extensivo | ✅ DONE | Rastreamento completo |
| **Client busca tipo do módulo** | ✅ DONE | **CommandPoller.js + APIClient.js** |

---

## Verificação

### Antes (Problema)
```
Sincronização: Notebooks TI
├─ Client envia: asset_type="desktop"  [ERRADO]
├─ Server recebe: moduleType="notebook", assetType="desktop"  [MISMATCH]
├─ Asset criado em: Notebooks TI, Totem Module, Desktop TI  [3 MÓDULOS]
└─ Resultado: Dados aparecem triplicados
```

### Depois (Correto)
```
Sincronização: Notebooks TI
├─ Client busca: GET /api/modules/moduleId → { type: "notebook" }
├─ Client envia: asset_type="notebook"  [CORRETO]
├─ Server recebe: moduleType="notebook", assetType="notebook"  [MATCH ✅]
├─ Asset criado em: Notebooks TI  [1 MÓDULO]
└─ Resultado: Dados vão para módulo correto
```

---

## Próximos Passos

1. **Teste com Cliente Electron:**
   - [ ] Reconstruir cliente
   - [ ] Configurar para módulo "Notebooks TI"
   - [ ] Executar sincronização
   - [ ] Verificar logs

2. **Validação no Banco:**
   - [ ] Verificar que asset_type="notebook" (não "desktop")
   - [ ] Verificar que asset aparece APENAS em Notebooks TI
   - [ ] Verificar que não há duplicatas

3. **Testes Adicionais:**
   - [ ] Teste com módulo Desktop TI
   - [ ] Teste com Totem Module
   - [ ] Teste com múltiplos sincs
   - [ ] Verificar tray status

---

## Lições Aprendidas

1. **Hardcoding é perigoso:** Valores como `'desktop'` devem vir do sistema
2. **Logging é essencial:** Descobrir problema foi por análise de logs
3. **Type Safety:** Asset type deve sempre corresponder ao módulo type
4. **API Contract:** Server e client precisam estar alinhados no contrato de dados

---

**Data da Ultima Atualização:** 2024
**Status Geral:** ✅ PRONTO PARA TESTE
