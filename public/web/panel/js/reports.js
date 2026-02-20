// MDM Dashboard — Reports Page

(() => {
  let reportData = {};

  function loadReports() {
    fetchAllData();
  }

  async function fetchAllData() {
    const grid = document.getElementById('report-summary-grid');
    const breakdownArea = document.getElementById('report-breakdown');
    if (grid) grid.innerHTML = '<div class="empty-state"><p>Carregando...</p></div>';

    try {
      const [
        serverData,
        devicesData,
        modulesData,
        unitsData,
        bssidData,
        usersData,
        totemsData,
        tokensData,
      ] = await Promise.allSettled([
        API.get('/server/status'),
        API.get('/devices'),
        API.get('/modules'),
        API.get('/units'),
        API.get('/bssid-mappings'),
        API.get('/auth/users'),
        API.get('/totems/totems'),
        API.get('/provisioning/tokens'),
      ]);

      const server = serverData.status === 'fulfilled' ? serverData.value : {};
      const devices = devicesData.status === 'fulfilled'
        ? (Array.isArray(devicesData.value) ? devicesData.value : devicesData.value.devices || [])
        : [];
      const modules = modulesData.status === 'fulfilled' ? (modulesData.value.modules || []) : [];
      const units = unitsData.status === 'fulfilled' ? (unitsData.value.units || (Array.isArray(unitsData.value) ? unitsData.value : [])) : [];
      const bssids = bssidData.status === 'fulfilled' ? (Array.isArray(bssidData.value) ? bssidData.value : []) : [];
      const users = usersData.status === 'fulfilled' ? (Array.isArray(usersData.value) ? usersData.value : usersData.value.users || []) : [];
      const totems = totemsData.status === 'fulfilled' ? (Array.isArray(totemsData.value) ? totemsData.value : totemsData.value.totems || []) : [];
      const tokens = tokensData.status === 'fulfilled' ? (Array.isArray(tokensData.value) ? tokensData.value : tokensData.value.tokens || []) : [];

      reportData = { server, devices, modules, units, bssids, users, totems, tokens };

      renderSummary(grid);
      renderBreakdown(breakdownArea);
    } catch (err) {
      if (grid) grid.innerHTML = '<div class="empty-state"><p>Erro ao gerar relatório.</p></div>';
      console.error('Erro:', err);
    }
  }

  function renderSummary(grid) {
    if (!grid) return;
    const { devices, modules, units, bssids, users, totems, tokens } = reportData;

    const activeTokens = tokens.filter(t => !t.used && new Date(t.expiresAt) > new Date());

    const cards = [
      { label: 'Dispositivos', value: devices.length, icon: '📱', cls: 'orange' },
      { label: 'Módulos', value: modules.length, icon: '📦', cls: 'blue' },
      { label: 'Unidades', value: units.length, icon: '🏢', cls: 'green' },
      { label: 'BSSIDs Mapeados', value: bssids.length, icon: '📡', cls: 'yellow' },
      { label: 'Usuários', value: users.length, icon: '👤', cls: '' },
      { label: 'Totems', value: totems.length, icon: '🖥️', cls: 'orange' },
      { label: 'Tokens Ativos', value: activeTokens.length, icon: '🔑', cls: 'green' },
      { label: 'Total Ativos (Módulos)', value: modules.reduce((s, m) => s + (m.asset_count || 0), 0), icon: '📊', cls: 'blue' },
    ];

    grid.innerHTML = cards.map(c => `
      <div class="metric-card ${c.cls}">
        <div class="metric-header">
          <span class="metric-label">${c.label}</span>
          <span class="metric-icon">${c.icon}</span>
        </div>
        <div class="metric-value">${c.value}</div>
      </div>
    `).join('');
  }

  function renderBreakdown(area) {
    if (!area) return;
    const { devices, modules, totems, tokens } = reportData;

    // Device status breakdown
    const statusCount = {};
    devices.forEach(d => {
      const s = d.provisioning_status || d.status || 'unknown';
      statusCount[s] = (statusCount[s] || 0) + 1;
    });

    // Module type breakdown
    const typeCount = {};
    modules.forEach(m => {
      typeCount[m.type] = (typeCount[m.type] || 0) + 1;
    });

    // Totem printer status breakdown
    const totemStatusCount = {};
    totems.forEach(t => {
      const s = t.printerStatus || t.status || 'unknown';
      totemStatusCount[s] = (totemStatusCount[s] || 0) + 1;
    });

    // Token status breakdown
    const now = new Date();
    const tokenStatusCount = { active: 0, expired: 0, used: 0 };
    tokens.forEach(t => {
      if (t.used || (t.usedCount >= t.maxUses)) tokenStatusCount.used++;
      else if (new Date(t.expiresAt) < now) tokenStatusCount.expired++;
      else tokenStatusCount.active++;
    });

    area.innerHTML = `
      <div class="report-section">
        <h3>Dispositivos por Status</h3>
        <div class="breakdown-list">
          ${Object.entries(statusCount).map(([status, count]) => `
            <div class="breakdown-item">
              <span>${statusBadge(status)}</span>
              <span class="breakdown-bar-wrapper">
                <span class="breakdown-bar" style="width: ${(count / Math.max(devices.length, 1)) * 100}%"></span>
              </span>
              <span class="breakdown-count">${count}</span>
            </div>
          `).join('')}
          ${Object.keys(statusCount).length === 0 ? '<p style="color: var(--text-muted);">Sem dados</p>' : ''}
        </div>
      </div>

      <div class="report-section">
        <h3>Módulos por Tipo</h3>
        <div class="breakdown-list">
          ${Object.entries(typeCount).map(([type, count]) => `
            <div class="breakdown-item">
              <span class="type-chip">${esc(type)}</span>
              <span class="breakdown-bar-wrapper">
                <span class="breakdown-bar" style="width: ${(count / Math.max(modules.length, 1)) * 100}%"></span>
              </span>
              <span class="breakdown-count">${count}</span>
            </div>
          `).join('')}
          ${Object.keys(typeCount).length === 0 ? '<p style="color: var(--text-muted);">Sem dados</p>' : ''}
        </div>
      </div>

      <div class="report-section">
        <h3>🖥️ Totems por Status de Impressora</h3>
        <div class="breakdown-list">
          ${Object.entries(totemStatusCount).map(([status, count]) => `
            <div class="breakdown-item">
              <span>${statusBadge(status)}</span>
              <span class="breakdown-bar-wrapper">
                <span class="breakdown-bar" style="width: ${(count / Math.max(totems.length, 1)) * 100}%"></span>
              </span>
              <span class="breakdown-count">${count}</span>
            </div>
          `).join('')}
          ${Object.keys(totemStatusCount).length === 0 ? '<p style="color: var(--text-muted);">Sem dados de totems</p>' : ''}
        </div>
      </div>

      <div class="report-section">
        <h3>🔑 Tokens de Provisionamento</h3>
        <div class="breakdown-list">
          ${Object.entries(tokenStatusCount).filter(([, c]) => c > 0).map(([status, count]) => `
            <div class="breakdown-item">
              <span>${statusBadge(status)}</span>
              <span class="breakdown-bar-wrapper">
                <span class="breakdown-bar" style="width: ${(count / Math.max(tokens.length, 1)) * 100}%"></span>
              </span>
              <span class="breakdown-count">${count}</span>
            </div>
          `).join('')}
          ${tokens.length === 0 ? '<p style="color: var(--text-muted);">Sem tokens</p>' : ''}
        </div>
      </div>
    `;
  }

  // ===== CSV EXPORT =====
  function exportCSV() {
    const { devices } = reportData;
    if (!devices || devices.length === 0) {
      showToast('Sem dados para exportar.', 'warning');
      return;
    }

    const headers = ['Nome', 'Serial', 'Modelo', 'Status', 'Setor', 'IP', 'Última Conexão'];
    const rows = devices.map(d => [
      d.device_name || d.name || '',
      d.serial_number || d.serialNumber || '',
      d.model || '',
      d.provisioning_status || d.status || '',
      d.sector || d.location || '',
      d.ip_address || d.ip || '',
      d.last_seen || d.updatedAt || '',
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_dispositivos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exportado com sucesso!', 'success');
  }

  // Setup export button
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('export-csv-btn');
    if (btn) btn.addEventListener('click', exportCSV);
  });

  App.onPageLoad('reports', loadReports);
})();
