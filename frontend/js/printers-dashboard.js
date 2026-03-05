// Printers Dashboard JavaScript

let allPrinters = [];
let chartsInstances = {};
let currentPrinterId = null;

/**
 * Inicializa o dashboard de impressoras
 */
async function initPrintersDashboard() {
  console.log('Inicializando dashboard de impressoras...');
  
  // Carrega impressoras
  await loadPrinters();
  
  // Configura event listeners
  setupEventListeners();
  
  // Atualiza a cada 30 segundos
  setInterval(loadPrinters, 30000);
}

/**
 * Carrega lista de impressoras do servidor
 */
async function loadPrinters() {
  try {
    const response = await fetch('/api/printers', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    
    if (!response.ok) throw new Error('Erro ao carregar impressoras');
    
    const data = await response.json();
    allPrinters = data.printers || [];
    
    // Atualiza UI
    updateSummary(data.summary);
    renderPrintersTable(allPrinters);
    renderCharts();
    
  } catch (error) {
    console.error('Erro ao carregar impressoras:', error);
    showNotification('Erro ao carregar impressoras', 'error');
  }
}

/**
 * Atualiza cards de resumo
 */
function updateSummary(summary) {
  document.getElementById('total-printers').textContent = summary.total;
  document.getElementById('online-printers').textContent = summary.online;
  document.getElementById('offline-printers').textContent = summary.offline;
  document.getElementById('maintenance-printers').textContent = summary.maintenance;
}

/**
 * Renderiza tabela de impressoras
 */
function renderPrintersTable(printers) {
  const tbody = document.getElementById('printers-tbody');
  const emptyState = document.getElementById('printers-empty-state');
  
  if (printers.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  // Aplica filtros
  const filtered = applyFilters(printers);
  
  tbody.innerHTML = filtered.map(printer => {
    const tonerLevels = printer.custom_data?.toner_levels || {};
    const tonerDisplay = Object.keys(tonerLevels).length > 0 
      ? `${tonerLevels.black || tonerLevels.color || 0}%`
      : 'N/A';
    
    const lastCheck = new Date(printer.last_check_time || printer.updated_at);
    const lastCheckFormatted = formatTime(lastCheck);
    
    return `
      <tr>
        <td><strong>${printer.asset_name}</strong></td>
        <td>${printer.manufacturer || 'N/A'}</td>
        <td>${printer.model || 'N/A'}</td>
        <td>${printer.connection_type === 'network' ? '🌐 Rede' : '🔌 USB'}</td>
        <td>${printer.ip_address || printer.custom_data?.connection_details?.uri || 'N/A'}</td>
        <td><span class="status-badge ${printer.status}">${printer.status.toUpperCase()}</span></td>
        <td>
          <div class="toner-bar">
            <div class="toner-progress">
              <div class="toner-fill" style="width: ${tonerLevels.black || 0}%"></div>
            </div>
            <span>${tonerDisplay}</span>
          </div>
        </td>
        <td><small>${lastCheckFormatted}</small></td>
        <td>
          <div class="table-actions">
            <button class="action-btn action-btn-view" onclick="showPrinterDetails('${printer._id}')">👁️</button>
            <button class="action-btn action-btn-refresh" onclick="refreshPrinterStatus('${printer._id}')">🔄</button>
            <button class="action-btn action-btn-delete" onclick="confirmDeletePrinter('${printer._id}', '${printer.asset_name}')">🗑️</button>
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
  const statusFilter = document.getElementById('filter-status').value;
  const manufacturerFilter = document.getElementById('filter-manufacturer').value;
  const connectionFilter = document.getElementById('filter-connection').value;
  const searchFilter = document.getElementById('filter-search').value.toLowerCase();
  
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
        printer.serial_number
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

/**
 * Gráfico de status
 */
function renderStatusChart() {
  const ctx = document.getElementById('chart-status');
  if (!ctx) return;
  
  const summary = {
    online: allPrinters.filter(p => p.status === 'online').length,
    offline: allPrinters.filter(p => p.status === 'offline').length,
    maintenance: allPrinters.filter(p => p.status === 'maintenance').length,
  };
  
  if (chartsInstances.status) chartsInstances.status.destroy();
  
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
  const ctx = document.getElementById('chart-manufacturer');
  if (!ctx) return;
  
  const manufacturers = {};
  allPrinters.forEach(p => {
    const mfg = p.manufacturer || 'Unknown';
    manufacturers[mfg] = (manufacturers[mfg] || 0) + 1;
  });
  
  if (chartsInstances.manufacturer) chartsInstances.manufacturer.destroy();
  
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
  const ctx = document.getElementById('chart-connection');
  if (!ctx) return;
  
  const network = allPrinters.filter(p => p.connection_type === 'network').length;
  const usb = allPrinters.filter(p => p.connection_type === 'usb').length;
  
  if (chartsInstances.connection) chartsInstances.connection.destroy();
  
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
  const ctx = document.getElementById('chart-toner');
  if (!ctx) return;
  
  const colors = ['black', 'cyan', 'magenta', 'yellow'];
  const averages = {};
  
  colors.forEach(color => {
    const levels = allPrinters
      .map(p => p.custom_data?.toner_levels?.[color])
      .filter(l => l !== undefined);
    
    if (levels.length > 0) {
      averages[color] = Math.round(levels.reduce((a, b) => a + b) / levels.length);
    }
  });
  
  if (Object.keys(averages).length === 0) {
    // Sem dados de toner
    return;
  }
  
  if (chartsInstances.toner) chartsInstances.toner.destroy();
  
  chartsInstances.toner = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(averages).map(c => c.charAt(0).toUpperCase() + c.slice(1)),
      datasets: [{
        label: 'Nível Médio (%)',
        data: Object.values(averages),
        backgroundColor: ['#2c3e50', '#3498db', '#e91e63', '#f39c12'],
        borderColor: ['#1a252f', '#2980b9', '#c2185b', '#d68910'],
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
async function showPrinterDetails(printerId) {
  try {
    const response = await fetch(`/api/printers/${printerId}`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    
    if (!response.ok) throw new Error('Erro ao carregar detalhes');
    
    const { printer } = await response.json();
    currentPrinterId = printerId;
    
    // Preenche modal
    document.getElementById('modal-printer-name').textContent = printer.asset_name;
    document.getElementById('detail-name').textContent = printer.asset_name;
    document.getElementById('detail-manufacturer').textContent = printer.manufacturer || 'N/A';
    document.getElementById('detail-model').textContent = printer.model || 'N/A';
    document.getElementById('detail-serial').textContent = printer.serial_number || 'N/A';
    document.getElementById('detail-connection').textContent = printer.connection_type === 'network' ? 'Rede (IP)' : 'USB';
    document.getElementById('detail-address').textContent = printer.ip_address || 'N/A';
    document.getElementById('detail-status').textContent = printer.status.toUpperCase();
    document.getElementById('detail-status').className = `status-badge ${printer.status}`;
    document.getElementById('detail-last-check').textContent = formatTime(new Date(printer.last_check_time || printer.updated_at));
    
    // Renderiza níveis de toner
    const tonerContainer = document.getElementById('toner-levels-container');
    const tonerLevels = printer.custom_data?.toner_levels || {};
    
    if (Object.keys(tonerLevels).length === 0) {
      tonerContainer.innerHTML = '<p style="color: #7f8c8d;">Dados de toner não disponíveis</p>';
    } else {
      tonerContainer.innerHTML = Object.entries(tonerLevels).map(([color, level]) => `
        <div class="toner-level-item">
          <div class="toner-level-label">${color.charAt(0).toUpperCase() + color.slice(1)}</div>
          <div class="toner-level-bar">
            <div class="toner-level-fill" style="width: ${level}%"></div>
          </div>
          <div class="toner-level-value">${level}%</div>
        </div>
      `).join('');
    }
    
    // Mostra modal
    document.getElementById('modal-printer-details').style.display = 'flex';
    
  } catch (error) {
    console.error('Erro ao carregar detalhes:', error);
    showNotification('Erro ao carregar detalhes da impressora', 'error');
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
  document.getElementById('modal-register-printer').style.display = 'flex';
}

/**
 * Fecha modal de registro
 */
function closeRegisterModal() {
  document.getElementById('modal-register-printer').style.display = 'none';
  document.getElementById('form-register-printer').reset();
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
  };
  
  try {
    const response = await fetch('/api/printers/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) throw new Error('Erro ao registrar impressora');
    
    showNotification('Impressora registrada com sucesso', 'success');
    closeRegisterModal();
    await loadPrinters();
    
  } catch (error) {
    console.error('Erro ao registrar:', error);
    showNotification('Erro ao registrar impressora', 'error');
  }
}

/**
 * Confirma exclusão de impressora
 */
function confirmDeletePrinter(printerId, printerName) {
  currentPrinterId = printerId;
  document.getElementById('confirm-printer-name').textContent = printerName;
  document.getElementById('modal-confirm-delete').style.display = 'flex';
}

/**
 * Deleta impressora
 */
async function deletePrinter() {
  try {
    const response = await fetch(`/api/printers/${currentPrinterId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    
    if (!response.ok) throw new Error('Erro ao deletar impressora');
    
    showNotification('Impressora deletada com sucesso', 'success');
    document.getElementById('modal-confirm-delete').style.display = 'none';
    await loadPrinters();
    
  } catch (error) {
    console.error('Erro ao deletar:', error);
    showNotification('Erro ao deletar impressora', 'error');
  }
}

/**
 * Inicia descoberta de impressoras
 */
async function discoverPrinters() {
  try {
    const response = await fetch('/api/printers/discover', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    
    if (!response.ok) throw new Error('Erro ao iniciar descoberta');
    
    showNotification('Descoberta iniciada. Verifique em alguns momentos...', 'success');
    
    // Recarrega após 5 segundos
    setTimeout(loadPrinters, 5000);
    
  } catch (error) {
    console.error('Erro na descoberta:', error);
    showNotification('Erro ao iniciar descoberta', 'error');
  }
}

/**
 * Configura event listeners
 */
function setupEventListeners() {
  // Filtros
  document.getElementById('filter-status').addEventListener('change', () => {
    renderPrintersTable(allPrinters);
  });
  
  document.getElementById('filter-manufacturer').addEventListener('change', () => {
    renderPrintersTable(allPrinters);
  });
  
  document.getElementById('filter-connection').addEventListener('change', () => {
    renderPrintersTable(allPrinters);
  });
  
  document.getElementById('filter-search').addEventListener('input', () => {
    renderPrintersTable(allPrinters);
  });
  
  // Botões
  document.getElementById('btn-refresh-printers').addEventListener('click', loadPrinters);
  document.getElementById('btn-discover-printers').addEventListener('click', discoverPrinters);
  document.getElementById('btn-register-printer').addEventListener('click', openRegisterModal);
  
  // Modal de detalhes
  document.getElementById('modal-close-details').addEventListener('click', () => {
    document.getElementById('modal-printer-details').style.display = 'none';
  });
  
  document.getElementById('modal-btn-close').addEventListener('click', () => {
    document.getElementById('modal-printer-details').style.display = 'none';
  });
  
  document.getElementById('modal-btn-refresh').addEventListener('click', async () => {
    await refreshPrinterStatus(currentPrinterId);
    document.getElementById('modal-printer-details').style.display = 'none';
  });
  
  document.getElementById('modal-btn-delete').addEventListener('click', () => {
    const name = document.getElementById('detail-name').textContent;
    confirmDeletePrinter(currentPrinterId, name);
    document.getElementById('modal-printer-details').style.display = 'none';
  });
  
  // Modal de registro
  document.getElementById('modal-close-register').addEventListener('click', closeRegisterModal);
  document.getElementById('modal-btn-cancel-register').addEventListener('click', closeRegisterModal);
  document.getElementById('modal-btn-save-register').addEventListener('click', registerPrinter);
  
  // Modal de confirmação
  document.getElementById('modal-btn-cancel-delete').addEventListener('click', () => {
    document.getElementById('modal-confirm-delete').style.display = 'none';
  });
  
  document.getElementById('modal-btn-confirm-delete').addEventListener('click', deletePrinter);
  
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
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
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

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPrintersDashboard);
} else {
  initPrintersDashboard();
}
