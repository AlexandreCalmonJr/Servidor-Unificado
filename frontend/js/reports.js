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
                assetsData,       // GET /api/monitoring/assets — todos os ativos
                modulesData,
                unitsData,
                bssidData,
                usersData,
                totemsData,       // GET /api/monitoring/assets?type=totem
                tokensData,
            ] = await Promise.allSettled([
                API.get('/server/status'),
                API.get('/monitoring/assets'),
                API.get('/modules'),
                API.get('/units'),
                API.get('/bssid-mappings'),
                API.get('/auth/users'),
                API.get('/monitoring/assets?type=totem'),
                API.get('/provisioning/tokens'),
            ]);

            const server = serverData.status === 'fulfilled' ? serverData.value : {};
            const assets = assetsData.status === 'fulfilled'
                ? (Array.isArray(assetsData.value) ? assetsData.value : (assetsData.value.assets || []))
                : [];
            const modules = modulesData.status === 'fulfilled' ? (modulesData.value.modules || []) : [];
            const units = unitsData.status === 'fulfilled'
                ? (unitsData.value.units || (Array.isArray(unitsData.value) ? unitsData.value : []))
                : [];
            const bssids = bssidData.status === 'fulfilled'
                ? (Array.isArray(bssidData.value) ? bssidData.value : [])
                : [];
            const users = usersData.status === 'fulfilled'
                ? (Array.isArray(usersData.value) ? usersData.value : (usersData.value.users || []))
                : [];
            const totems = totemsData.status === 'fulfilled'
                ? (Array.isArray(totemsData.value) ? totemsData.value : (totemsData.value.assets || []))
                : [];
            const tokens = tokensData.status === 'fulfilled'
                ? (Array.isArray(tokensData.value) ? tokensData.value : (tokensData.value.tokens || []))
                : [];

            // Mobile devices only
            const mobileAssets = assets.filter(a => a.asset_type === 'mobile');

            reportData = { server, assets, mobileAssets, modules, units, bssids, users, totems, tokens };

            renderSummary(grid);
            renderBreakdown(breakdownArea);
        } catch (err) {
            if (grid) grid.innerHTML = '<div class="empty-state"><p>Erro ao gerar relatório.</p></div>';
            console.error('Erro:', err);
        }
    }

    function renderSummary(grid) {
        if (!grid) return;
        const { assets, mobileAssets, modules, units, bssids, users, totems, tokens } = reportData;

        const now = new Date();
        const activeTokens = tokens.filter(t => t.is_active && new Date(t.expires_at) > now);

        const cards = [
            { label: 'Total de Ativos', value: assets.length, icon: '📦', cls: 'orange' },
            { label: 'Dispositivos Móveis', value: mobileAssets.length, icon: '📱', cls: 'blue' },
            { label: 'Totems', value: totems.length, icon: '🖥️', cls: 'orange' },
            { label: 'Módulos', value: modules.length, icon: '📦', cls: 'blue' },
            { label: 'Unidades', value: units.length, icon: '🏢', cls: 'green' },
            { label: 'BSSIDs Mapeados', value: bssids.length, icon: '📡', cls: 'yellow' },
            { label: 'Usuários', value: users.length, icon: '👤', cls: '' },
            { label: 'Tokens Ativos', value: activeTokens.length, icon: '🔑', cls: 'green' },
        ];

        grid.innerHTML = cards.map(c => `
            <div class="metric-card ${c.cls}">
                <div class="metric-header">
                    <span class="metric-label">${c.label}</span>
                    <span class="metric-icon">${c.icon}</span>
                </div>
                <div class="metric-value">${c.value}</div>
            </div>`).join('');
    }

    function renderBreakdown(area) {
        if (!area) return;
        const { assets, modules, totems, tokens } = reportData;

        // All assets — status breakdown
        const statusCount = {};
        assets.forEach(a => {
            const s = a.status || 'unknown';
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
            const cd = t.custom_data || {};
            const s = cd.printer_status || t.printer_status || t.status || 'unknown';
            totemStatusCount[s] = (totemStatusCount[s] || 0) + 1;
        });

        // Token status breakdown
        const now = new Date();
        const tokenStatusCount = { active: 0, expired: 0, used: 0 };
        tokens.forEach(t => {
            if (t.used_count >= t.max_uses) tokenStatusCount.used++;
            else if (new Date(t.expires_at) < now) tokenStatusCount.expired++;
            else tokenStatusCount.active++;
        });

        area.innerHTML = `
            <div class="report-section">
                <h3>Ativos por Status</h3>
                <div class="breakdown-list">
                    ${Object.entries(statusCount).map(([st, count]) => `
                        <div class="breakdown-item">
                            <span>${statusBadge(st)}</span>
                            <span class="breakdown-bar-wrapper">
                                <span class="breakdown-bar" style="width:${(count / Math.max(assets.length, 1)) * 100}%"></span>
                            </span>
                            <span class="breakdown-count">${count}</span>
                        </div>`).join('')}
                    ${!Object.keys(statusCount).length ? '<p style="color:var(--text-muted);">Sem dados</p>' : ''}
                </div>
            </div>

            <div class="report-section">
                <h3>Módulos por Tipo</h3>
                <div class="breakdown-list">
                    ${Object.entries(typeCount).map(([type, count]) => `
                        <div class="breakdown-item">
                            <span class="type-chip">${esc(type)}</span>
                            <span class="breakdown-bar-wrapper">
                                <span class="breakdown-bar" style="width:${(count / Math.max(modules.length, 1)) * 100}%"></span>
                            </span>
                            <span class="breakdown-count">${count}</span>
                        </div>`).join('')}
                    ${!Object.keys(typeCount).length ? '<p style="color:var(--text-muted);">Sem dados</p>' : ''}
                </div>
            </div>

            <div class="report-section">
                <h3>🖥️ Totems por Status de Impressora</h3>
                <div class="breakdown-list">
                    ${Object.entries(totemStatusCount).map(([st, count]) => `
                        <div class="breakdown-item">
                            <span>${statusBadge(st)}</span>
                            <span class="breakdown-bar-wrapper">
                                <span class="breakdown-bar" style="width:${(count / Math.max(totems.length, 1)) * 100}%"></span>
                            </span>
                            <span class="breakdown-count">${count}</span>
                        </div>`).join('')}
                    ${!totems.length ? '<p style="color:var(--text-muted);">Sem dados de totems</p>' : ''}
                </div>
            </div>

            <div class="report-section">
                <h3>🔑 Tokens de Provisionamento</h3>
                <div class="breakdown-list">
                    ${Object.entries(tokenStatusCount).filter(([, c]) => c > 0).map(([st, count]) => `
                        <div class="breakdown-item">
                            <span>${statusBadge(st)}</span>
                            <span class="breakdown-bar-wrapper">
                                <span class="breakdown-bar" style="width:${(count / Math.max(tokens.length, 1)) * 100}%"></span>
                            </span>
                            <span class="breakdown-count">${count}</span>
                        </div>`).join('')}
                    ${!tokens.length ? '<p style="color:var(--text-muted);">Sem tokens</p>' : ''}
                </div>
            </div>
        `;
    }

    // ===== CSV EXPORT =====
    function exportCSV() {
        const { assets } = reportData;
        if (!assets || assets.length === 0) {
            showToast('Sem dados para exportar.', 'warning');
            return;
        }

        const headers = ['Nome', 'Serial', 'Tipo', 'Status', 'Setor', 'IP', 'Última Conexão'];
        const rows = assets.map(a => [
            a.asset_name || a.name || '',
            a.serial_number || '',
            a.asset_type || '',
            a.status || '',
            a.sector || a.location || '',
            a.ip_address || '',
            a.last_seen || a.updatedAt || '',
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_ativos_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('CSV exportado!', 'success');
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('export-csv-btn')?.addEventListener('click', exportCSV);
    });

    App.onPageLoad('reports', loadReports);
})();
