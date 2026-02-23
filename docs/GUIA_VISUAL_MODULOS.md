# 🖥️ Guia Visual: Testando Seleção de Módulos

## O Que Você Vai Ver Agora

Melhorei o código do painel para **mostrar EXATAMENTE o que está acontecendo** quando você clica em cada módulo.

### **ANTES** (Sem Debug)
- Clica em módulo
- Talvez não mude o nome
- Nenhuma confirmação no Console

### **DEPOIS** (Com Debug Completo) ✅
- Clica em módulo
- **Console mostra TUDO** que está acontecendo
- Título muda **visualmente** com ✅ confirmação
- Vê quantos ativos cada módulo tem

---

## 🎯 Teste Passo a Passo

### 1️⃣ Abrir o Painel

```
http://10.71.3.211:3000/panel
```

### 2️⃣ Abrir Console (F12 ou Ctrl+Shift+I)

Aba: **Console**

Vai ver algo assim no início:
```
App initialized
Modules loaded
```

### 3️⃣ Clicar em "Módulos" no Sidebar

Verá no Console:
```
🔄 loadDynamicModule chamado para: 699c756685e5276aa4b3ae70
📡 Buscando detalhes do módulo: 699c756685e5276aa4b3ae70
✅ Módulo carregado: Notebooks TI (notebook)
✅ dynamic-module-title atualizado: "Notebooks TI"
✅ page-title atualizado: "📦 Notebooks TI (notebook)"
📡 Buscando ativos do módulo: 699c756685e5276aa4b3ae70
✅ 1 ativo(s) carregado(s)
```

Verá na tela:
- Título principal muda para: **📦 Notebooks TI (notebook)**
- Módulo marcado com destaque (highlighted)
- Tabela de ativos aparece embaixo

### 4️⃣ Clicar em "Totem Module"

Verá no Console:
```
📍 Módulo clicado: Totem Module (totem)
✅ Nav item marcado como ativo: Totem Module
✅ Página dinâmica mostrada
✅ Título atualizado: "Totem Module"
🔄 Carregando dados do módulo: Totem Module
📡 Buscando detalhes do módulo: 699c756685e5276aa4b3ae70
✅ Módulo carregado: Totem Module (totem)
✅ page-title atualizado: "📦 Totem Module (totem)"
📡 Buscando ativos do módulo: 699c756685e5276aa4b3ae70
✅ 1 ativo(s) carregado(s)
```

Verá na tela:
- Título muda para: **📦 Totem Module (totem)**
- Highlight passa para "Totem Module"
- Tabela se atualiza com ativos do Totem

### 5️⃣ Clicar em "Desktop TI"

Verá no Console:
```
📍 Módulo clicado: Desktop TI (desktop)
✅ Nav item marcado como ativo: Desktop TI
✅ Título atualizado: "Desktop TI"
✅ Módulo carregado: Desktop TI (desktop)
✅ page-title atualizado: "📦 Desktop TI (desktop)"
📡 Buscando ativos do módulo: ...
✅ 0 ativo(s) carregado(s)
```

Verá na tela:
- Título muda para: **📦 Desktop TI (desktop)**
- Nenhum ativo (porque ainda não sincronizou)

---

## ❌ Se Algo Não Funcionar

### ❌ "page-title não encontrado!"

```
❌ page-title não encontrado!
```

**Significa:** O elemento HTML com `id="page-title"` não existe na página.

**Solução:** Verificar se HTML tem:
```html
<span class="page-title" id="page-title">Dashboard</span>
```

### ❌ "Erro: 404 Módulo não encontrado"

```
❌ Erro ao buscar módulo: 404 Módulo não encontrado
```

**Significa:** O moduleId está errado ou foi deletado.

**Solução:** Recarregar página (F5) para atualizar lista de módulos.

### ❌ "Failed to fetch modules"

```
❌ Erro: Failed to fetch
```

**Significa:** Servidor está offline ou token expirou.

**Solução:** Verificar se servidor está rodando em `http://10.71.3.211:3000`

---

## 📊 Checklist de Funcionamento

- [ ] Painel abre em `http://10.71.3.211:3000/panel`
- [ ] Clico em "Notebooks TI" no sidebar → título muda visualmente
- [ ] Console mostra: `✅ Módulo carregado: Notebooks TI (notebook)`
- [ ] Clico em "Totem Module" → título muda para "Totem Module"
- [ ] Clico em "Desktop TI" → título muda para "Desktop TI"
- [ ] Cada módulo mostra seus ativos corretamente
- [ ] Sem nenhuma mensagem de erro "❌" no console

---

## 🔍 Debug: Verificar Módulos no Banco

Se quiser verificar que os módulos existem:

```bash
# Terminal (PowerShell)
cd "c:\Users\alexandrej\Documents\GitHub\Servidor-Unificado"
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const AssetModuleConfig = require('./models/AssetModuleConfig');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const mods = await AssetModuleConfig.find({}, 'name type is_active');
  console.log('📦 Módulos no banco:');
  mods.forEach(m => console.log(\`  - \${m.name} (type: \${m.type}, active: \${m.is_active})\`));
  process.exit(0);
})();
"
```

Deve mostrar:
```
📦 Módulos no banco:
  - Notebooks TI (type: notebook, active: true)
  - Totem Module (type: totem, active: true)
  - Desktop TI (type: desktop, active: true)
```

---

## 🚀 Se Tudo Funcionar

Quando você clicar em cada módulo:

1. ✅ Título muda **instantaneamente**
2. ✅ Módulo fica **highlighted** no sidebar
3. ✅ Tabela carrega ativos do módulo
4. ✅ Console mostra histórico completo do que aconteceu

Se não funcionar, **compartilhe os logs do Console** (F12).

