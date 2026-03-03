// MDM Dashboard — Dynamic Module Assets Page
// Handles dedicated per-module asset pages with full CRUD

(() => {
    let currentModuleId = null;
    let currentModuleType = null;
    let currentModuleName = null;
    let allAssets = [];

    function loadDynamicModule(moduleId) {
        if (!moduleId) {
            console.error('❌ moduleId não fornecido!');
            return;
        }
        currentModuleId = moduleId;
        console.log(`🔄 loadDynamicModule chamado para: ${moduleId}`);

        fetchModuleDetail(moduleId);
        setupDynamicModal();
        setupDynamicSearch();
    }

    async function fetchModuleDetail(moduleId) {
        const title = document.getElementById('dynamic-module-title');
        const tbody = document.getElementById('dynamic-table-body');
        if (!tbody) {
            console.error('❌ dynamic-table-body não encontrado!');
            return;
        }

        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><p>⏳ Carregando...</p></td></tr>';
        console.log(`📡 Buscando detalhes do módulo: ${moduleId}`);

        try {
            const mod = await API.get(`/modules/${moduleId}`);
            currentModuleType = mod.type || 'custom';
            currentModuleName = mod.name || 'Módulo';

            console.log(`✅ Módulo carregado: ${currentModuleName} (${currentModuleType})`);

            if (title) {
                title.textContent = `${currentModuleName}`;
                console.log(`✅ dynamic-module-title atualizado: "${currentModuleName}"`);
            } else {
                console.warn('⚠️ dynamic-module-title não encontrado');
            }

            const pageTitle = document.getElementById('page-title');
            if (pageTitle) {
                pageTitle.textContent = `📦 ${currentModuleName} (${currentModuleType})`;
                console.log(`✅ page-title atualizado: "${currentModuleName}"`);
            } else {
                console.error('❌ page-title não encontrado!');
            }

            await fetchAssets(moduleId);
        } catch (err) {
            console.error(`❌ Erro ao buscar módulo: ${err.message}`);
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><p style="color:var(--danger);">❌ Erro: ${esc(err.message)}</p></td></tr>`;
        }
    }

    let paginator = null;

    async function fetchAssets(moduleId) {
        const tbody = document.getElementById('dynamic-table-body');
        if (!tbody) {
            console.error('❌ dynamic-table-body não encontrado!');
            return;
        }

        console.log(`📡 Buscando ativos do módulo: ${moduleId}`);

        try {
            const data = await API.get(`/modules/${moduleId}/assets`);
            allAssets = data.assets || [];

            console.log(`✅ ${allAssets.length} ativo(s) carregado(s)`);

            initPaginator(allAssets);
            renderModuleStats(allAssets);
        } catch (err) {
            console.error(`❌ Erro ao buscar ativos: ${err.message}`);
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><p style="color:var(--danger);">❌ Erro: ${esc(err.message)}</p></td></tr>`;
        }
    }

    function initPaginator(items) {
        paginator = Paginator(items, {
            perPage: 15,
            onPageChange: (pageItems) => renderAssets(pageItems)
        });
        renderAssets(paginator.getPage());
        paginator.renderControls('dynamic-pagination');
    }

    function renderAssets(assets) {
        const tbody = document.getElementById('dynamic-table-body');
        if (!tbody) return;

        renderTableHeaders(currentModuleType);

        if (assets.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><div class="empty-icon">📦</div><p>Nenhum ativo neste módulo.</p></td></tr>`;
            return;
        }

        tbody.innerHTML = assets.map(a => renderAssetRow(a, currentModuleType)).join('');
    }

    // ===== DYNAMIC COLUMNS =====
    function renderTableHeaders(type) {
        const thead = document.getElementById('dynamic-table-head');
        if (!thead) return;

        let html = '';
        if (['desktop', 'notebook', 'panel'].includes(type)) {
            html = `<tr>
                <th>Nome (Hostname)</th>
                <th>IP</th>
                <th>Localização</th>
                <th>Status</th>
                <th>Última Conexão</th>
                <th>Ações</th>
            </tr>`;
        } else if (type === 'totem') {
            html = `<tr>
                <th>Nome (Hostname)</th>
                <th>IP</th>
                <th>Localização</th>
                <th>Status</th>
                <th>Impressoras</th>
                <th>Última Conexão</th>
                <th>Ações</th>
            </tr>`;
        } else if (type === 'mobile') {
            html = `<tr>
                <th>Nome</th>
                <th>Serial</th>
                <th>IMEI</th>
                <th>Localidade</th>
                <th>Setor / Andar</th>
                <th>Status</th>
                <th>Última Conexão</th>
                <th>Ações</th>
            </tr>`;
        } else if (type === 'printer') {
            html = `<tr>
                <th>Nome</th>
                <th>Status</th>
                <th>Nível Toner</th>
                <th>Localidade</th>
                <th>Setor / Andar</th>
                <th>Última Conexão</th>
                <th>Ações</th>
            </tr>`;
        } else {
            // Default
            html = `<tr>
                <th>Nome</th>
                <th>Serial/ID</th>
                <th>IP</th>
                <th>Localização</th>
                <th>Status</th>
                <th>Última Conexão</th>
                <th>Ações</th>
            </tr>`;
        }
        thead.innerHTML = html;
    }

    function renderAssetRow(a, type) {
        const actionsHtml = `
            <td>
                <button class="btn btn-ghost btn-sm" onclick="DynamicAssetManager.view('${a._id || a.id}')" title="Ver Detalhes">👁️</button>
                <button class="btn btn-ghost btn-sm" onclick="DynamicAssetManager.edit('${a._id || a.id}')" title="Editar">✏️</button>
                <button class="btn btn-ghost btn-sm" onclick="DynamicAssetManager.sendCommand('${a._id || a.id}', '${esc(a.asset_name || '')}')" title="Comando">⚡</button>
                <button class="btn btn-danger btn-sm" onclick="DynamicAssetManager.remove('${a._id || a.id}', '${esc(a.asset_name || '')}')" title="Excluir">🗑</button>
            </td>
        `;

        const lastConnHtml = `<td title="${new Date(a.last_seen || a.updatedAt).toLocaleString('pt-BR')}">${TimeFormatter.formatTimeAgo(a.last_seen || a.updatedAt)}</td>`;
        const statusHtml = `<td>${statusBadgeWithIcon(a.status)}</td>`;

        if (['desktop', 'notebook', 'panel'].includes(type)) {
            const loc = type === 'notebook' && a.custom_data?.bssid ? `BSSID: ${a.custom_data.bssid}` : (a.location || 'N/A');
            return `<tr>
                <td>${esc(a.hostname || a.asset_name || 'N/A')}</td>
                <td class="mono">${esc(a.ip_address || 'N/A')}</td>
                <td>${esc(loc)}</td>
                ${statusHtml}
                ${lastConnHtml}
                ${actionsHtml}
            </tr>`;
        } else if (type === 'totem') {
            return `<tr>
                <td>${esc(a.hostname || a.asset_name || 'N/A')}</td>
                <td class="mono">${esc(a.ip_address || 'N/A')}</td>
                <td>${esc(a.location || 'N/A')}</td>
                ${statusHtml}
                <td>${esc(a.custom_data?.printers ? a.custom_data.printers.join(', ') : 'N/A')}</td>
                ${lastConnHtml}
                ${actionsHtml}
            </tr>`;
        } else if (type === 'mobile') {
            return `<tr>
                <td>${esc(a.asset_name || 'N/A')}</td>
                <td class="mono">${esc(a.serial_number || 'N/A')}</td>
                <td class="mono">${esc(a.imei || 'N/A')}</td>
                <td>${esc(a.location || 'N/A')}</td>
                <td>${esc(a.sector || '-')} / ${esc(a.floor || '-')}</td>
                ${statusHtml}
                ${lastConnHtml}
                ${actionsHtml}
            </tr>`;
        } else if (type === 'printer') {
            // Parses toner object if exists
            let tonerDisplay = 'N/A';
            if (a.toner_levels) {
                try {
                    const toner = typeof a.toner_levels === 'string' ? JSON.parse(a.toner_levels) : a.toner_levels;
                    const levels = Object.entries(toner).map(([k, v]) => `${k}: ${v}%`).join(', ');
                    if (levels) tonerDisplay = levels;
                } catch (e) {
                    tonerDisplay = 'Erro json';
                }
            }
            return `<tr>
                <td>${esc(a.asset_name || 'N/A')}</td>
                ${statusHtml}
                <td>${esc(tonerDisplay)}</td>
                <td>${esc(a.location || 'N/A')}</td>
                <td>${esc(a.sector || '-')} / ${esc(a.floor || '-')}</td>
                ${lastConnHtml}
                ${actionsHtml}
            </tr>`;
        }

        // Default
        return `<tr>
            <td>${esc(a.asset_name || a.name || 'N/A')}</td>
            <td class="mono">${esc(a.serial_number || 'N/A')}</td>
            <td class="mono">${esc(a.ip_address || 'N/A')}</td>
            <td>${esc(a.location || 'N/A')}</td>
            ${statusHtml}
            ${lastConnHtml}
            ${actionsHtml}
        </tr>`;
    }

    function statusBadgeWithIcon(status) {
        const badge = TimeFormatter.getStatusBadge(status);
        return `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: ${badge.bg}; color: ${badge.color}; border-radius: 4px; font-size: 12px; font-weight: 600;">${badge.icon} ${badge.label}</span>`;
    }

    function renderModuleStats(assets) {
        const container = document.getElementById('module-stats-grid');
        if (!container) return;

        const total = assets.length;
        const online = assets.filter(a => ['online', 'active'].includes((a.status || '').toLowerCase())).length;
        const offline = assets.filter(a => ['offline', 'inactive', 'failed', 'unknown'].includes((a.status || '').toLowerCase())).length;
        const warning = assets.filter(a => ['warning', 'maintenance', 'pending', 'retired'].includes((a.status || '').toLowerCase())).length;

        const stats = [
            { label: 'Total de Ativos', value: total, icon: '📦', color: 'var(--accent)', borderColor: 'var(--accent)' },
            { label: 'Online', value: online, icon: '🟢', color: 'var(--success)', borderColor: 'var(--success)' },
            { label: 'Offline', value: offline, icon: '🔴', color: 'var(--danger)', borderColor: 'var(--danger)' },
            { label: 'Atenção / Manut.', value: warning, icon: '⚠️', color: 'var(--warning)', borderColor: 'var(--warning)' }
        ];

        container.innerHTML = stats.map(s => `
            <div class="module-stat-card" style="border-left-color: ${s.borderColor};">
                <div class="module-stat-icon" style="background: ${s.borderColor}15; color: ${s.borderColor};">${s.icon}</div>
                <div class="module-stat-info">
                    <span class="module-stat-label">${s.label}</span>
                    <span class="module-stat-value" style="color: ${s.color};">${s.value}</span>
                </div>
            </div>
        `).join('');
    }

    // ===== SEARCH =====
    function setupDynamicSearch() {
        const input = document.getElementById('dynamic-search');
        if (!input) return;

        input.addEventListener('input', () => {
            const q = input.value.toLowerCase();
            const filtered = allAssets.filter(a =>
                !q ||
                (a.asset_name || '').toLowerCase().includes(q) ||
                (a.serial_number || '').toLowerCase().includes(q) ||
                (a.ip_address || '').toLowerCase().includes(q) ||
                (a.location || '').toLowerCase().includes(q)
            );

            initPaginator(filtered);
        });
    }

    // ===== MODAL & TABS =====
    function setupDynamicModal() {
        const modal = document.getElementById('dynamic-asset-modal');
        const addBtn = document.getElementById('dynamic-add-btn');
        const closeBtn = document.getElementById('dynamic-asset-modal-close');
        const cancelBtn = document.getElementById('dynamic-asset-modal-cancel');
        const saveBtn = document.getElementById('dynamic-asset-modal-save');

        if (addBtn) addBtn.onclick = () => openModal();

        [closeBtn, cancelBtn].forEach(b => {
            if (b) b.onclick = () => modal.classList.remove('active');
        });

        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) modal.classList.remove('active');
            };
        }

        if (saveBtn) saveBtn.onclick = handleSave;

        // View Modal (Device Detail)
        const viewModal = document.getElementById('device-modal');
        const viewClose = document.getElementById('device-modal-close');
        const viewCloseBtn = document.getElementById('device-modal-close-btn');

        [viewClose, viewCloseBtn].forEach(b => {
            if (b) b.onclick = () => viewModal.classList.remove('active');
        });

        if (viewModal) {
            viewModal.onclick = (e) => {
                if (e.target === viewModal) viewModal.classList.remove('active');
            };
        }

        // TABS - Bind events here to ensure they persist
        bindTabEvents();
    }

    function bindTabEvents() {
        // Edit Modal Tabs
        const tabDetails = document.getElementById('dynamic-tab-details-btn');
        const tabHistory = document.getElementById('dynamic-tab-history-btn');
        if (tabDetails && tabHistory) {
            tabDetails.onclick = (e) => { e.preventDefault(); switchTab('edit', 'details'); };
            tabHistory.onclick = (e) => { e.preventDefault(); switchTab('edit', 'history'); };
        }

        // View Modal Tabs
        const viewTabOverview = document.getElementById('detail-tab-overview-btn');
        const viewTabHistory = document.getElementById('detail-tab-history-btn');
        if (viewTabOverview && viewTabHistory) {
            viewTabOverview.onclick = (e) => { e.preventDefault(); switchTab('view', 'overview'); };
            viewTabHistory.onclick = (e) => { e.preventDefault(); switchTab('view', 'history'); };
        }
    }

    function switchTab(context, tabName) {
        let detailsBtn, historyBtn, detailsContent, historyContent, assetId;

        if (context === 'edit') {
            detailsBtn = document.getElementById('dynamic-tab-details-btn');
            historyBtn = document.getElementById('dynamic-tab-history-btn');
            detailsContent = document.getElementById('dynamic-tab-details-content');
            historyContent = document.getElementById('dynamic-tab-history-content');
            assetId = document.getElementById('dynamic-asset-id').value;
        } else { // view
            detailsBtn = document.getElementById('detail-tab-overview-btn');
            historyBtn = document.getElementById('detail-tab-history-btn');
            detailsContent = document.getElementById('detail-tab-overview-content');
            historyContent = document.getElementById('detail-tab-history-content');
            // For view modal, we interpret the modal's data-asset-id
            assetId = document.getElementById('device-modal').dataset.assetId;
        }

        if (tabName === 'details' || tabName === 'overview') {
            detailsBtn.classList.add('active');
            historyBtn.classList.remove('active');
            detailsContent.style.display = 'block';
            historyContent.style.display = 'none';
        } else {
            detailsBtn.classList.remove('active');
            historyBtn.classList.add('active');
            detailsContent.style.display = 'none';
            historyContent.style.display = 'block';
            if (assetId) loadHistory(assetId, context);
        }
    }

    async function loadHistory(assetId, context) {
        const tbodyId = context === 'edit' ? 'dynamic-history-body' : 'device-history-body-full';
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Carregando...</td></tr>';

        try {
            const data = await API.get(`/modules/${currentModuleId}/assets/${assetId}/history`);
            const history = data.history || [];

            if (history.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Nenhum histórico registrado.</td></tr>';
                return;
            }

            tbody.innerHTML = history.map(h => `
                <tr>
                    <td>${formatDate(h.timestamp)}</td>
                    <td class="mono">${esc(h.ip || h.ticket || 'N/A')}</td>
                    <td>${esc(h.unit || '-')} / ${esc(h.sector || '-')} <small>(${esc(h.floor || '-')})</small></td>
                    <td>
                        <span class="badge badge-sm">${esc(h.source || (h.status ? 'manutenção' : 'sistema'))}</span>
                        ${h.maintenance_reason ? `<br><small class="text-muted">${esc(h.maintenance_reason)}</small>` : ''}
                    </td>
                </tr>
            `).join('');
        } catch (e) {
            console.error(e);
            tbody.innerHTML = `<tr><td colspan="4" class="empty-state" style="color:var(--danger)">Erro ao carregar: ${esc(e.message)}</td></tr>`;
        }
    }

    function openModal(asset = null) {
        const modal = document.getElementById('dynamic-asset-modal');
        const title = document.getElementById('dynamic-asset-modal-title');

        // Form fields
        const idField = document.getElementById('dynamic-asset-id');
        const nameField = document.getElementById('dynamic-asset-name');
        const identField = document.getElementById('dynamic-asset-identifier');
        const ipField = document.getElementById('dynamic-asset-ip');
        const locField = document.getElementById('dynamic-asset-location');
        const statusField = document.getElementById('dynamic-asset-status');
        const notesField = document.getElementById('dynamic-asset-notes');

        // Reset Tab
        switchTab('edit', 'details');

        if (asset) {
            title.textContent = 'Editar Ativo';
            idField.value = asset._id || asset.id || '';
            nameField.value = asset.asset_name || asset.name || '';
            identField.value = asset.serial_number || '';
            ipField.value = asset.ip_address || '';
            locField.value = asset.location || '';
            statusField.value = asset.status || 'active';
            notesField.value = asset.notes || '';
        } else {
            title.textContent = 'Novo Ativo';
            idField.value = '';
            nameField.value = '';
            identField.value = '';
            ipField.value = '';
            locField.value = '';
            statusField.value = 'active';
            notesField.value = '';
        }

        modal.classList.add('active');
    }

    // View Modal Logic
    async function openViewModal(assetId) {
        const modal = document.getElementById('device-modal');
        const grid = document.getElementById('device-detail-grid');
        const editBtn = document.getElementById('device-modal-edit-btn');

        // Pre-fetch asset if needed, usually we have it in allAssets but let's be safe
        let asset = allAssets.find(a => (a._id || a.id) === assetId);
        if (!asset) {
            try {
                const res = await API.get(`/modules/${currentModuleId}/assets/${assetId}`);
                asset = res.asset || res;
            } catch (e) {
                showToast('Erro ao carregar ativo', 'error');
                return;
            }
        }

        modal.dataset.assetId = assetId;

        // Reset Tab
        switchTab('view', 'overview');

        // HELPER: Create Section
        const createSection = (title, icon, items) => {
            // Filter out null/undefined items
            const validItems = items.filter(i => i.value !== null && i.value !== undefined && i.value !== '');
            if (validItems.length === 0) return '';

            const gridItems = validItems.map(i => `
                <div class="detail-item-group">
                    <label>${i.label}</label>
                    <span>${i.isHtml ? i.value : esc(i.value)}</span>
                </div>
            `).join('');

            return `
                <div class="detail-section">
                    <div class="detail-section-header">
                        <div class="icon">${icon}</div>
                        <h4>${title}</h4>
                    </div>
                    <div class="detail-grid-cols">
                        ${gridItems}
                    </div>
                </div>
            `;
        };

        // 1. IDENTITY
        const identityItems = [
            { label: 'Nome do Ativo', value: asset.asset_name },
            { label: 'Número de Série', value: asset.serial_number },
            { label: 'Status', value: statusBadge(asset.status), isHtml: true },
            { label: 'Fabricante', value: asset.manufacturer },
            { label: 'Modelo', value: asset.model },
            { label: 'Tipo', value: asset.device_type || asset.type },
        ];

        // 2. NETWORK
        const networkItems = [
            { label: 'Endereço IP', value: asset.ip_address },
            { label: 'Endereço MAC', value: asset.mac_address },
            { label: 'Visto por último', value: formatDate(asset.last_seen) },
            { label: 'WLAN IP', value: asset.wlan_ip }, // Scanner specific
            { label: 'SSID Conectado', value: asset.ssid }, // If available
        ];

        // 3. LOCATION
        const locationItems = [
            { label: 'Localização Completa', value: asset.location },
            { label: 'Unidade', value: asset.unit },
            { label: 'Setor', value: asset.sector },
            { label: 'Andar', value: asset.floor },
        ];

        // 4. HARDWARE & SYSTEM
        const hardwareItems = [
            { label: 'Sistema Operacional', value: asset.operating_system },
            { label: 'Versão do SO', value: asset.os_version },
            { label: 'Processador', value: asset.processor },
            { label: 'Memória RAM', value: asset.ram },
            { label: 'Armazenamento', value: asset.storage },
            { label: 'Bateria', value: asset.battery_level !== undefined ? `${asset.battery_level}%` : null },
            { label: 'Saúde Bateria', value: asset.battery_health },
            { label: 'Monitores', value: asset.monitor_count },
            { label: 'Antivírus', value: asset.antivirus_version ? `${asset.antivirus_version} (${asset.antivirus_status ? 'Ativo' : 'Inativo'})` : null },
        ];

        // 5. CUSTOM & EXTRAS (Catch-all)
        const ignoredKeys = [
            '_id', 'id', '__v', 'asset_name', 'name', 'serial_number', 'status', 'manufacturer', 'model',
            'device_type', 'type', 'ip_address', 'mac_address', 'last_seen', 'location', 'unit', 'sector',
            'floor', 'operating_system', 'os_version', 'processor', 'ram', 'storage', 'battery_level',
            'battery_health', 'monitor_count', 'antivirus_version', 'antivirus_status', 'location_history',
            'maintenance_history', 'created_at', 'updated_at', 'enrolled_at', 'custom_data'
        ];

        const extraItems = Object.keys(asset)
            .filter(k => !ignoredKeys.includes(k) && typeof asset[k] !== 'object')
            .map(k => ({ label: k.replace(/_/g, ' '), value: asset[k] }));

        let html = '';
        html += createSection('Identificação', '🆔', identityItems);
        html += createSection('Rede & Conectividade', '📡', networkItems);
        html += createSection('Localização', '📍', locationItems);
        html += createSection('Hardware & Sistema', '⚙️', hardwareItems);
        html += createSection('Outros Detalhes', '📋', extraItems);

        grid.innerHTML = html;

        // Setup Edit Button in View Modal
        editBtn.onclick = () => {
            modal.classList.remove('active');
            openModal(asset);
        };

        modal.classList.add('active');
    }

    async function handleSave() {
        const id = document.getElementById('dynamic-asset-id').value;

        const body = {
            asset_name: document.getElementById('dynamic-asset-name').value.trim(),
            serial_number: document.getElementById('dynamic-asset-identifier').value.trim(),
            ip_address: document.getElementById('dynamic-asset-ip').value.trim(),
            location: document.getElementById('dynamic-asset-location').value.trim(),
            status: document.getElementById('dynamic-asset-status').value,
            notes: document.getElementById('dynamic-asset-notes').value.trim(),
            asset_type: currentModuleType,
        };

        if (!body.asset_name) {
            showToast('Nome do ativo é obrigatório.', 'warning');
            return;
        }

        try {
            if (id) {
                await API.put(`/modules/${currentModuleId}/assets/${id}`, body);
                showToast('Ativo atualizado.', 'success');
            } else {
                await API.post(`/modules/${currentModuleId}/assets`, body);
                showToast('Ativo criado com sucesso.', 'success');
            }

            document.getElementById('dynamic-asset-modal').classList.remove('active');
            await fetchAssets(currentModuleId);
        } catch (err) {
            showToast(`Erro: ${err.message}`, 'error');
        }
    }

    // ===== SIDEBAR DYNAMIC MODULE INJECTION =====
    async function injectDynamicSidebar() {
        const container = document.getElementById('sidebar-dynamic-modules');
        if (!container) return;

        try {
            const data = await API.get('/modules');
            const modules = data.modules || [];

            if (modules.length === 0) {
                container.innerHTML = '';
                return;
            }

            const typeIcons = {
                mobile: '📱', totem: '🖥️', desktop: '🖥️',
                notebook: '💻', panel: '📺', printer: '🖨️',
                scanner: '📠', custom: '⚙️',
            };

            container.innerHTML = modules.map(m => {
                const icon = typeIcons[m.type] || '📦';
                return `<button class="nav-item nav-dynamic-module" data-module-id="${m._id || m.id}" data-module-type="${m.type}" data-module-name="${esc(m.name)}">
                    <span class="nav-icon">${icon}</span>
                    <span class="nav-label">${esc(m.name)}</span>
                    <span class="nav-badge">${m.asset_count || 0}</span>
                    <div class="active-indicator"></div>
                </button>`;
            }).join('');

            // Bind click events
            container.querySelectorAll('.nav-dynamic-module').forEach(btn => {
                btn.addEventListener('click', function (e) {
                    const modId = this.dataset.moduleId;
                    const modType = this.dataset.moduleType;
                    const modName = this.dataset.moduleName;

                    console.log(`📍 Módulo clicado: ${modName} (${modType})`);

                    // Deactivate all nav items
                    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                    this.classList.add('active');
                    console.log(`✅ Nav item marcado como ativo: ${modName}`);

                    // Hide all page sections, show dynamic one
                    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
                    const dynPage = document.getElementById('page-dynamic-module');
                    if (dynPage) {
                        dynPage.classList.add('active');
                        console.log(`✅ Página dinâmica mostrada`);
                    } else {
                        console.error('❌ page-dynamic-module não encontrado!');
                    }

                    // Update title
                    const pageTitle = document.getElementById('page-title');
                    if (pageTitle) {
                        pageTitle.textContent = `📦 ${modName} (${modType})`;
                        console.log(`✅ Título atualizado: "${modName}"`);
                    } else {
                        console.error('❌ page-title não encontrado!');
                    }

                    // Load the module
                    console.log(`🔄 Carregando dados do módulo: ${modName}`);
                    loadDynamicModule(modId);
                });
            });
        } catch (err) {
            console.error('Erro ao carregar módulos dinâmicos para sidebar:', err);
        }
    }

    // Inject sidebar entries after modules page loads or app init
    document.addEventListener('DOMContentLoaded', () => {
        // Delay slightly to ensure API module is loaded
        setTimeout(injectDynamicSidebar, 500);
    });

    // ===== EXPOSED ACTIONS =====
    window.DynamicAssetManager = {
        edit: async (assetId) => {
            const asset = allAssets.find(a => (a._id || a.id) === assetId);
            if (asset) {
                openModal(asset);
            } else {
                try {
                    const data = await API.get(`/modules/${currentModuleId}/assets/${assetId}`);
                    openModal(data);
                } catch (err) {
                    showToast('Erro ao carregar ativo.', 'error');
                }
            }
        },
        view: (assetId) => {
            openViewModal(assetId);
        },
        remove: async (assetId, assetName) => {
            if (!await confirmAction(`Excluir o ativo "${assetName}"?`, { danger: true, okText: 'Excluir' })) return;
            try {
                await API.delete(`/modules/${currentModuleId}/assets/${assetId}`);
                showToast(`Ativo "${assetName}" excluído.`, 'success');
                await fetchAssets(currentModuleId);
            } catch (err) {
                showToast(`Erro: ${err.message}`, 'error');
            }
        },
        sendCommand: (assetId, assetName) => {
            // Navigate to commands page with pre-selected asset
            showToast(`Navegue para Comandos e selecione "${assetName}" manualmente.`, 'info');
        },
        refreshSidebar: injectDynamicSidebar,
    };
})();
