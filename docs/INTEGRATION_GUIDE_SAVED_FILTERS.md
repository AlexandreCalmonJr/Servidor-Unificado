# Integração de Filtros Salvos nos Módulos
## Guia Prático - Fase 3

---

## 📋 Visão Geral

Agora que temos a infraestrutura de **Saved Filters** pronta, precisamos integrar a UI em cada página de módulo. Este guia mostra como fazer isso.

---

## 🔧 Passos de Integração

### 1. Adicionar Container para Filtros Salvos

Em cada página de módulo (ex: `dashboard.html` da seção de módulos), adicione um container:

```html
<!-- Header da seção de módulos -->
<div class="modules-header">
  <h2>Notebooks TI</h2>
  
  <!-- NOVO: Espaço para filtros salvos -->
  <div id="saved-filters-container"></div>
</div>

<!-- Resto do conteúdo -->
<div class="filter-bar">
  <input type="text" id="search" placeholder="Buscar...">
  <select id="status-filter">
    <option value="">Todos</option>
    <option value="online">Online</option>
    <option value="offline">Offline</option>
  </select>
  
  <!-- NOVO: Botão de salvar filtro atual -->
  <button id="save-filter-btn" class="btn btn-secondary">
    💾 Salvar Filtro
  </button>
</div>
```

### 2. Inicializar Manager em cada página

Em cada arquivo de página (ex: `js/modules.js`), adicione:

```javascript
// No topo do arquivo, após document.DOMContentLoaded
class ModulesPage {
  constructor() {
    this.moduleId = 'notebook_ti'; // AJUSTAR por módulo
    this.filterManager = null;
    this.currentFilters = {};
    this.init();
  }

  async init() {
    // Inicializar gerenciador de filtros
    this.filterManager = new SavedFiltersManager(this.moduleId);
    await this.filterManager.loadFilters();
    
    // Renderizar UI de filtros
    this.setupFiltersUI();
    
    // Carregar filtro padrão
    await this.loadDefaultFilter();
    
    // Setup eventos
    this.setupEventListeners();
  }

  setupFiltersUI() {
    const container = document.getElementById('saved-filters-container');
    if (!container) return;

    // Criar dropdown de filtros salvos
    const dropdown = this.filterManager.createFilterDropdown((filter) => {
      this.applyFilter(filter.filterData);
    });
    
    container.appendChild(dropdown);
  }

  async loadDefaultFilter() {
    const defaultFilter = this.filterManager.getDefaultFilter();
    if (defaultFilter) {
      console.log('Carregando filtro padrão:', defaultFilter.filterName);
      this.applyFilter(defaultFilter.filterData);
    }
  }

  applyFilter(filterData) {
    // Aplicar cada propriedade do filtro
    if (filterData.searchTerm !== undefined) {
      const searchInput = document.getElementById('search');
      if (searchInput) {
        searchInput.value = filterData.searchTerm;
      }
    }

    if (filterData.statusFilter !== undefined) {
      const statusSelect = document.getElementById('status-filter');
      if (statusSelect) {
        statusSelect.value = filterData.statusFilter;
      }
    }

    if (filterData.pageSize !== undefined) {
      // Ajustar tamanho de página se aplicável
      this.currentFilters.pageSize = filterData.pageSize;
    }

    // Recarregar dados com o novo filtro
    this.loadData();
  }

  getCurrentFilterData() {
    return {
      searchTerm: document.getElementById('search')?.value || '',
      statusFilter: document.getElementById('status-filter')?.value || '',
      sortBy: 'name',
      sortOrder: 'asc',
      pageSize: 25,
      customFilters: {},
    };
  }

  setupEventListeners() {
    // Botão de salvar filtro
    const saveBtn = document.getElementById('save-filter-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.showSaveFilterDialog());
    }

    // Aplicar filtro ao mudar busca
    const searchInput = document.getElementById('search');
    if (searchInput) {
      searchInput.addEventListener('change', () => {
        this.loadData();
      });
    }

    // Aplicar filtro ao mudar status
    const statusSelect = document.getElementById('status-filter');
    if (statusSelect) {
      statusSelect.addEventListener('change', () => {
        this.loadData();
      });
    }
  }

  showSaveFilterDialog() {
    const filterName = prompt('Nome do filtro:');
    if (!filterName) return;

    const filterData = this.getCurrentFilterData();
    
    this.filterManager.saveCurrentFilter(filterName, filterData).then((saved) => {
      if (saved) {
        // Atualizar dropdown
        this.setupFiltersUI();
      }
    });
  }

  loadData() {
    // Carregar dados com filtros atuais
    const filters = this.getCurrentFilterData();
    console.log('Carregando dados com filtros:', filters);
    
    // Fazer chamada API com esses filtros
    // ...
  }
}

// Inicializar quando pronto
document.addEventListener('DOMContentLoaded', () => {
  window.modulesPage = new ModulesPage();
});
```

---

## 🎯 Exemplo por Módulo

### Notebook TI

```javascript
// Em public/web/panel/js/modules.js
class NotebookTIPage {
  constructor() {
    this.moduleId = 'notebook_ti';
    this.filterManager = new SavedFiltersManager(this.moduleId);
  }

  async init() {
    await this.filterManager.loadFilters();
    this.setupUI();
  }
}
```

### Totem Module

```javascript
class TotemModulePage {
  constructor() {
    this.moduleId = 'totem_module';
    this.filterManager = new SavedFiltersManager(this.moduleId);
  }

  async init() {
    await this.filterManager.loadFilters();
    this.setupUI();
  }
}
```

### Desktop TI

```javascript
class DesktopTIPage {
  constructor() {
    this.moduleId = 'desktop_ti';
    this.filterManager = new SavedFiltersManager(this.moduleId);
  }

  async init() {
    await this.filterManager.loadFilters();
    this.setupUI();
  }
}
```

---

## 🎨 UI Melhorada

Para melhor UX, adicione CSS no `panel.css`:

```css
.modules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  gap: 16px;
}

.modules-header h2 {
  margin: 0;
  flex: 1;
}

#saved-filters-container {
  display: flex;
  gap: 8px;
}

#save-filter-btn {
  min-width: 120px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  align-items: center;
  flex-wrap: wrap;
}

.filter-bar input,
.filter-bar select {
  padding: 8px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
}

.filter-bar input:focus,
.filter-bar select:focus {
  border-color: var(--accent);
  outline: none;
}
```

---

## 🔄 Fluxo Completo

```
1. Usuário abre página do módulo
   ↓
2. SavedFiltersManager carrega filtros do servidor
   ↓
3. Se existe filtro padrão, aplica automaticamente
   ↓
4. Dados carregados com filtro padrão
   ↓
5. Usuário vê dropdown com filtros salvos
   ↓
6. Ao selecionar um filtro:
   - Aplica valores ao UI
   - Recarrega dados
   - Mostra toast confirmação
   ↓
7. Usuário pode ajustar filtro e clicar "Salvar Filtro"
   - Prompt com nome
   - SavedFilterManager faz POST /api/filters
   - Toast success
   - Dropdown atualizado
   ↓
8. Pode definir como padrão (★ button)
   - PUT /api/filters/:id/set-default
   - Próxima vez que abrir, carrega automático
```

---

## 💾 Exemplo Completo de Salvamento

```javascript
// No handler de "Salvar Filtro"
async saveCurrentFilter() {
  // Coletar dados atuais do filtro
  const filterData = {
    searchTerm: document.getElementById('search').value,
    statusFilter: document.getElementById('status-filter').value,
    sortBy: document.querySelector('[data-sort]')?.dataset.sort || 'name',
    sortOrder: document.querySelector('[data-sort-order]')?.dataset.sortOrder || 'asc',
    pageSize: 25,
    customFilters: {
      // Adicionar filtros customizados aqui se houver
      minDevices: document.getElementById('min-devices')?.value,
      maxDevices: document.getElementById('max-devices')?.value,
    },
  };

  // Pedir nome do filtro
  const filterName = prompt('Nome do novo filtro:', '');
  if (!filterName) return;

  // Salvar no servidor
  const saved = await this.filterManager.saveCurrentFilter(filterName, filterData);
  
  if (saved) {
    // Atualizar dropdown de filtros
    this.updateFiltersDropdown();
    
    // Toast automático já é mostrado por saveCurrentFilter()
  }
}
```

---

## 🧪 Teste Manual

1. **Abrir módulo**
   ```
   Navigate to /panel → Módulos → Notebook TI
   ```

2. **Aplicar filtros**
   ```
   Search: "test"
   Status: "online"
   ```

3. **Salvar filtro**
   ```
   Clique em "💾 Salvar Filtro"
   Digite nome: "Desktop Ativos"
   Veja toast success
   ```

4. **Verificar no dropdown**
   ```
   Clique em "Filtros Salvos"
   Veja "Desktop Ativos" na lista
   ```

5. **Carregar filtro**
   ```
   Clique em ↓ (load)
   Filtro aplicado automaticamente
   Dados recarregados
   ```

6. **Definir como padrão**
   ```
   Clique em ★ (star)
   Badge "Padrão" aparece
   ```

7. **Recarregar página**
   ```
   F5
   Filtro padrão carregado automaticamente
   ```

---

## 📝 Checklist de Integração

Para cada módulo:
- [ ] Adicionar container `#saved-filters-container`
- [ ] Adicionar botão "💾 Salvar Filtro"
- [ ] Inicializar `SavedFiltersManager`
- [ ] Implementar `loadFilters()`
- [ ] Implementar `applyFilter()`
- [ ] Implementar `showSaveFilterDialog()`
- [ ] Teste: Salvar novo filtro
- [ ] Teste: Carregar filtro salvo
- [ ] Teste: Definir como padrão
- [ ] Teste: Recarregar página (deve carregar padrão)

---

## 🐛 Troubleshooting

### Filtros não carregam
```javascript
// Verificar no console
const mgr = new SavedFiltersManager('notebook_ti');
await mgr.loadFilters();
console.log(mgr.getAllFilters());
```

### Toast não aparece
```javascript
// Verificar se toast-notifications.js foi carregado
console.log(typeof toastManager);
showToastSuccess('Teste');
```

### Filtro não se aplica
```javascript
// Verificar se applyFilter está sendo chamado
console.log('Aplicando filtro:', filterData);
```

---

## 📚 Referência

- **SavedFiltersManager:** `public/web/panel/js/saved-filters.js`
- **ToastManager:** `public/web/panel/js/toast-notifications.js`
- **API Docs:** `docs/PHASE3_IMPLEMENTATION_COMPLETE.md`

---

## ✅ Status

**Template pronto para integração!**

Próximo passo: Aplicar este padrão em cada página de módulo.
