# 📚 Documentação de APIs - 12 Melhorias Implementadas

## 📊 Resumo Executivo

| Fase | Feature | Status | Endpoint |
|------|---------|--------|----------|
| 1 | Dashboard Cards | ✅ | GET `/api/modules/{id}/stats` |
| 1 | Time-ago Formatting | ✅ | Via `utils/timeFormatter.js` |
| 1 | Health Bar | ✅ | Calculado em `(online/total)*100` |
| 1 | Status Badges | ✅ | Via `utils/timeFormatter.js` |
| 1 | Skeleton Loading | ✅ | CSS: `animate-pulse` |
| 2 | Auto-Status Updater | ✅ | Cron job: `*/5 * * * *` |
| 2 | CSV Export | ✅ | GET `/api/export/modules/{id}/assets` |
| 2 | Cursor Pagination | ✅ | GET `/api/modules/{id}/assets/cursor` |
| 2 | Redis Cache | ✅ | Integrado em `/stats` (60s TTL) |
| 2 | Soft Delete | ✅ | Fields: `deleted_at`, `is_deleted` |
| 3 | WebSocket Notif. | ⏳ | Em desenvolvimento |
| 3 | Saved Filters | ⏳ | Em desenvolvimento |

---

## 🎨 Fase 1: Visual & UX

### 1️⃣ Dashboard com Status Cards

**Endpoint:** `GET /api/modules/{moduleId}/stats`

**Autenticação:** Bearer Token

**Resposta:**
```json
{
  "success": true,
  "total": 150,
  "online": 120,
  "offline": 25,
  "maintenance": 5,
  "fromCache": false
}
```

**Uso no Dashboard:**
```javascript
// Calcular health
const health = (stats.online / stats.total) * 100  // Ex: 80%

// Card estrutura
<div class="module-card">
  <h3>{module.name}</h3>
  <div class="health-bar" style="width: {health}%"></div>
  <div class="badge online">{stats.online} Online</div>
  <div class="badge offline">{stats.offline} Offline</div>
  <div class="badge maintenance">{stats.maintenance} Manutenção</div>
</div>
```

---

### 2️⃣ Indicador "Há X Tempo"

**Arquivo:** `utils/timeFormatter.js`

**Função:** `formatTimeAgo(date)`

**Exemplo:**
```javascript
const { formatTimeAgo } = require('./utils/timeFormatter')

const str = formatTimeAgo(new Date(Date.now() - 5*60000))
// Retorna: "há 5 min"
```

**Formatos retornados:**
- "há 1 min" (0-2 min)
- "há 5 min" (2-10 min)
- "há 30 min" (10-60 min)
- "há 1h" (1-24h)
- "há 1d" (1-7 dias)
- "há 2 sem" (1-4 semanas)
- "há 2 mês" (> 4 semanas)

---

### 3️⃣ Barra de Progresso de Saúde

**Cálculo:** `(online / total) * 100`

**Cores Dinâmicas:**
```css
/* Verde - Saúde boa (>= 80%) */
.health-bar.good { background: #22c55e; }

/* Amarelo - Alerta (50-79%) */
.health-bar.warning { background: #eab308; }

/* Vermelho - Crítico (< 50%) */
.health-bar.critical { background: #ef4444; }
```

**Exemplo HTML:**
```html
<div class="health-container">
  <div class="health-bar" style="width: 85%"></div>
  <span>85% Saudável</span>
</div>
```

---

### 4️⃣ Tags/Badges de Status

**Arquivo:** `utils/timeFormatter.js`

**Função:** `getStatusBadge(status)`

**Retorno:**
```javascript
{
  online: { 
    color: 'green',
    icon: '✓',
    text: 'Online',
    badge_class: 'badge-online'
  },
  offline: { 
    color: 'gray',
    icon: '✗',
    text: 'Offline',
    badge_class: 'badge-offline'
  },
  maintenance: { 
    color: 'blue',
    icon: '🔧',
    text: 'Manutenção',
    badge_class: 'badge-maintenance'
  },
  retired: { 
    color: 'black',
    icon: '×',
    text: 'Desativado',
    badge_class: 'badge-retired'
  }
}
```

**Uso:**
```javascript
const badge = getStatusBadge('online')
// <span class="badge badge-online">✓ Online</span>
```

---

### 5️⃣ Skeleton Loading

**CSS com Tailwind:**
```html
<!-- Skeleton loader -->
<div class="space-y-3 animate-pulse">
  <div class="h-4 bg-gray-300 rounded"></div>
  <div class="h-4 bg-gray-300 rounded w-3/4"></div>
  <div class="h-4 bg-gray-300 rounded w-1/2"></div>
</div>
```

**Usar enquanto carregando:**
```javascript
// Antes de chamar /stats
showSkeletonLoader()

// Após resposta
fetch('/api/modules/{id}/stats')
  .then(r => r.json())
  .then(data => {
    hideSkeletonLoader()
    updateCards(data)
  })
```

---

## ⚡ Fase 2: Performance & Backend

### 6️⃣ Auto-Status Updater

**Arquivo:** `scripts/autoStatusUpdater.js`

**Cron Schedule:** `*/5 * * * *` (a cada 5 minutos)

**Lógica:**
1. Marca como `offline` se `last_seen > 15 minutos`
2. Limpa `maintenance_status` se `status_changed > 30 minutos`
3. Respeita soft delete: `deleted_at: null`

**Integração em server.js:**
```javascript
const cron = require('node-cron')
const autoStatusUpdater = require('./scripts/autoStatusUpdater')

cron.schedule('*/5 * * * *', async () => {
  await autoStatusUpdater(logger)
})
```

---

### 7️⃣ Endpoint de Exportação CSV

**Endpoint 1: Exportar Ativos**

```
GET /api/export/modules/{moduleId}/assets
Authorization: Bearer {token}
```

**Resposta:** Arquivo CSV com headers:
- `asset_name`
- `serial_number`
- `asset_type`
- `status`
- `location`
- `assigned_to`
- `last_seen`
- `created_at`

**Exemplo Download:**
```javascript
async function exportAssets(moduleId) {
  const res = await fetch(`/api/export/modules/${moduleId}/assets`)
  const blob = await res.blob()
  
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `modulo_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
}
```

**Endpoint 2: Exportar Estatísticas**

```
GET /api/export/modules/{moduleId}/stats
Authorization: Bearer {token}
```

**Resposta:** CSV com sumário:
```
Módulo,Notebooks TI
Tipo,notebook
Data,2024-01-15T10:30:00.000Z

Estatísticas de Status
Total de Ativos,150
Online,120
Offline,25
Em Manutenção,5
Taxa Online,80.00%
```

---

### 8️⃣ Paginação com Cursor

**Endpoint:** `GET /api/modules/{moduleId}/assets/cursor`

**Query Parameters:**
- `cursor` (string, base64): Token da última página
- `limit` (number, default: 20, max: 100)
- `sortBy` (string, default: '_id'): Campo para ordenar
- `sortOrder` (string, default: '-1'): 'asc' ou 'desc'
- `status` (string): Filtrar por status
- `search` (string): Buscar em asset_name, serial_number, location

**Exemplo de Uso:**

```javascript
// Primeira página
const res1 = await fetch('/api/modules/{id}/assets/cursor?limit=20')
const data1 = await res1.json()

console.log(data1)
// {
//   success: true,
//   data: [...20 assets...],
//   pagination: {
//     count: 20,
//     total: 500,
//     nextCursor: "NjA2YjIxYTJkZjg1ZjEwMjE0",
//     hasMore: true,
//     limit: 20
//   }
// }

// Próxima página
const res2 = await fetch(
  `/api/modules/{id}/assets/cursor?cursor=${data1.pagination.nextCursor}&limit=20`
)
const data2 = await res2.json()
```

**Vantagens sobre skip/limit:**
- ✅ Não afeta performance com datasets grandes
- ✅ Funciona bem com dados em mudança
- ✅ Sem duplicatas entre páginas
- ✅ Sem lacunas entre páginas

---

### 9️⃣ Redis Cache para Stats

**Configuração em `.env`:**
```env
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**Implementação em `/api/modules/{id}/stats`:**

```javascript
// Fluxo:
1. GET /api/modules/{id}/stats
2. Busca em Redis: "stats:{moduleId}"
3. Se hit → retorna de imediato (fromCache: true, 60s de idade)
4. Se miss → calcula contadores e cachea por 60s

// Resposta com cache
{
  "success": true,
  "total": 150,
  "online": 120,
  "offline": 25,
  "maintenance": 5,
  "fromCache": true  // ← Vem do cache
}
```

**TTL Configuração:**
```javascript
const TTL_STATS = 60     // 1 min para stats
const TTL_MODULES = 300  // 5 min para módulos
const TTL_DEFAULT = 3600 // 1h para geral
```

**Invalidar Cache:**
```javascript
// Quando um ativo é modificado:
await cacheService.del(`stats:${moduleId}`)

// Padrão:
await cacheService.delPattern(`stats:*`)
```

---

### 🔟 Soft Delete

**Campos adicionados ao Schema:**

```javascript
deleted_at: {
  type: Date,
  default: null,
  index: true
},
is_deleted: {
  type: Boolean,
  default: false,
  index: true
},
deleted_by: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
}
```

**Métodos de Model:**

```javascript
// Deletar soft (marca como deletado)
await asset.softDelete(userId)

// Restaurar
await asset.restore()

// Verificar se deletado
if (asset.isDeleted()) { ... }
```

**Query Scopes:**

```javascript
// Apenas ativos (padrão)
const active = await Model.find().active()

// Apenas deletados
const deleted = await Model.find().deleted()

// Todos (incluindo deletados)
const all = await Model.find().withDeleted()
```

**Padrão em Rotas:**

```javascript
// Por padrão, exclui deletados
GET /api/modules/{id}/assets
// filter: { module_id, is_deleted: false }

// Incluir deletados com flag
GET /api/modules/{id}/assets?includeDeleted=true
// filter: { module_id } (sem is_deleted)
```

**Migração de Dados:**

```bash
node scripts/migrateSoftDelete.js
# Adiciona campos deleted_at/is_deleted aos ativos existentes
# Cria índices para performance
```

---

## 🚀 Fase 3: Real-Time & Advanced (Em Desenvolvimento)

### 1️⃣1️⃣ WebSocket Notificações

**Status:** ⏳ Próxima implementação

**Estrutura existente:** `services/websocketServer.js`

**Eventos planejados:**
- `status_changed`: Quando ativo muda de status
- `asset_created`: Novo ativo criado
- `asset_deleted`: Ativo foi deletado
- `module_stats_updated`: Estatísticas atualizadas

**Uso esperado:**
```javascript
io.on('status_changed', (data) => {
  console.log(`${data.asset_name} agora está ${data.status}`)
  updateAssetInUI(data)
})
```

---

### 1️⃣2️⃣ Filtros Salvos por Módulo

**Status:** ⏳ Próxima implementação

**Modelo planejado:**
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  module_id: ObjectId,
  name: string,
  filters: {
    status: string,
    search: string,
    sortBy: string,
    sortOrder: number
  },
  created_at: Date,
  updated_at: Date
}
```

**Endpoints planejados:**
```
POST   /api/modules/{id}/filters/save
GET    /api/modules/{id}/filters
PUT    /api/modules/{id}/filters/{filterId}
DELETE /api/modules/{id}/filters/{filterId}
```

---

## 📋 Checklist de Implementação

- [x] Phase 1 - Visual & UX (5/5 features)
- [x] Phase 2 - Performance & Backend (5/5 features)
  - [x] CSV Export endpoint
  - [x] Cursor pagination
  - [x] Redis caching
  - [x] Soft delete model
  - [x] Auto-status updater
- [ ] Phase 3 - Real-time & Advanced (2/2 features)
  - [ ] WebSocket notifications
  - [ ] Saved filters

---

## 🧪 Testes

**Script de testes:** `scripts/test_12_melhorias.js`

```bash
node scripts/test_12_melhorias.js
```

**Resultado esperado:**
```
✅ PASSOU: 1️⃣ Dashboard
✅ PASSOU: 2️⃣ Time-ago
✅ PASSOU: 3️⃣ Health Bar
✅ PASSOU: 4️⃣ Badges
✅ PASSOU: 5️⃣ Skeleton
✅ PASSOU: 6️⃣ Auto-Status
✅ PASSOU: 7️⃣ CSV Export
✅ PASSOU: 8️⃣ Cursor Pagination
✅ PASSOU: 9️⃣ Redis Cache
✅ PASSOU: 🔟 Soft Delete
⏳ EM DEV: 1️⃣1️⃣ WebSocket
⏳ EM DEV: 1️⃣2️⃣ Filtros
```

---

## 📞 Suporte

Para dúvidas ou problemas, veja:
- `IMPLEMENTACAO_12_MELHORIAS.js` - Documentação técnica detalhada
- `server.js` - Configuração global
- `routes/moduleRoutes.js` - Implementação das rotas

