# 🔥 FIX: Correção do Problema de Assets Duplicados Entre Módulos

## 📋 Resumo do Problema

Quando criava um novo módulo (ex: "Notebooks TI"), os dados do client iam para **3 módulos simultaneamente**:
1. ✗ Notebooks TI
2. ✗ Totem Module
3. ✗ Desktop TI

**Root Cause:** O client estava enviando `asset_type: "desktop"` para TODOS os módulos, independentemente do tipo do módulo selecionado.

---

## 🔍 O Que Estava Acontecendo

### Client (CommandPoller.js) - ANTES
```javascript
// ERRADO: Hardcoda 'desktop' para todo módulo
const payload = PayloadBuilder.buildModulePayload(
  coreInfo,
  'desktop',  // ← SEMPRE 'desktop' independente do módulo!
  this._settings.sector,
  ...
);
```

### Server Logs (12:51:46) - Evidência
```
moduleId: "699c756685e5276aa4b3ae70"  [Notebooks TI]
moduleType: "notebook"                 [Módulo é notebook]
assetType: "desktop"                   [Mas client envia desktop!]
✨ Ativo CRIADO em módulo notebook
```

### Por Que Duplicava?
1. Client envia para "Notebooks TI" com `asset_type: "desktop"`
2. Server armazena como `asset_type: "desktop"` no módulo notebook
3. Cliente envia NOVAMENTE para outros módulos
4. Resultado: Mesmo asset aparece em múltiplos módulos com tipos diferentes

---

## ✅ A Correção

### 1️⃣ Modificado: `CommandPoller.js`

**Mudança:** Client agora busca o tipo REAL do módulo antes de enviar dados

```javascript
// CORRETO: Busca tipo do módulo no servidor
let moduleType = 'desktop'; // Padrão se falhar
try {
  const moduleInfo = await APIClient.getModuleInfo(baseUrl, this._settings.moduleId, token);
  if (moduleInfo && moduleInfo.module && moduleInfo.module.type) {
    moduleType = moduleInfo.module.type; // ✅ Usa tipo real: 'notebook', 'totem', etc
    this._logger.info(`[CommandPoller] Tipo do módulo obtido: ${moduleType}`);
  }
} catch (e) {
  this._logger.warn(`[CommandPoller] Falha ao obter tipo do módulo, usando padrão 'desktop': ${e.message}`);
}

const payload = PayloadBuilder.buildModulePayload(
  coreInfo,
  moduleType,  // ✅ Agora é o tipo REAL do módulo
  this._settings.sector,
  this._settings.floor,
  this._settings.assetName
);
```

### 2️⃣ Modificado: `APIClient.js`

**Mudança:** Adicionado alias `getModuleInfo` que chama `fetchModuleStructure`

```javascript
module.exports = {
    // ...
    fetchModuleStructure,
    getModuleInfo: fetchModuleStructure,  // ✅ Alias para usar no CommandPoller
    // ...
};
```

---

## 🎯 Fluxo Agora (CORRETO)

```
CLIENT (Electron):
  1. Seleciona módulo "Notebooks TI" (id: 699c756685e5276aa4b3ae70)
  2. Clica "Sincronizar Agora"
  3. Chama GET /api/modules/699c756685e5276aa4b3ae70
     └─ Recebe: { module: { type: "notebook", ... } }
  4. Extrai moduleType = "notebook"
  5. Coleta dados da máquina
  6. Cria payload com asset_type="notebook"
  7. Envia POST /api/modules/699c756685e5276aa4b3ae70/assets
     ├─ Body: { asset_type: "notebook", serial_number: "PE0E0RX6", ... }
     
SERVER (Express):
  8. Recebe POST
  9. Valida: moduleType="notebook", assetType="notebook" ✅ MATCH!
  10. Cria asset com type="notebook" APENAS neste módulo
  11. Nenhuma duplicação!
```

---

## 📊 Verificação

### Antes (Problema)
```
Asset: PE0E0RX6
├─ Notebooks TI (type=desktop) ❌ ERRADO
├─ Totem Module (type=desktop) ❌ ERRADO  
└─ Desktop TI (type=desktop) ✓ Correto por acaso
```

### Depois (Corrigido)
```
Asset: PE0E0RX6
└─ Notebooks TI (type=notebook) ✅ CORRETO
```

---

## 🧪 Como Testar

1. **Reconstruir o client Electron:**
   ```bash
   cd clients/desktop
   npm start  # Desenvolvimento
   # OU
   npm run dist  # Build para produção
   ```

2. **Configurar no client:**
   - IP: seu_ip
   - Porta: 3000
   - Token: seu_token
   - Módulo: Notebooks TI
   - Setor, Andar, etc.

3. **Clicar "Sincronizar Agora"**

4. **Verificar logs do server:**
   ```
   [12:55:30] 📥 POST recebido:
   ├─ moduleId: "699c756685e5276aa4b3ae70"  [Notebooks TI]
   ├─ moduleType: "notebook"
   └─ assetType: "notebook"  ✅ MATCH!
   ```

5. **Verificar no banco:**
   ```javascript
   db.notebooks.find({ serial_number: "PE0E0RX6" })
   // Deve retornar 1 resultado, não 3!
   ```

---

## 📝 Alterações de Arquivo

| Arquivo | Mudança | Razão |
|---------|---------|-------|
| `clients/desktop/src/services/CommandPoller.js` | Busca tipo do módulo via API antes de enviar | Corrige hardcoding de 'desktop' |
| `clients/desktop/src/services/APIClient.js` | Adiciona alias `getModuleInfo` | Facilita uso no CommandPoller |

---

## 🚀 Próximos Passos

- [ ] Rebuild do client Electron
- [ ] Testar sincronização com Notebooks TI
- [ ] Testar sincronização com Desktop TI  
- [ ] Testar sincronização com Totem Module
- [ ] Verificar que assets não duplicam
- [ ] Verificar tray status (Online/Offline)
- [ ] Monitorar logs para anomalias

---

## 💡 Observações

1. **Fallback:** Se falhar ao obter tipo do módulo, o client usa "desktop" como padrão
2. **Log detalhado:** Todos os passos são logados para debugging
3. **Performance:** GET /api/modules/{moduleId} é chamado a cada sync (pode ser cacheado se necessário)
4. **Compatibilidade:** Mantém compatibilidade com modo legado (forceLegacyMode)

---

**Status:** ✅ IMPLEMENTADO E PRONTO PARA TESTE
