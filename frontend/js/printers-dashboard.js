// Printers Dashboard JavaScript

let allPrinters = [];
let chartsInstances = {};
let currentPrinterId = null;
let editingPrinterId = null;
let printersRefreshTimer = null;
let printersDashboardInitialized = false;
let printersLoadPromise = null;
let inventoryLoadPromise = null;
let lastPrintersLoadAt = 0;
let lastInventoryLoadAt = 0;
let discoveredPrinters = [];
let allInventoryEvents = [];
let inventoryModelOptions = [];
let inventorySupplyItems = [];
let inventorySupplyMovements = [];
let currentInventorySubview = 'supplies';
let legacyOpsMode = 'entrada';
const TONER_MONO_ONLY = true;
const BROWSER_PRINTER_DEBUG = true;

function getCurrentPrintersView() {
  return String(window.__printersView || "list").toLowerCase();
}

function getPrinterLevelsForDebug(printer) {
  const levels = printer?.toner_levels || printer?.custom_data?.toner_levels || {};
  return {
    black: levels.black ?? levels.toner_black ?? levels.black_toner ?? levels.k ?? levels.bk ?? null,
    imaging: levels.imaging_unit ?? levels.image_unit ?? levels.imaging ?? levels.drum ?? levels.opc ?? null,
    raw: levels,
  };
}

function logPrintersDebugToBrowser(printers = []) {
  if (!BROWSER_PRINTER_DEBUG || typeof window === 'undefined' || !window.console) return;
  try {
    const rows = printers.map((p) => {
      const levels = getPrinterLevelsForDebug(p);
      return {
        nome: p.asset_name || p.hostname || '-',
        ip: p.ip_address || p.custom_data?.connection_details?.uri || '-',
        serial: p.serial_number || '-',
        status: p.status || 'unknown',
        toner_preto: levels.black,
        unidade_imagem: levels.imaging,
        ultima_leitura: p.last_check_time || p.updated_at || '-',
      };
    });

    console.groupCollapsed(`[PrintersDebug] Dados recebidos: ${rows.length} impressora(s)`);
    console.table(rows);
    printers.forEach((p) => {
      const levels = getPrinterLevelsForDebug(p);
      console.log('[PrintersDebug][Raw]', {
        id: p._id,
        nome: p.asset_name || p.hostname || '-',
        ip: p.ip_address || '-',
        toner_levels: p.toner_levels || null,
        custom_toner_levels: p.custom_data?.toner_levels || null,
        toner_preto_resolvido: levels.black,
        unidade_imagem_resolvida: levels.imaging,
      });
    });
    console.groupEnd();
  } catch (error) {
    console.error('[PrintersDebug] Falha ao montar log no navegador:', error);
  }
}

function destroyChartInstance(key, canvasEl) {
  if (chartsInstances[key]) {
    try { chartsInstances[key].destroy(); } catch (e) { /* noop */ }
    chartsInstances[key] = null;
  }

  if (typeof Chart !== 'undefined' && typeof Chart.getChart === 'function' && canvasEl) {
    const existing = Chart.getChart(canvasEl);
    if (existing) {
      try { existing.destroy(); } catch (e) { /* noop */ }
    }
  }
}

/**
 * Inicializa o dashboard de impressoras
 */
async function initPrintersDashboard() {
  console.log('Inicializando dashboard de impressoras...');

  await loadPrinters();
  setupEventListeners();
  if (getCurrentPrintersView() === "details" && window.__selectedPrinterId) {
    await showPrinterDetails(window.__selectedPrinterId, { navigate: false });
  } else if (getCurrentPrintersView() === "details" && !window.__selectedPrinterId) {
    showNotification("Selecione uma impressora na lista para abrir os detalhes", "info");
    if (typeof App !== "undefined" && typeof App.navigateTo === "function") {
      App.navigateTo("printers-list");
      return;
    }
  }

  if (!printersDashboardInitialized) {
    printersDashboardInitialized = true;
    printersRefreshTimer = setInterval(loadPrinters, 30000);
  }
}

/**
 * Carrega lista de impressoras do servidor
 */
async function loadPrinters() {
  const now = Date.now();
  if (printersLoadPromise) return printersLoadPromise;
  if (now - lastPrintersLoadAt < 1200) return;

  printersLoadPromise = (async () => {
  try {
    const response = await fetch('/api/printers', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    
    if (!response.ok) throw new Error('Erro ao carregar impressoras');
    
    const data = await response.json();
    allPrinters = data.printers || [];
    logPrintersDebugToBrowser(allPrinters);
    
    // Atualiza UI
    updateSummary(data.summary);
    renderPrintersTable(allPrinters);
    renderPrinterAlertsTable();
    renderCharts();
    updateMaintenancePrinterOptions();
    await loadInventoryPanel();
    
  } catch (error) {
    console.error('Erro ao carregar impressoras:', error);
    showNotification('Erro ao carregar impressoras', 'error');
  } finally {
    lastPrintersLoadAt = Date.now();
    printersLoadPromise = null;
  }
  })();

  return printersLoadPromise;
}

/**
 * Atualiza cards de resumo
 */
function updateSummary(summary) {
  if (!summary) return;
  const totalEl = document.getElementById('total-printers');
  const onlineEl = document.getElementById('online-printers');
  const offlineEl = document.getElementById('offline-printers');
  const maintenanceEl = document.getElementById('maintenance-printers');
  if (totalEl) totalEl.textContent = summary.total;
  if (onlineEl) onlineEl.textContent = summary.online;
  if (offlineEl) offlineEl.textContent = summary.offline;
  if (maintenanceEl) maintenanceEl.textContent = summary.maintenance;
}

function parseLevelPercent(rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === '') return null;
  let numeric = null;

  if (typeof rawValue === 'number') {
    numeric = Number.isFinite(rawValue) ? rawValue : null;
  } else {
    const text = String(rawValue).trim().replace(',', '.');
    const match = text.match(/-?\d+(\.\d+)?/);
    numeric = match ? Number(match[0]) : null;
  }

  if (!Number.isFinite(numeric)) return null;
  if (numeric > 0 && numeric <= 1) numeric = numeric * 100;
  if (numeric < 0) numeric = 0;
  if (numeric > 100) numeric = 100;
  return Math.round(numeric);
}

function getTonerBlackPercent(levels = {}) {
  const candidates = [
    levels.black,
    levels.toner_black,
    levels.black_toner,
    levels.k,
    levels.bk,
  ];
  for (const c of candidates) {
    const parsed = parseLevelPercent(c);
    if (parsed !== null) return parsed;
  }
  return null;
}

function getImagingPercent(levels = {}) {
  const candidates = [
    levels.imaging_unit,
    levels.image_unit,
    levels.imaging,
    levels.drum,
    levels.opc,
  ];
  for (const c of candidates) {
    const parsed = parseLevelPercent(c);
    if (parsed !== null) return parsed;
  }
  return null;
}

function normalizeSupplyCategory(rawCategory) {
  const value = String(rawCategory || '').trim().toLowerCase();
  const compact = value.replace(/[\s-]+/g, '_');
  if (['toner_black', 'toner', 'black_toner', 'bk_toner'].includes(compact)) return 'toner_black';
  if (['imaging_unit', 'image_unit', 'drum', 'opc', 'unidade_imagem', 'unidade_de_imagem'].includes(compact)) return 'imaging_unit';
  if (['backup_printer', 'printer_backup', 'impressora_backup'].includes(compact)) return 'backup_printer';
  return compact || 'other';
}

function updateInventorySummaryCardsFromSupplies(items = []) {
  const stockToner = items
    .filter((item) => normalizeSupplyCategory(item.category) === 'toner_black')
    .reduce((sum, item) => sum + Number(item.quantity_on_hand || 0), 0);
  const stockImaging = items
    .filter((item) => normalizeSupplyCategory(item.category) === 'imaging_unit')
    .reduce((sum, item) => sum + Number(item.quantity_on_hand || 0), 0);
  const stockBackup = items
    .filter((item) => normalizeSupplyCategory(item.category) === 'backup_printer')
    .reduce((sum, item) => sum + Number(item.quantity_on_hand || 0), 0);
  const lowTotal = allPrinters.filter((printer) => {
    const levels = printer?.toner_levels || printer?.custom_data?.toner_levels || {};
    const black = getTonerBlackPercent(levels);
    const imaging = getImagingPercent(levels);
    return (black !== null && black <= 15) || (imaging !== null && imaging <= 15);
  }).length;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };
  setText('inv-stock-toner', stockToner);
  setText('inv-stock-imaging', stockImaging);
  setText('inv-stock-backup', stockBackup);
  setText('inv-low-total', lowTotal);
}

/**
 * Renderiza tabela de impressoras
 */
function renderPrintersTable(printers) {
  const tbody = document.getElementById('printers-tbody');
  const emptyState = document.getElementById('printers-empty-state');
  if (!tbody || !emptyState) return;
  
  if (printers.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  // Aplica filtros
  const filtered = applyFilters(printers);
  
  tbody.innerHTML = filtered.map(printer => {
    const tonerLevels = printer.toner_levels || printer.custom_data?.toner_levels || {};
    const tonerDisplay = tonerLevels.black !== undefined ? `${tonerLevels.black}%` : 'N/A';
    const imagingDisplay = tonerLevels.imaging_unit !== undefined
      ? `${tonerLevels.imaging_unit}%`
      : (printer.custom_data?.imaging_supported === false ? 'Nao suportado' : 'N/A');
    
    const lastCheck = new Date(printer.last_check_time || printer.updated_at);
    const lastCheckFormatted = formatTime(lastCheck);
    
    return `
      <tr>
        <td><strong>${printer.hostname || printer.custom_data?.hostname || printer.asset_name || 'N/A'}</strong></td>
        <td>${printer.serial_number || '-'}</td>
        <td>${printer.manufacturer || 'N/A'}</td>
        <td>${printer.model || 'N/A'}</td>
        <td>${printer.connection_type === 'network' ? '🌐 Rede' : '🔌 USB'}</td>
        <td>${printer.ip_address || printer.custom_data?.connection_details?.uri || 'N/A'}</td>
        <td>${printer.unit || '-'}</td>
        <td>${printer.sector || '-'}</td>
        <td>${printer.floor || printer.location || '-'}</td>
        <td><span class="status-badge ${printer.status}">${(printer.status || 'unknown').toUpperCase()}</span></td>
        <td>
          <div class="toner-bar">
            <div class="toner-progress">
              <div class="toner-fill" style="width: ${tonerLevels.black || 0}%"></div>
            </div>
            <span>${tonerDisplay}</span>
          </div>
        </td>
        <td>${imagingDisplay}</td>
        <td><small>${lastCheckFormatted}</small></td>
        <td>
          <div class="table-actions">
            <button class="action-btn action-btn-view" onclick="showPrinterDetails('${printer._id}')" title="Ver detalhes" aria-label="Ver detalhes">&#128065;</button>
            <button class="action-btn action-btn-edit" onclick="openEditPrinter('${printer._id}')">Edit</button>
            <button class="action-btn action-btn-refresh" onclick="refreshPrinterStatus('${printer._id}')">🔄</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Aplica filtros à lista de impressoras
 */
function applyFilters(printers) {
  const statusFilter = document.getElementById('filter-status')?.value || '';
  const manufacturerFilter = document.getElementById('filter-manufacturer')?.value || '';
  const connectionFilter = document.getElementById('filter-connection')?.value || '';
  const searchFilter = (document.getElementById('filter-search')?.value || '').toLowerCase();
  
  return printers.filter(printer => {
    if (statusFilter && printer.status !== statusFilter) return false;
    if (manufacturerFilter && printer.manufacturer !== manufacturerFilter) return false;
    if (connectionFilter && printer.connection_type !== connectionFilter) return false;
    
    if (searchFilter) {
      const searchable = [
        printer.asset_name,
        printer.manufacturer,
        printer.model,
        printer.ip_address,
        printer.serial_number,
        printer.unit,
        printer.sector,
        printer.floor
      ].join(' ').toLowerCase();
      
      if (!searchable.includes(searchFilter)) return false;
    }
    
    return true;
  });
}

/**
 * Renderiza gráficos
 */
function renderCharts() {
  renderStatusChart();
  renderManufacturerChart();
  renderConnectionChart();
  renderTonerChart();
}

function getPrinterAlertInfo(printer) {
  const levels = printer?.toner_levels || printer?.custom_data?.toner_levels || {};
  const black = getTonerBlackPercent(levels);
  const imaging = getImagingPercent(levels);
  const status = String(printer?.status || '').toLowerCase();
  const reasons = [];

  if (black !== null && black <= 15) {
    reasons.push(`Toner baixo (${black}%)`);
  }
  if (imaging !== null && imaging <= 15) {
    reasons.push(`Imagem baixa (${imaging}%)`);
  }
  if (status === 'offline') reasons.push('Status offline');
  if (status === 'maintenance') reasons.push('Em manutencao');

  const isCritical = (black !== null && black <= 5)
    || (imaging !== null && imaging <= 5)
    || status === 'offline';
  const hasSupplyAlert = reasons.some((r) => r.includes('Toner') || r.includes('Imagem'));
  const hasStatusAlert = status === 'offline' || status === 'maintenance';

  return { reasons, isCritical, hasSupplyAlert, hasStatusAlert, black, imaging };
}

function renderPrinterAlertsTable() {
  const tbody = document.getElementById('printer-alerts-tbody');
  const emptyState = document.getElementById('printer-alerts-empty-state');
  if (!tbody || !emptyState) return;

  const tonerFilter = (document.getElementById('alert-filter-toner')?.value || '').trim().toLowerCase();
  const imagingFilter = (document.getElementById('alert-filter-imaging')?.value || '').trim().toLowerCase();
  const typeFilter = (document.getElementById('alert-filter-type')?.value || '').trim().toLowerCase();
  const searchFilter = (document.getElementById('alert-filter-search')?.value || '').trim().toLowerCase();

  let rows = allPrinters
    .map((printer) => ({ printer, alert: getPrinterAlertInfo(printer) }))
    .filter(({ alert }) => {
      if (!tonerFilter && !imagingFilter) return alert.reasons.length > 0;
      return true;
    });

  if (tonerFilter) {
    rows = rows.filter(({ alert }) => {
      const value = alert.black;
      if (tonerFilter === 'na') return value === null;
      if (value === null) return false;
      if (tonerFilter === 'critical') return value <= 5;
      if (tonerFilter === 'low') return value <= 15;
      if (tonerFilter === 'ok') return value > 15;
      return true;
    });
  }

  if (imagingFilter) {
    rows = rows.filter(({ alert }) => {
      const value = alert.imaging;
      if (imagingFilter === 'na') return value === null;
      if (value === null) return false;
      if (imagingFilter === 'critical') return value <= 5;
      if (imagingFilter === 'low') return value <= 15;
      if (imagingFilter === 'ok') return value > 15;
      return true;
    });
  }

  if (typeFilter === 'supplies') rows = rows.filter(({ alert }) => alert.hasSupplyAlert);
  if (typeFilter === 'status') rows = rows.filter(({ alert }) => alert.hasStatusAlert);
  if (typeFilter === 'critical') rows = rows.filter(({ alert }) => alert.isCritical);

  if (searchFilter) {
    rows = rows.filter(({ printer, alert }) => {
      const text = [
        printer.asset_name,
        printer.hostname,
        printer.serial_number,
        printer.manufacturer,
        printer.model,
        printer.ip_address,
        alert.reasons.join(' '),
      ].map((v) => String(v || '').toLowerCase()).join(' ');
      return text.includes(searchFilter);
    });
  }

  if (!rows.length) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  tbody.innerHTML = rows.map(({ printer, alert }) => {
    const displayName = printer.hostname || printer.custom_data?.hostname || printer.asset_name || '-';
    const blackText = alert.black === null ? 'N/A' : `${alert.black}%`;
    const imagingText = alert.imaging === null ? 'N/A' : `${alert.imaging}%`;
    const lastCheck = formatTime(new Date(printer.last_check_time || printer.updated_at));
    return `
      <tr>
        <td><strong>${displayName}</strong></td>
        <td>${printer.serial_number || '-'}</td>
        <td><span class="status-badge ${printer.status}">${String(printer.status || 'unknown').toUpperCase()}</span></td>
        <td>${blackText}</td>
        <td>${imagingText}</td>
        <td>${lastCheck}</td>
        <td>${alert.reasons.join(' | ')}</td>
      </tr>
    `;
  }).join('');
}

function switchPrintersSubtab(tab) {
  const panels = {
    list: document.getElementById('printers-tab-list'),
    details: document.getElementById('printers-tab-details'),
    stock: document.getElementById('printers-tab-stock'),
    history: document.getElementById('printers-tab-history'),
  };
  const buttons = {
    list: document.getElementById('btn-tab-list'),
    details: document.getElementById('btn-tab-details'),
    stock: document.getElementById('btn-tab-stock'),
    history: document.getElementById('btn-tab-history'),
  };

  Object.entries(panels).forEach(([key, el]) => {
    if (!el) return;
    if (key === tab) el.classList.add('is-active');
    else el.classList.remove('is-active');
  });
  Object.entries(buttons).forEach(([key, el]) => {
    if (!el) return;
    if (key === tab) el.classList.add('is-active');
    else el.classList.remove('is-active');
  });
}

function filterSupplyItemsBySubview(items) {
  return items;
}

function filterSupplyMovementsBySubview(rows) {
  return rows;
}

function switchInventorySubview(tab) {
  currentInventorySubview = tab === 'backups' ? 'backups' : 'supplies';

  const suppliesBtn = document.getElementById('btn-inv-tab-supplies');
  const backupsBtn = document.getElementById('btn-inv-tab-backups');
  if (suppliesBtn) suppliesBtn.classList.toggle('is-active', currentInventorySubview === 'supplies');
  if (backupsBtn) backupsBtn.classList.toggle('is-active', currentInventorySubview === 'backups');

  document.querySelectorAll('.inventory-view').forEach((el) => {
    const visibleToSupplies = el.classList.contains('inventory-view-supplies');
    const visibleToBackups = el.classList.contains('inventory-view-backups');
    const visibleToBoth = el.classList.contains('inventory-view-both');

    const visible = visibleToBoth
      || (currentInventorySubview === 'supplies' && visibleToSupplies)
      || (currentInventorySubview === 'backups' && visibleToBackups);
    el.classList.toggle('is-hidden', !visible);
  });

  const stockItem = document.getElementById('inv-stock-item');
  const maintItem = document.getElementById('inv-maint-item');
  if (currentInventorySubview === 'backups') {
    if (stockItem) stockItem.value = 'backup_printer';
    if (maintItem) maintItem.value = 'backup_printer';
  } else {
    if (stockItem && stockItem.value === 'backup_printer') stockItem.value = 'toner_black';
    if (maintItem && maintItem.value === 'backup_printer') maintItem.value = 'toner_black';
  }

  renderInventoryEventsTable();
  renderSuppliesTable();
  renderSupplyMovementsTable();
  populateSupplySelects();
}

function applyPrintersTarget(target) {
  if (!target) return;

  if (target === 'inventory-supplies') {
    switchPrintersSubtab('stock');
    switchInventorySubview('supplies');
    document.getElementById('supply-sku')?.focus();
    return;
  }

  if (target === 'inventory-backups') {
    switchPrintersSubtab('stock');
    switchInventorySubview('backups');
  }
}

function buildTonerLevelsHtml(tonerLevels) {
  if (!tonerLevels || Object.keys(tonerLevels).length === 0) {
    return '<p style="color: #7f8c8d;">Dados de toner nao disponiveis</p>';
  }
  return Object.entries(tonerLevels).map(([color, level]) => `
    <div class="toner-level-item">
      <div class="toner-level-label">${color.charAt(0).toUpperCase() + color.slice(1)}</div>
      <div class="toner-level-bar">
        <div class="toner-level-fill" style="width: ${level}%"></div>
      </div>
      <div class="toner-level-value">${level}%</div>
    </div>
  `).join('');
}

/**
 * Gráfico de status
 */
function renderStatusChart() {
  const ctx = document.getElementById('printer-chart-status');
  if (!ctx) return;
  
  const summary = {
    online: allPrinters.filter(p => p.status === 'online').length,
    offline: allPrinters.filter(p => p.status === 'offline').length,
    maintenance: allPrinters.filter(p => p.status === 'maintenance').length,
  };
  
  destroyChartInstance('status', ctx);
  
  chartsInstances.status = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Online', 'Offline', 'Manutenção'],
      datasets: [{
        data: [summary.online, summary.offline, summary.maintenance],
        backgroundColor: ['#27ae60', '#e74c3c', '#f39c12'],
        borderColor: ['#229954', '#c0392b', '#d68910'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

/**
 * Gráfico de fabricante
 */
function renderManufacturerChart() {
  const ctx = document.getElementById('printer-chart-manufacturer');
  if (!ctx) return;
  
  const manufacturers = {};
  allPrinters.forEach(p => {
    const mfg = p.manufacturer || 'Unknown';
    manufacturers[mfg] = (manufacturers[mfg] || 0) + 1;
  });
  
  destroyChartInstance('manufacturer', ctx);
  
  chartsInstances.manufacturer = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(manufacturers),
      datasets: [{
        label: 'Quantidade',
        data: Object.values(manufacturers),
        backgroundColor: '#3498db',
        borderColor: '#2980b9',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      indexAxis: 'y',
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { beginAtZero: true }
      }
    }
  });
}

/**
 * Gráfico de conexão
 */
function renderConnectionChart() {
  const ctx = document.getElementById('printer-chart-connection');
  if (!ctx) return;
  
  const network = allPrinters.filter(p => p.connection_type === 'network').length;
  const usb = allPrinters.filter(p => p.connection_type === 'usb').length;
  
  destroyChartInstance('connection', ctx);
  
  chartsInstances.connection = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Rede (IP)', 'USB'],
      datasets: [{
        data: [network, usb],
        backgroundColor: ['#3498db', '#e74c3c'],
        borderColor: ['#2980b9', '#c0392b'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

/**
 * Gráfico de toner
 */
function renderTonerChart() {
  const ctx = document.getElementById('printer-chart-toner');
  if (!ctx) return;
  
  const colors = TONER_MONO_ONLY ? ['black', 'imaging_unit'] : ['black', 'cyan', 'magenta', 'yellow', 'imaging_unit'];
  const averages = {};
  
  colors.forEach(color => {
    const levels = allPrinters
      .map(p => (p.toner_levels || p.custom_data?.toner_levels || {})[color])
      .filter(l => l !== undefined);
    
    if (levels.length > 0) {
      averages[color] = Math.round(levels.reduce((a, b) => a + b) / levels.length);
    }
  });
  
  if (Object.keys(averages).length === 0) {
    // Sem dados de toner
    destroyChartInstance('toner', ctx);
    return;
  }
  
  destroyChartInstance('toner', ctx);
  
  chartsInstances.toner = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(averages).map(c => c === 'imaging_unit'
        ? 'Imagem'
        : c.charAt(0).toUpperCase() + c.slice(1)),
      datasets: [{
        label: 'Nível Médio (%)',
        data: Object.values(averages),
        backgroundColor: TONER_MONO_ONLY
          ? ['#2c3e50']
          : ['#2c3e50', '#3498db', '#e91e63', '#f39c12'],
        borderColor: TONER_MONO_ONLY
          ? ['#1a252f']
          : ['#1a252f', '#2980b9', '#c2185b', '#d68910'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      indexAxis: 'y',
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { 
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
}

/**
 * Mostra detalhes de uma impressora
 */
function toSafeText(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text || "");
  return div.innerHTML;
}

function formatAbsoluteDateTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
}

function renderDetailTableRows(tbodyId, rowsHtml, emptyCols, emptyMessage) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  if (rowsHtml && rowsHtml.length > 0) {
    tbody.innerHTML = rowsHtml.join("");
    return;
  }
  tbody.innerHTML = `<tr><td colspan="${emptyCols}">${emptyMessage}</td></tr>`;
}

function renderPrinterServiceDetails(printer) {
  const data = printer?.custom_data || {};
  const inputTrays = Array.isArray(data.paper_trays_input) ? data.paper_trays_input : [];
  const outputTrays = Array.isArray(data.paper_trays_output) ? data.paper_trays_output : [];
  const hardware = data.hardware_resources && typeof data.hardware_resources === "object"
    ? data.hardware_resources
    : {};
  const alerts = Array.isArray(data.alerts) ? data.alerts : [];
  const ports = Array.isArray(data.open_ports) ? data.open_ports : [];

  const inputRows = inputTrays.map((tray) => {
    const pct = tray.percent === null || tray.percent === undefined ? "-" : `${tray.percent}%`;
    return `
      <tr>
        <td>${escapeHtml(toSafeText(tray.description, `Bandeja ${tray.index || "-"}`))}</td>
        <td>${escapeHtml(toSafeText(tray.capacity, "-"))}</td>
        <td>${escapeHtml(toSafeText(tray.current_level, "-"))}</td>
        <td>${escapeHtml(pct)}</td>
        <td>${escapeHtml(toSafeText(tray.media_name, "-"))}</td>
        <td>${escapeHtml(toSafeText(tray.media_type, "-"))}</td>
        <td>${escapeHtml(toSafeText(tray.status, "-"))}</td>
      </tr>
    `;
  });
  renderDetailTableRows("detail-paper-input-tbody", inputRows, 7, "Sem dados de bandejas de entrada");

  const outputRows = outputTrays.map((tray) => `
    <tr>
      <td>${escapeHtml(toSafeText(tray.description, `Saida ${tray.index || "-"}`))}</td>
      <td>${escapeHtml(toSafeText(tray.capacity, "-"))}</td>
      <td>${escapeHtml(toSafeText(tray.current_level, "-"))}</td>
      <td>${escapeHtml(toSafeText(tray.status, "-"))}</td>
    </tr>
  `);
  renderDetailTableRows("detail-paper-output-tbody", outputRows, 4, "Sem dados de bandejas de saida");

  const alertsEl = document.getElementById("detail-alerts-list");
  if (alertsEl) {
    if (!alerts.length) {
      alertsEl.innerHTML = '<p class="detail-muted">Sem alertas ativos</p>';
    } else {
      alertsEl.innerHTML = alerts.map((alert) => (
        `<span class="detail-alert-chip">${escapeHtml(alert.type || "alerta")} (${escapeHtml(toSafeText(alert.percent, "-"))}%)</span>`
      )).join("");
    }
  }

  const setIfExists = (id, value, cssClass) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value;
    if (cssClass) el.className = cssClass;
  };

  setIfExists("detail-snmp", data.snmp_available === false ? "Indisponivel" : "Disponivel");
  setIfExists("detail-response-ms", data.response_ms !== null && data.response_ms !== undefined ? `${data.response_ms} ms` : "-");
  setIfExists("detail-firmware", data.firmware || "-");
  setIfExists("detail-total-pages", printer.total_pages !== null && printer.total_pages !== undefined ? String(printer.total_pages) : "-");
  setIfExists("detail-ram-mb", hardware.ram_mb !== null && hardware.ram_mb !== undefined ? `${hardware.ram_mb} MB` : "-");
  setIfExists("detail-duplex", hardware.duplex_installed ? "Sim" : "Nao");
  setIfExists("detail-open-ports", ports.length ? ports.join(", ") : "-");
  setIfExists("detail-alert-count", String(alerts.length));
}

async function showPrinterDetails(printerId, options = {}) {
  const navigate = options.navigate !== false;
  if (navigate) {
    window.__selectedPrinterId = printerId;
    if (typeof App !== "undefined" && typeof App.navigateTo === "function") {
      App.navigateTo("printers-details");
      return;
    }
  }

  try {
    const response = await fetch(`/api/printers/${printerId}`, {
      headers: { "Authorization": `Bearer ${getAuthToken()}` }
    });

    if (!response.ok) throw new Error("Erro ao carregar detalhes");

    const { printer } = await response.json();
    currentPrinterId = printerId;
    window.__selectedPrinterId = printerId;

    const tonerLevels = printer.toner_levels || printer.custom_data?.toner_levels || {};
    const lastCheck = `${formatTime(new Date(printer.last_check_time || printer.updated_at))} (${formatAbsoluteDateTime(printer.last_check_time || printer.updated_at)})`;
    const setIfExists = (id, value, cssClass) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = value;
      if (cssClass) el.className = cssClass;
    };

    setIfExists("modal-printer-name", printer.asset_name || "-");
    setIfExists("detail-page-title", `Detalhes: ${printer.asset_name || "-"}`);
    setIfExists("detail-name", printer.asset_name || "-");
    setIfExists("detail-manufacturer", printer.manufacturer || "N/A");
    setIfExists("detail-model", printer.model || "N/A");
    setIfExists("detail-serial", printer.serial_number || "N/A");
    setIfExists("detail-connection", printer.connection_type === "network" ? "Rede (IP)" : "USB");
    setIfExists("detail-address", printer.ip_address || printer.usb_path || "N/A");
    setIfExists("detail-status", String(printer.status || "unknown").toUpperCase(), `status-badge ${printer.status}`);
    setIfExists("detail-last-check", lastCheck);

    setIfExists("tab-detail-name", printer.asset_name || "-");
    setIfExists("tab-detail-manufacturer", printer.manufacturer || "N/A");
    setIfExists("tab-detail-model", printer.model || "N/A");
    setIfExists("tab-detail-serial", printer.serial_number || "N/A");
    setIfExists("tab-detail-connection", printer.connection_type === "network" ? "Rede (IP)" : "USB");
    setIfExists("tab-detail-address", printer.ip_address || printer.usb_path || "N/A");
    setIfExists("tab-detail-status", String(printer.status || "unknown").toUpperCase(), `status-badge ${printer.status}`);
    setIfExists("tab-detail-last-check", lastCheck);

    const tonerContainer = document.getElementById("toner-levels-container");
    if (tonerContainer) tonerContainer.innerHTML = buildTonerLevelsHtml(tonerLevels);
    const tabTonerContainer = document.getElementById("tab-toner-levels-container");
    if (tabTonerContainer) tabTonerContainer.innerHTML = buildTonerLevelsHtml(tonerLevels);
    renderPrinterServiceDetails(printer);

    if (getCurrentPrintersView() !== "details") {
      const modal = document.getElementById("modal-printer-details");
      if (modal) modal.style.display = "flex";
    }
  } catch (error) {
    console.error("Erro ao carregar detalhes:", error);
    showNotification("Erro ao carregar detalhes da impressora", "error");
  }
}

/**
 * Atualiza status de uma impressora
 */
async function refreshPrinterStatus(printerId) {
  try {
    const response = await fetch(`/api/printers/${printerId}/refresh-status`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    
    if (!response.ok) throw new Error('Erro ao atualizar status');
    
    showNotification('Status da impressora atualizado', 'success');
    
    // Recarrega impressoras após 2 segundos
    setTimeout(loadPrinters, 2000);
    
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    showNotification('Erro ao atualizar status', 'error');
  }
}

/**
 * Abre modal de registro de impressora
 */
function openRegisterModal() {
  editingPrinterId = null;
  const title = document.getElementById('modal-register-title');
  const saveBtn = document.getElementById('modal-btn-save-register');
  const serialInput = document.getElementById('reg-serial');
  if (title) title.textContent = 'Registrar Nova Impressora';
  if (saveBtn) saveBtn.textContent = 'Registrar';
  if (serialInput) serialInput.disabled = false;
  document.getElementById('modal-register-printer').style.display = 'flex';
}

/**
 * Fecha modal de registro
 */
function closeRegisterModal() {
  editingPrinterId = null;
  const title = document.getElementById('modal-register-title');
  const saveBtn = document.getElementById('modal-btn-save-register');
  const serialInput = document.getElementById('reg-serial');
  if (title) title.textContent = 'Registrar Nova Impressora';
  if (saveBtn) saveBtn.textContent = 'Registrar';
  if (serialInput) serialInput.disabled = false;
  document.getElementById('modal-register-printer').style.display = 'none';
  document.getElementById('form-register-printer').reset();
}

function openEditPrinter(printerId) {
  const printer = allPrinters.find((p) => p._id === printerId);
  if (!printer) {
    showNotification('Impressora nao encontrada para edicao', 'error');
    return;
  }

  editingPrinterId = printerId;
  document.getElementById('reg-name').value = printer.asset_name || '';
  document.getElementById('reg-serial').value = printer.serial_number || '';
  document.getElementById('reg-manufacturer').value = printer.manufacturer || '';
  document.getElementById('reg-model').value = printer.model || '';
  document.getElementById('reg-connection').value = printer.connection_type || '';
  document.getElementById('reg-ip').value = printer.ip_address || '';
  document.getElementById('reg-usb').value = printer.usb_path || '';
  document.getElementById('reg-hostname').value = printer.hostname || '';
  document.getElementById('reg-mac').value = printer.mac_address || '';
  document.getElementById('reg-location').value = printer.location || printer.floor || '';
  document.getElementById('reg-unit').value = printer.unit || '';
  document.getElementById('reg-sector').value = printer.sector || '';
  document.getElementById('reg-floor').value = printer.floor || '';
  toggleConnectionFields();

  const title = document.getElementById('modal-register-title');
  const saveBtn = document.getElementById('modal-btn-save-register');
  const serialInput = document.getElementById('reg-serial');
  if (title) title.textContent = 'Editar Impressora';
  if (saveBtn) saveBtn.textContent = 'Salvar Alteracoes';
  if (serialInput) serialInput.disabled = false;

  document.getElementById('modal-register-printer').style.display = 'flex';
}

/**
 * Alterna campos de conexão no formulário
 */
function toggleConnectionFields() {
  const connection = document.getElementById('reg-connection').value;
  document.getElementById('group-ip-address').style.display = connection === 'network' ? 'block' : 'none';
  document.getElementById('group-usb-port').style.display = connection === 'usb' ? 'block' : 'none';
}

/**
 * Registra nova impressora
 */
async function registerPrinter() {
  const form = document.getElementById('form-register-printer');
  
  if (!form.checkValidity()) {
    showNotification('Preencha todos os campos obrigatórios', 'error');
    return;
  }
  
  const data = {
    asset_name: document.getElementById('reg-name').value,
    serial_number: document.getElementById('reg-serial').value,
    manufacturer: document.getElementById('reg-manufacturer').value,
    model: document.getElementById('reg-model').value,
    connection_type: document.getElementById('reg-connection').value,
    ip_address: document.getElementById('reg-ip').value || null,
    usb_path: document.getElementById('reg-usb').value || null,
    hostname: document.getElementById('reg-hostname').value || null,
    mac_address: document.getElementById('reg-mac').value || null,
    location: document.getElementById('reg-location').value || null,
    floor: document.getElementById('reg-floor').value || document.getElementById('reg-location').value || null,
    unit: document.getElementById('reg-unit').value || null,
    sector: document.getElementById('reg-sector').value || null,
    custom_data: { print_mode: 'mono' },
  };
  
  try {
    const isEditing = Boolean(editingPrinterId);
    const endpoint = isEditing ? `/api/printers/${editingPrinterId}` : '/api/printers/register';
    const method = isEditing ? 'PUT' : 'POST';
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(data)
    });
    
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Erro ao registrar impressora');

    const message = isEditing
      ? 'Impressora atualizada com sucesso'
      : (payload.updated
        ? (payload.message || 'Impressora atualizada com sucesso')
        : 'Impressora registrada com sucesso');
    showNotification(message, 'success');
    closeRegisterModal();
    await loadPrinters();
    
  } catch (error) {
    console.error('Erro ao registrar:', error);
    showNotification(error.message || 'Erro ao registrar impressora', 'error');
  }
}

async function loadInventoryPanel() {
  const now = Date.now();
  if (inventoryLoadPromise) return inventoryLoadPromise;
  if (now - lastInventoryLoadAt < 1200) return;

  inventoryLoadPromise = (async () => {
  try {
    const [summaryRes, suppliesRes, supplyMovementsRes] = await Promise.all([
      fetch('/api/printers/inventory/summary', {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      }),
      fetch('/api/printers/inventory/supplies?limit=300', {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      }),
      fetch('/api/printers/inventory/movements?limit=300', {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      }),
    ]);

    if (summaryRes.ok) {
      const payload = await summaryRes.json();
      const stock = payload.stock || {};
      inventoryModelOptions = Array.isArray(payload.model_options) ? payload.model_options : [];
      populateInventoryModelOptions(stock.by_model || {});
    }

    if (suppliesRes.ok) {
      const payload = await suppliesRes.json();
      inventorySupplyItems = Array.isArray(payload.items) ? payload.items : [];
      updateInventorySummaryCardsFromSupplies(inventorySupplyItems);
      renderSuppliesTable();
      populateSupplySelects();
    }

    if (supplyMovementsRes.ok) {
      const payload = await supplyMovementsRes.json();
      inventorySupplyMovements = Array.isArray(payload.movements) ? payload.movements : [];
      renderSupplyMovementsTable();
    }
  } catch (error) {
    console.error('Erro ao carregar inventario:', error);
  } finally {
    lastInventoryLoadAt = Date.now();
    inventoryLoadPromise = null;
  }
  })();

  return inventoryLoadPromise;
}

function setLegacyOpsMode(mode) {
  legacyOpsMode = mode || 'entrada';
  ['entrada', 'saida', 'defeito', 'pedido', 'coleta', 'referencia'].forEach((m) => {
    const btn = document.getElementById(`btn-legacy-${m}`);
    if (btn) btn.classList.toggle('is-active', m === legacyOpsMode);
  });
  renderLegacyOperationalTable();
}

function _legacyIncludes(text, term) {
  return String(text || '').toLowerCase().includes(String(term || '').toLowerCase());
}

function renderLegacyOperationalTable() {
  const head = document.getElementById('legacy-ops-head');
  const body = document.getElementById('legacy-ops-tbody');
  const empty = document.getElementById('legacy-ops-empty');
  if (!head || !body || !empty) return;

  let headers = [];
  let rows = [];

  if (legacyOpsMode === 'entrada') {
    headers = ['Data', 'Insumo', 'Tipo', 'Qtd', 'Referencia', 'Motivo'];
    rows = inventorySupplyMovements
      .filter((mv) => ['in', 'initial'].includes(String(mv.movement_type || '').toLowerCase()))
      .map((mv) => [
        mv.created_at ? formatDate(mv.created_at) : '-',
        mv.supply_id?.name || '-',
        mv.movement_type || '-',
        mv.quantity ?? 0,
        mv.reference || '-',
        mv.reason || '-',
      ]);
  } else if (legacyOpsMode === 'saida') {
    headers = ['Data', 'Insumo', 'Impressora', 'Tipo', 'Qtd', 'Motivo'];
    rows = inventorySupplyMovements
      .filter((mv) => ['out', 'consumption', 'transfer'].includes(String(mv.movement_type || '').toLowerCase()))
      .map((mv) => [
        mv.created_at ? formatDate(mv.created_at) : '-',
        mv.supply_id?.name || '-',
        mv.printer_id?.asset_name || '-',
        mv.movement_type || '-',
        mv.quantity ?? 0,
        mv.reason || '-',
      ]);
  } else if (legacyOpsMode === 'defeito') {
    headers = ['Data', 'Impressora', 'Item', 'Tipo Evento', 'Motivo', 'Obs'];
    rows = allInventoryEvents
      .filter((ev) => _legacyIncludes(ev.reason, 'defeito') || _legacyIncludes(ev.notes, 'defeito'))
      .map((ev) => [
        ev.created_at ? formatDate(ev.created_at) : '-',
        findPrinterDisplayName(ev.printer_id, ev.metadata),
        formatInventoryItemType(ev.item_type),
        formatInventoryEventType(ev.event_type),
        ev.reason || '-',
        ev.notes || '-',
      ]);
  } else if (legacyOpsMode === 'pedido') {
    headers = ['Insumo', 'SKU', 'Qtd Atual', 'Minimo', 'Sugestao', 'Fabricante/Modelo'];
    rows = inventorySupplyItems
      .filter((item) => Number(item.quantity_on_hand || 0) <= Number(item.min_stock || 0))
      .map((item) => {
        const current = Number(item.quantity_on_hand || 0);
        const minimum = Number(item.min_stock || 0);
        return [
          item.name || '-',
          item.sku || '-',
          current,
          minimum,
          Math.max(0, minimum - current),
          `${item.manufacturer || '-'} / ${item.model_family || '-'}`,
        ];
      });
  } else if (legacyOpsMode === 'coleta') {
    headers = ['Data', 'Insumo', 'Tipo', 'Qtd', 'Referencia', 'Motivo'];
    rows = inventorySupplyMovements
      .filter((mv) => _legacyIncludes(mv.reason, 'coleta') || _legacyIncludes(mv.notes, 'coleta'))
      .map((mv) => [
        mv.created_at ? formatDate(mv.created_at) : '-',
        mv.supply_id?.name || '-',
        mv.movement_type || '-',
        mv.quantity ?? 0,
        mv.reference || '-',
        mv.reason || '-',
      ]);
  } else if (legacyOpsMode === 'referencia') {
    headers = ['Serie', 'Andar', 'Departamento', 'Setor', 'Modelo', 'Status'];
    rows = allPrinters.map((p) => [
      p.serial_number || '-',
      p.floor || p.location || '-',
      p.unit || '-',
      p.sector || '-',
      `${p.manufacturer || '-'} ${p.model || '-'}`.trim(),
      p.status || '-',
    ]);
  }

  head.innerHTML = `<tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>`;
  if (!rows.length) {
    body.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  body.innerHTML = rows.slice(0, 500)
    .map((cols) => `<tr>${cols.map((col) => `<td>${col ?? '-'}</td>`).join('')}</tr>`)
    .join('');
}

function populateInventoryModelOptions(byModelStock = {}) {
  const modelSelect = document.getElementById('inv-stock-model');
  if (!modelSelect) return;
  const options = inventoryModelOptions.length
    ? inventoryModelOptions
    : Object.keys(byModelStock).map((key) => ({
      key,
      label: byModelStock[key]?.label || key,
    }));
  modelSelect.innerHTML = [
    '<option value="">Selecione...</option>',
    ...options.map((opt) => `<option value="${opt.key}">${opt.label}</option>`),
  ].join('');
}

function formatInventoryEventType(type) {
  const map = {
    stock_adjustment: 'Ajuste Estoque',
    toner_replacement: 'Troca Toner',
    imaging_replacement: 'Troca Imagem',
    maintenance: 'Manutencao',
    alert: 'Alerta',
  };
  return map[type] || type || '-';
}

function formatInventoryItemType(type) {
  const map = {
    toner_black: 'Toner Preto',
    imaging_unit: 'Unidade Imagem',
    maintenance_kit: 'Kit Manutencao',
    backup_printer: 'Impressora Backup',
    other: 'Outro',
  };
  return map[type] || type || '-';
}

function getInventoryModelLabel(modelKey) {
  if (!modelKey) return null;
  const found = inventoryModelOptions.find((opt) => opt.key === modelKey);
  return found?.label || modelKey;
}

function findPrinterDisplayName(printerId, metadata = {}) {
  const printer = allPrinters.find((p) => String(p._id) === String(printerId));
  if (printer) return `${printer.asset_name || printer.hostname || 'Printer'} (${printer.serial_number || '-'})`;
  if (metadata?.printer_name || metadata?.printer_serial) {
    return `${metadata.printer_name || 'Printer'} (${metadata.printer_serial || '-'})`;
  }
  return '-';
}

function renderInventoryEventsTable() {
  const tbody = document.getElementById('inventory-events-tbody');
  const emptyState = document.getElementById('inventory-empty-state');
  if (!tbody || !emptyState) return;

  const typeFilter = (document.getElementById('inv-filter-type')?.value || '').trim();
  const printerFilter = (document.getElementById('inv-filter-printer')?.value || '').trim().toLowerCase();

  const filtered = allInventoryEvents.filter((event) => {
    if (currentInventorySubview === 'backups' && event.item_type !== 'backup_printer') return false;
    if (currentInventorySubview === 'supplies' && event.item_type === 'backup_printer') return false;
    if (typeFilter && event.event_type !== typeFilter) return false;
    if (!printerFilter) return true;
    const printerLabel = findPrinterDisplayName(event.printer_id, event.metadata).toLowerCase();
    const reason = String(event.reason || '').toLowerCase();
    return printerLabel.includes(printerFilter) || reason.includes(printerFilter);
  });

  if (!filtered.length) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  tbody.innerHTML = filtered.map((event) => {
    const date = event.created_at ? formatTime(new Date(event.created_at)) : '-';
    const delta = Number(event.quantity_delta || 0);
    const deltaText = delta > 0 ? `+${delta}` : String(delta);
    const stockAfter = event.quantity_after === null || event.quantity_after === undefined ? '-' : event.quantity_after;
    const printerLabel = findPrinterDisplayName(event.printer_id, event.metadata);
    return `
      <tr>
        <td>${date}</td>
        <td>${formatInventoryEventType(event.event_type)}</td>
        <td>${printerLabel}</td>
        <td>${formatInventoryItemType(event.item_type)}${event.metadata?.model_label ? ` (${event.metadata.model_label})` : ''}</td>
        <td>${deltaText}</td>
        <td>${stockAfter}</td>
        <td>${event.reason || '-'}</td>
        <td>${event.notes || '-'}</td>
      </tr>
    `;
  }).join('');
}

function renderSuppliesTable() {
  const tbody = document.getElementById('supplies-tbody');
  const emptyState = document.getElementById('supplies-empty-state');
  if (!tbody || !emptyState) return;

  const categoryFilter = (document.getElementById('stock-filter-category')?.value || '').trim();
  const statusFilter = (document.getElementById('stock-filter-status')?.value || '').trim();
  const searchFilter = (document.getElementById('stock-filter-search')?.value || '').trim().toLowerCase();

  let visibleItems = filterSupplyItemsBySubview(inventorySupplyItems);
  if (categoryFilter) {
    visibleItems = visibleItems.filter((item) => String(item.category || '') === categoryFilter);
  }
  if (statusFilter === 'low') {
    visibleItems = visibleItems.filter((item) => Boolean(item.is_low_stock));
  } else if (statusFilter === 'ok') {
    visibleItems = visibleItems.filter((item) => !item.is_low_stock);
  }
  if (searchFilter) {
    visibleItems = visibleItems.filter((item) => {
      const haystack = [
        item.sku,
        item.name,
        item.manufacturer,
        item.model_family,
        item.storage_location,
      ].map((v) => String(v || '').toLowerCase()).join(' ');
      return haystack.includes(searchFilter);
    });
  }

  if (!visibleItems.length) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  tbody.innerHTML = visibleItems.map((item) => `
    <tr>
      <td>${item.sku || '-'}</td>
      <td>${item.name || '-'}</td>
      <td>${formatInventoryItemType(item.category)}</td>
      <td>${item.manufacturer || '-'}</td>
      <td>${item.model_family || '-'}</td>
      <td>${item.quantity_on_hand ?? 0}</td>
      <td>${item.min_stock ?? 0}</td>
      <td>${item.is_low_stock ? '<span class="status-badge offline">BAIXO</span>' : '<span class="status-badge online">OK</span>'}</td>
    </tr>
  `).join('');
}

function renderSupplyMovementsTable() {
  const tbody = document.getElementById('supply-movements-tbody');
  const emptyState = document.getElementById('supply-movements-empty-state');
  if (!tbody || !emptyState) return;

  const typeFilter = (document.getElementById('mv-filter-type')?.value || '').trim().toLowerCase();
  const searchFilter = (document.getElementById('mv-filter-search')?.value || '').trim().toLowerCase();

  let visibleRows = filterSupplyMovementsBySubview(inventorySupplyMovements);
  if (typeFilter) {
    visibleRows = visibleRows.filter((mv) => String(mv.movement_type || '').toLowerCase() === typeFilter);
  }
  if (searchFilter) {
    visibleRows = visibleRows.filter((mv) => {
      const supply = String(mv.supply_id?.name || '').toLowerCase();
      const reason = String(mv.reason || '').toLowerCase();
      const notes = String(mv.notes || '').toLowerCase();
      return supply.includes(searchFilter) || reason.includes(searchFilter) || notes.includes(searchFilter);
    });
  }

  if (!visibleRows.length) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  tbody.innerHTML = visibleRows.map((mv) => `
    <tr>
      <td>${mv.created_at ? formatTime(new Date(mv.created_at)) : '-'}</td>
      <td>${mv.supply_id?.name || '-'}</td>
      <td>${mv.movement_type || '-'}</td>
      <td>${mv.quantity ?? 0}</td>
      <td>${mv.quantity_before ?? 0}</td>
      <td>${mv.quantity_after ?? 0}</td>
      <td>${mv.printer_id?.asset_name || '-'}</td>
      <td>${mv.reference || '-'}</td>
      <td>${mv.reason || '-'}</td>
    </tr>
  `).join('');
}

function populateSupplySelects() {
  const inSelect = document.getElementById('supply-in-item');
  const moveSelect = document.getElementById('supply-move-item');
  const visibleItems = filterSupplyItemsBySubview(inventorySupplyItems);
  const optionsHtml = visibleItems.map((item) => (
    `<option value="${item._id}">${item.name} (${item.sku})</option>`
  )).join('');
  if (inSelect) inSelect.innerHTML = optionsHtml;
  if (moveSelect) moveSelect.innerHTML = optionsHtml;
}

async function registerSupplyStockIn() {
  try {
    const supplyId = document.getElementById('supply-in-item')?.value;
    if (!supplyId) {
      showNotification('Selecione um insumo para entrada', 'error');
      return;
    }

    const quantity = Number(document.getElementById('supply-in-quantity')?.value || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      showNotification('Informe uma quantidade valida maior que zero', 'error');
      return;
    }

    const response = await fetch(`/api/printers/inventory/supplies/${supplyId}/movements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        movement_type: 'in',
        quantity,
        reason: 'reposicao_compra',
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || 'Erro ao registrar entrada de estoque');
    }

    showNotification('Entrada de estoque registrada com sucesso', 'success');
    await loadInventoryPanel();
  } catch (error) {
    console.error('Erro ao registrar entrada de estoque:', error);
    showNotification(error.message || 'Erro ao registrar entrada de estoque', 'error');
  }
}

function updateMaintenancePrinterOptions() {
  const select = document.getElementById('inv-maint-printer');
  if (!select) return;
  const sorted = [...allPrinters].sort((a, b) => String(a.asset_name || '').localeCompare(String(b.asset_name || ''), 'pt-BR'));
  select.innerHTML = sorted.map((p) => (
    `<option value="${p._id}">${p.asset_name || p.hostname || 'Printer'} (${p.serial_number || '-'})</option>`
  )).join('');
}

async function adjustInventoryStock(action) {
  try {
    const itemType = document.getElementById('inv-stock-item')?.value || 'toner_black';
    const mode = document.getElementById('inv-stock-mode')?.value || 'delta';
    const baseValue = Number(document.getElementById('inv-stock-value')?.value || 0);
    const reason = document.getElementById('inv-stock-reason')?.value || 'ajuste_manual';
    const notes = document.getElementById('inv-stock-notes')?.value || '';
    const scope = document.getElementById('inv-stock-scope')?.value || 'global';
    const modelKey = document.getElementById('inv-stock-model')?.value || '';
    const modelLabel = getInventoryModelLabel(modelKey);

    if (scope === 'model' && !modelKey) {
      showNotification('Selecione o modelo para ajustar estoque por modelo', 'error');
      return;
    }

    let value = baseValue;
    if (action === 'add_one') value = 1;
    if (action === 'subtract_one') value = -1;

    const response = await fetch('/api/printers/inventory/stock-adjust', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        item_type: itemType,
        mode,
        value,
        reason,
        notes,
        model_key: scope === 'model' ? modelKey : null,
        model_label: scope === 'model' ? modelLabel : null,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || 'Erro ao ajustar estoque');
    }

    showNotification('Estoque atualizado com sucesso', 'success');
    await loadInventoryPanel();
  } catch (error) {
    console.error('Erro ao ajustar estoque:', error);
    showNotification(error.message || 'Erro ao ajustar estoque', 'error');
  }
}

async function registerMaintenanceEvent() {
  try {
    const printerId = document.getElementById('inv-maint-printer')?.value;
    if (!printerId) {
      showNotification('Selecione uma impressora para registrar evento', 'error');
      return;
    }

    const eventType = document.getElementById('inv-maint-event')?.value || 'maintenance';
    const itemType = document.getElementById('inv-maint-item')?.value || 'other';
    const consumeStock = Boolean(document.getElementById('inv-maint-consume')?.checked);
    const consumeQty = Number(document.getElementById('inv-maint-qty')?.value || 1);
    const reason = document.getElementById('inv-maint-reason')?.value || '';
    const notes = document.getElementById('inv-maint-notes')?.value || '';

    const response = await fetch(`/api/printers/${printerId}/maintenance-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        event_type: eventType,
        item_type: itemType,
        consume_stock: consumeStock,
        consume_quantity: Number.isFinite(consumeQty) ? consumeQty : 1,
        reason,
        notes,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || 'Erro ao registrar evento');
    }

    showNotification('Evento registrado com sucesso', 'success');
    await loadPrinters();
  } catch (error) {
    console.error('Erro ao registrar evento:', error);
    showNotification(error.message || 'Erro ao registrar evento', 'error');
  }
}

async function createSupplyItem() {
  try {
    const sku = document.getElementById('supply-sku')?.value?.trim();
    const name = document.getElementById('supply-name')?.value?.trim();
    if (!sku || !name) {
      showNotification('Informe SKU e Nome do insumo', 'error');
      return;
    }

    const response = await fetch('/api/printers/inventory/supplies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        sku,
        name,
        category: document.getElementById('supply-category')?.value || 'other',
        manufacturer: document.getElementById('supply-manufacturer')?.value || null,
        model_family: document.getElementById('supply-model-family')?.value || null,
        quantity_on_hand: Number(document.getElementById('supply-quantity')?.value || 0),
        min_stock: Number(document.getElementById('supply-min-stock')?.value || 0),
        storage_location: document.getElementById('supply-location')?.value || null,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || 'Erro ao cadastrar insumo');
    }

    showNotification('Insumo cadastrado com sucesso', 'success');
    await loadInventoryPanel();
  } catch (error) {
    console.error('Erro ao cadastrar insumo:', error);
    showNotification(error.message || 'Erro ao cadastrar insumo', 'error');
  }
}

async function createPrinterEquipment() {
  try {
    const assetName = (document.getElementById('eq-name')?.value || '').trim();
    const serialNumber = (document.getElementById('eq-serial')?.value || '').trim();
    const connectionType = (document.getElementById('eq-connection')?.value || 'network').trim();
    if (!assetName || !serialNumber || !connectionType) {
      showNotification('Preencha Nome, Serial e Conexao para cadastrar equipamento', 'error');
      return;
    }

    const body = {
      asset_name: assetName,
      serial_number: serialNumber,
      manufacturer: (document.getElementById('eq-manufacturer')?.value || '').trim() || null,
      model: (document.getElementById('eq-model')?.value || '').trim() || null,
      connection_type: connectionType,
      ip_address: (document.getElementById('eq-ip')?.value || '').trim() || null,
      usb_path: (document.getElementById('eq-usb')?.value || '').trim() || null,
    };

    const response = await fetch('/api/printers/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || 'Erro ao cadastrar equipamento');
    }

    showNotification('Equipamento cadastrado com sucesso', 'success');
    await loadPrinters();
  } catch (error) {
    console.error('Erro ao cadastrar equipamento:', error);
    showNotification(error.message || 'Erro ao cadastrar equipamento', 'error');
  }
}

async function registerSupplyMovement(forcedType = null) {
  try {
    const supplyId = document.getElementById('supply-move-item')?.value;
    if (!supplyId) {
      showNotification('Selecione um insumo para movimentar', 'error');
      return;
    }

    const movementType = forcedType || 'in';
    if (!['in', 'out'].includes(movementType)) {
      showNotification('Tipo de movimentacao invalido. Use Entrada ou Saida.', 'error');
      return;
    }

    const quantity = Number(document.getElementById('supply-move-quantity')?.value || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      showNotification('Informe uma quantidade valida maior que zero', 'error');
      return;
    }

    const reason = (document.getElementById('supply-move-reason')?.value || '').trim();
    if (!reason) {
      showNotification('Informe o motivo da movimentacao', 'error');
      return;
    }

    const ticketNumber = (document.getElementById('supply-move-ticket')?.value || '').trim();
    if (movementType === 'out' && !ticketNumber) {
      showNotification('Informe o numero do chamado para dar baixa', 'error');
      return;
    }

    const notes = document.getElementById('supply-move-notes')?.value || '';

    const body = {
      movement_type: movementType,
      quantity,
      reason,
      reference: ticketNumber || null,
      notes,
    };

    const response = await fetch(`/api/printers/inventory/supplies/${supplyId}/movements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || 'Erro ao registrar movimentacao');
    }

    showNotification(
      movementType === 'in'
        ? 'Entrada de estoque registrada com sucesso'
        : 'Saida de estoque registrada com sucesso',
      'success'
    );
    await loadInventoryPanel();
  } catch (error) {
    console.error('Erro ao registrar movimentacao:', error);
    showNotification(error.message || 'Erro ao registrar movimentacao', 'error');
  }
}

function escapeCsv(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

function exportPrintersCsv() {
  const rows = applyFilters(allPrinters);
  if (!rows.length) {
    showNotification('Nenhuma impressora para exportar', 'info');
    return;
  }

  const headers = [
    'Nome',
    'Serial',
    'Fabricante',
    'Modelo',
    'Conexao',
    'IP_USB',
    'Unidade',
    'Setor',
    'Andar',
    'Status',
    'Toner',
    'Ultima_Verificacao',
  ];

  const lines = rows.map((printer) => {
    const displayName = printer.hostname || printer.custom_data?.hostname || printer.asset_name || '';
    const tonerLevels = printer.toner_levels || printer.custom_data?.toner_levels || {};
    const tonerDisplay = tonerLevels.black !== undefined ? `${tonerLevels.black}%` : 'N/A';
    const lastCheck = formatTime(new Date(printer.last_check_time || printer.updated_at));
    return [
      displayName,
      printer.serial_number || '',
      printer.manufacturer || '',
      printer.model || '',
      printer.connection_type || '',
      printer.ip_address || printer.custom_data?.connection_details?.uri || '',
      printer.unit || '',
      printer.sector || '',
      printer.floor || printer.location || '',
      printer.status || '',
      tonerDisplay,
      lastCheck,
    ].map(escapeCsv).join(',');
  });

  const csv = `${headers.join(',')}\n${lines.join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const a = document.createElement('a');
  a.href = url;
  a.download = `printers-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showNotification('CSV exportado com sucesso', 'success');
}
async function resetPrintersData() {
  const confirmed = window.confirm('Isso vai apagar TODO o cadastro de impressoras. Deseja continuar?');
  if (!confirmed) return;

  try {
    const response = await fetch('/api/printers/reset/all', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || 'Erro ao limpar cadastro de impressoras');
    }

    showNotification(`Cadastro limpo: ${payload.deleted_count || 0} registro(s) removido(s)`, 'success');
    await loadPrinters();
  } catch (error) {
    console.error('Erro ao limpar cadastro:', error);
    showNotification(error.message || 'Erro ao limpar cadastro', 'error');
  }
}

function normalizeDiscoveryPrinter(printer) {
  const baseName = printer.hostname || printer.custom_data?.hostname || printer.asset_name || (printer.ip_address ? `Printer ${printer.ip_address}` : 'Printer');
  const serial = printer.serial_number || (printer.ip_address ? `NET-${printer.ip_address}` : `DISC-${Date.now()}`);
  const connection = printer.connection_type || (printer.ip_address ? 'network' : 'usb');

  return {
    asset_name: baseName,
    serial_number: serial,
    manufacturer: printer.manufacturer || 'Unknown',
    model: printer.model || 'Unknown',
    connection_type: connection,
    ip_address: printer.ip_address || null,
    usb_path: printer.usb_path || null,
    hostname: printer.custom_data?.hostname || printer.hostname || null,
    mac_address: printer.custom_data?.mac_address || printer.mac_address || null,
    location: printer.location || 'Terreo',
    floor: printer.floor || printer.location || 'Terreo',
    unit: printer.unit || null,
    sector: printer.sector || 'Desconhecido',
    custom_data: {
      ...(printer.custom_data || {}),
      open_ports: printer.open_ports || printer.custom_data?.open_ports || [],
      print_mode: 'mono',
    },
  };
}

function closeDiscoveriesModal() {
  const modal = document.getElementById('modal-discovered-printers');
  if (modal) modal.style.display = 'none';
}

function renderDiscoveriesModal(printers) {
  const modal = document.getElementById('modal-discovered-printers');
  const tbody = document.getElementById('discovered-printers-tbody');
  if (!modal || !tbody) return;

  tbody.innerHTML = printers.map((printer, idx) => `
    <tr>
      <td><input type="checkbox" class="discover-select" data-index="${idx}" checked></td>
      <td>${printer.asset_name || '-'}</td>
      <td>${printer.manufacturer || 'Unknown'}</td>
      <td>${printer.model || 'Unknown'}</td>
      <td>${printer.connection_type === 'usb' ? 'USB' : 'Rede'}</td>
      <td>${printer.ip_address || printer.usb_path || '-'}</td>
      <td>${printer.unit || '-'}</td>
      <td>${printer.sector || '-'}</td>
      <td>${printer.floor || printer.location || '-'}</td>
      <td>${printer.serial_number || '-'}</td>
    </tr>
  `).join('');

  const countEl = document.getElementById('discoveries-count');
  if (countEl) countEl.textContent = `${printers.length} encontrada(s)`;

  const selectAll = document.getElementById('discoveries-select-all');
  if (selectAll) selectAll.checked = true;
  modal.style.display = 'flex';
}

function toggleSelectAllDiscoveries() {
  const selectAll = document.getElementById('discoveries-select-all');
  const checked = Boolean(selectAll?.checked);
  document.querySelectorAll('.discover-select').forEach((el) => {
    el.checked = checked;
  });
}

async function registerSelectedDiscoveries() {
  const selectedIndexes = Array.from(document.querySelectorAll('.discover-select:checked'))
    .map((input) => Number(input.getAttribute('data-index')))
    .filter((idx) => Number.isInteger(idx) && idx >= 0);

  if (!selectedIndexes.length) {
    showNotification('Selecione ao menos uma impressora descoberta', 'error');
    return;
  }

  const selected = selectedIndexes.map((idx) => normalizeDiscoveryPrinter(discoveredPrinters[idx]));

  try {
    const response = await fetch('/api/printers/register-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ printers: selected }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || 'Erro ao cadastrar impressoras descobertas');
    }

    showNotification(
      `Cadastro concluido: ${payload.success_count || selected.length} impressora(s) processada(s)`,
      'success'
    );
    closeDiscoveriesModal();
    await loadPrinters();
  } catch (error) {
    console.error('Erro ao cadastrar descobertas:', error);
    showNotification(error.message || 'Erro ao cadastrar descobertas', 'error');
  }
}

/**
 * Inicia descoberta de impressoras
 */
async function discoverPrinters() {
  try {
    const response = await fetch('/api/printers/discover', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ persist: false }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Erro ao iniciar descoberta');

    discoveredPrinters = Array.isArray(payload.discovered) ? payload.discovered : [];
    if (!discoveredPrinters.length) {
      showNotification('Nenhuma impressora encontrada na rede/USB', 'info');
      return;
    }

    renderDiscoveriesModal(discoveredPrinters);
    showNotification(`${discoveredPrinters.length} impressora(s) encontrada(s)`, 'success');
  } catch (error) {
    console.error('Erro na descoberta:', error);
    showNotification(error.message || 'Erro ao iniciar descoberta', 'error');
  }
}

/**
 * Configura event listeners
 */
function setupEventListeners() {
  const viewRoot = document.querySelector('#page-content .printers-dashboard');
  if (viewRoot && viewRoot.dataset.listenersBound === '1') {
    return;
  }
  if (viewRoot) {
    viewRoot.dataset.listenersBound = '1';
  }

  const bind = (id, event, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
    return el;
  };

  const tabDetailBackBtn = document.getElementById('tab-detail-btn-back');
  const tabDetailRefreshBtn = document.getElementById('tab-detail-btn-refresh');
  const tabDetailEditBtn = document.getElementById('tab-detail-btn-edit');
  if (tabDetailBackBtn) tabDetailBackBtn.addEventListener('click', () => switchPrintersSubtab('list'));
  if (tabDetailRefreshBtn) {
    tabDetailRefreshBtn.addEventListener('click', async () => {
      if (!currentPrinterId) return;
      await refreshPrinterStatus(currentPrinterId);
      await showPrinterDetails(currentPrinterId, { navigate: false });
    });
  }
  if (tabDetailEditBtn) {
    tabDetailEditBtn.addEventListener('click', () => {
      if (!currentPrinterId) return;
      openEditPrinter(currentPrinterId);
    });
  }

  const detailsBackBtn = document.getElementById('detail-btn-back');
  const detailsRefreshBtn = document.getElementById('detail-btn-refresh');
  const detailsEditBtnPage = document.getElementById('detail-btn-edit');
  if (detailsBackBtn) detailsBackBtn.addEventListener('click', () => {
    if (typeof App !== 'undefined' && typeof App.navigateTo === 'function') {
      App.navigateTo('printers-list');
    }
  });
  if (detailsRefreshBtn) {
    detailsRefreshBtn.addEventListener('click', async () => {
      if (!currentPrinterId) return;
      await refreshPrinterStatus(currentPrinterId);
      await showPrinterDetails(currentPrinterId, { navigate: false });
      await loadPrinters();
    });
  }
  if (detailsEditBtnPage) {
    detailsEditBtnPage.addEventListener('click', () => {
      if (!currentPrinterId) return;
      openEditPrinter(currentPrinterId);
    });
  }

  // Filtros
  bind('filter-status', 'change', () => {
    renderPrintersTable(allPrinters);
  });
  
  bind('filter-manufacturer', 'change', () => {
    renderPrintersTable(allPrinters);
  });
  
  bind('filter-connection', 'change', () => {
    renderPrintersTable(allPrinters);
  });
  
  bind('filter-search', 'input', () => {
    renderPrintersTable(allPrinters);
  });
  
  // Botões
  bind('btn-refresh-printers', 'click', loadPrinters);
  const exportBtn = document.getElementById('btn-export-printers');
  if (exportBtn) exportBtn.addEventListener('click', exportPrintersCsv);
  bind('btn-discover-printers', 'click', discoverPrinters);
  bind('btn-register-printer', 'click', openRegisterModal);
  const resetBtn = document.getElementById('btn-reset-printers');
  if (resetBtn) resetBtn.addEventListener('click', resetPrintersData);
  
  // Modal de detalhes
  bind('modal-close-details', 'click', () => {
    document.getElementById('modal-printer-details').style.display = 'none';
  });
  
  bind('modal-btn-close', 'click', () => {
    document.getElementById('modal-printer-details').style.display = 'none';
  });
  
  bind('modal-btn-refresh', 'click', async () => {
    await refreshPrinterStatus(currentPrinterId);
    document.getElementById('modal-printer-details').style.display = 'none';
  });

  const detailsEditBtn = document.getElementById('modal-btn-edit');
  if (detailsEditBtn) {
    detailsEditBtn.addEventListener('click', () => {
      document.getElementById('modal-printer-details').style.display = 'none';
      openEditPrinter(currentPrinterId);
    });
  }
  
  // Modal de registro
  bind('modal-close-register', 'click', closeRegisterModal);
  bind('modal-btn-cancel-register', 'click', closeRegisterModal);
  bind('modal-btn-save-register', 'click', registerPrinter);

  const discoveriesCloseBtn = document.getElementById('modal-close-discovered');
  const discoveriesCancelBtn = document.getElementById('modal-btn-cancel-discovered');
  const discoveriesRegisterBtn = document.getElementById('modal-btn-register-discovered');
  const discoveriesSelectAll = document.getElementById('discoveries-select-all');

  if (discoveriesCloseBtn) discoveriesCloseBtn.addEventListener('click', closeDiscoveriesModal);
  if (discoveriesCancelBtn) discoveriesCancelBtn.addEventListener('click', closeDiscoveriesModal);
  if (discoveriesRegisterBtn) discoveriesRegisterBtn.addEventListener('click', registerSelectedDiscoveries);
  if (discoveriesSelectAll) discoveriesSelectAll.addEventListener('change', toggleSelectAllDiscoveries);

  const invRefreshBtn = document.getElementById('btn-refresh-inventory');
  const supplyCreateBtn = document.getElementById('btn-supply-create');
  const supplyInStockBtn = document.getElementById('btn-supply-in-stock');
  const supplyOutBtn = document.getElementById('btn-supply-out');
  const quickSuppliesBtn = document.getElementById('btn-quick-supplies');
  const quickHistoryBtn = document.getElementById('btn-quick-history');
  const stockFilterCategory = document.getElementById('stock-filter-category');
  const stockFilterStatus = document.getElementById('stock-filter-status');
  const stockFilterSearch = document.getElementById('stock-filter-search');
  const equipmentCreateBtn = document.getElementById('btn-equipment-create');
  const alertFilterToner = document.getElementById('alert-filter-toner');
  const alertFilterImaging = document.getElementById('alert-filter-imaging');
  const mvFilterType = document.getElementById('mv-filter-type');
  const mvFilterSearch = document.getElementById('mv-filter-search');
  const refreshPrinterAlertsBtn = document.getElementById('btn-refresh-printer-alerts');
  const alertFilterType = document.getElementById('alert-filter-type');
  const alertFilterSearch = document.getElementById('alert-filter-search');

  if (invRefreshBtn) invRefreshBtn.addEventListener('click', loadInventoryPanel);
  if (supplyCreateBtn) supplyCreateBtn.addEventListener('click', createSupplyItem);
  if (supplyInStockBtn) supplyInStockBtn.addEventListener('click', registerSupplyStockIn);
  if (supplyOutBtn) supplyOutBtn.addEventListener('click', () => registerSupplyMovement('out'));
  if (quickSuppliesBtn) quickSuppliesBtn.addEventListener('click', () => {
    if (typeof App !== 'undefined' && typeof App.navigateTo === 'function') App.navigateTo('printers-supplies');
  });
  if (quickHistoryBtn) quickHistoryBtn.addEventListener('click', () => {
    if (typeof App !== 'undefined' && typeof App.navigateTo === 'function') App.navigateTo('printers-history');
  });
  if (stockFilterCategory) stockFilterCategory.addEventListener('change', renderSuppliesTable);
  if (stockFilterStatus) stockFilterStatus.addEventListener('change', renderSuppliesTable);
  if (stockFilterSearch) stockFilterSearch.addEventListener('input', renderSuppliesTable);
  if (equipmentCreateBtn) equipmentCreateBtn.addEventListener('click', createPrinterEquipment);
  if (alertFilterToner) alertFilterToner.addEventListener('change', renderPrinterAlertsTable);
  if (alertFilterImaging) alertFilterImaging.addEventListener('change', renderPrinterAlertsTable);
  if (mvFilterType) mvFilterType.addEventListener('change', renderSupplyMovementsTable);
  if (mvFilterSearch) mvFilterSearch.addEventListener('input', renderSupplyMovementsTable);
  if (refreshPrinterAlertsBtn) refreshPrinterAlertsBtn.addEventListener('click', loadPrinters);
  if (alertFilterType) alertFilterType.addEventListener('change', renderPrinterAlertsTable);
  if (alertFilterSearch) alertFilterSearch.addEventListener('input', renderPrinterAlertsTable);
  
  // Fecha modais ao clicar fora
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
}

/**
 * Formata tempo relativo
 */
function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d atrás`;
  if (hours > 0) return `${hours}h atrás`;
  if (minutes > 0) return `${minutes}m atrás`;
  return 'Agora';
}

/**
 * Obtém token de autenticação
 */
function getAuthToken() {
  if (window.API && typeof window.API.getToken === 'function') {
    return window.API.getToken() || '';
  }
  return (
    localStorage.getItem('mdm_token') ||
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('auth_token') ||
    ''
  );
}

/**
 * Mostra notificação
 */
function showNotification(message, type = 'info') {
  // Usa o sistema de notificações existente do painel
  if (window.showToast) {
    window.showToast(message, type);
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

// Inicializacao controlada pelo App.onPageLoad('printers') em app.js



