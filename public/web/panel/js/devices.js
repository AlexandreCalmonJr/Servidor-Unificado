// MDM Dashboard — Devices Page
// Dispositivos Móveis — usa /api/monitoring/assets?type=mobile
// CRUD usa /api/modules/:moduleId/assets/:assetId

(() => {
    let allAssets = [];   // ManagedAsset[]
    let paginator = null;

    function loadDevices() {
        setupEditModal();
        setupDetailModal();
        setupSearch();
        setupFilter();
        setupActionDelegation();
        fetchAssets();
    }

    // ===== FETCH =====
    // GET /api/monitoring/assets?type=mobile
    async function fetchAssets() {
        const tbody = document.getElementById('devices-table-body');
        if (!tbody) return;

        tbody.innerHTML = `<tr>${skeleton(1, 8)}</tr>`;

        try {
            const data = await API.get('/monitoring/assets?type=mobile');
            allAssets = Array.isArray(data) ? data : (data.assets || []);
            initPaginator(allAssets);
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><p>Erro ao carregar dispositivos.</p></td></tr>';
            console.error(err);
        }
    }

    function initPaginator(items) {
        paginator = Paginator(items, {
            perPage: 15,
            onPageChange: (pageItems) => renderAssets(pageItems),
        });
        renderAssets(paginator.getPage());
        paginator.renderControls('devices-pagination');
    }

    function renderAssets(assets) {
        const tbody = document.getElementById('devices-table-body');
        if (!tbody) return;

        if (assets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><div class="empty-icon">📱</div><p>Nenhum dispositivo móvel encontrado.</p></td></tr>';
            return;
        }

        tbody.innerHTML = assets.map(a => {
            const st = (a.status || 'unknown').toLowerCase();
            let statusColor = 'bg-slate-500/10 text-slate-400';
            if (['online', 'active', 'completed'].includes(st)) statusColor = 'bg-emerald-500/10 text-emerald-400';
            else if (['offline', 'failed', 'error', 'inactive'].includes(st)) statusColor = 'bg-red-500/10 text-red-400';
            else if (['pending', 'warning'].includes(st)) statusColor = 'bg-amber-500/10 text-amber-400';
            else if (st === 'maintenance') statusColor = 'bg-purple-500/10 text-purple-400';

            const assetId = a._id || a.id;
            const moduleId = a.module_id || '';
            const battery = a.battery_level ?? a.battery;

            return `
            <tr class="hover:bg-slate-800/50 transition-colors group"
                data-asset-id="${assetId}"
                data-module-id="${moduleId}"
                data-serial="${esc(a.serial_number || '')}">
                <td class="p-4 border-b border-slate-800 font-medium text-white">
                    ${esc(a.asset_name || a.name || a.serial_number || 'N/A')}
                </td>
                <td class="p-4 border-b border-slate-800 font-mono text-xs text-slate-400">
                    ${esc(a.serial_number || 'N/A')}
                </td>
                <td class="p-4 border-b border-slate-800">${esc(a.model || 'N/A')}</td>
                <td class="p-4 border-b border-slate-800">
                    ${battery != null ? `<span class="${battery < 20 ? 'text-red-400' : ''}">${battery}%</span>` : 'N/A'}
                </td>
                <td class="p-4 border-b border-slate-800 font-mono text-xs">${esc(a.ip_address || 'N/A')}</td>
                <td class="p-4 border-b border-slate-800">${esc(a.sector || a.location || 'N/A')}</td>
                <td class="p-4 border-b border-slate-800">
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}">${st}</span>
                </td>
                <td class="p-4 border-b border-slate-800 text-right">
                    <div class="flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button data-action="view" data-id="${assetId}" data-module="${moduleId}" title="Detalhes"
                            class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg">👁️</button>
                        <button data-action="edit" data-id="${assetId}" data-module="${moduleId}" title="Editar"
                            class="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg">✏️</button>
                        <button data-action="install_apk" data-id="${assetId}" data-module="${moduleId}"
                            data-serial="${esc(a.serial_number || '')}" title="Instalar APK"
                            class="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg">📥</button>
                        <button data-action="restart" data-id="${assetId}" data-module="${moduleId}"
                            data-serial="${esc(a.serial_number || '')}" title="Reiniciar"
                            class="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg">🔄</button>
                        <button data-action="delete" data-id="${assetId}" data-module="${moduleId}"
                            data-serial="${esc(a.serial_number || '')}" title="Excluir"
                            class="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg">🗑️</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    // ===== SEARCH / FILTER =====
    function setupSearch() {
        const input = document.getElementById('device-search');
        if (input) input.addEventListener('input', filterAssets);
    }

    function setupFilter() {
        const select = document.getElementById('device-filter');
        if (select) select.addEventListener('change', filterAssets);
    }

    function filterAssets() {
        const q = (document.getElementById('device-search')?.value || '').toLowerCase();
        const filterVal = document.getElementById('device-filter')?.value || 'all';

        const filtered = allAssets.filter(a => {
            const name = (a.asset_name || a.name || '').toLowerCase();
            const serial = (a.serial_number || '').toLowerCase();
            const sector = (a.sector || a.location || '').toLowerCase();
            const matchSearch = !q || name.includes(q) || serial.includes(q) || sector.includes(q);
            const st = (a.status || '').toLowerCase();
            const matchFilter = filterVal === 'all' || st === filterVal ||
                (filterVal === 'active' && ['active', 'online'].includes(st)) ||
                (filterVal === 'completed' && st === 'completed');
            return matchSearch && matchFilter;
        });

        initPaginator(filtered);
    }

    // ===== ACTION DELEGATION =====
    function setupActionDelegation() {
        const tbody = document.getElementById('devices-table-body');
        if (!tbody || tbody.dataset.delegated) return;
        tbody.dataset.delegated = 'true';
        tbody.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const { action, id, module: moduleId, serial } = btn.dataset;
            if (action === 'view') MobileDeviceDetail.show(id, moduleId);
            else if (action === 'edit') openEditModal(id, moduleId);
            else if (action === 'install_apk') promptInstallApk(id, moduleId, serial);
            else if (action === 'restart') promptRestart(id, moduleId, serial);
            else if (action === 'delete') deleteAsset(id, moduleId, serial);
        });
    }

    // ===== COMMANDS (via moduleRoutes) =====
    // POST /api/modules/:moduleId/assets/:assetId/commands
    async function promptInstallApk(assetId, moduleId, serial) {
        if (!moduleId) { showToast('Módulo não identificado para este ativo.', 'warning'); return; }
        const url = prompt(`URL do APK para instalar em ${serial || assetId}:`);
        if (!url) return;
        try {
            await API.post(`/modules/${moduleId}/assets/${assetId}/commands`, {
                commandType: 'install_apk',
                apkUrl: url,
            });
            showToast('Comando de instalação enviado!', 'success');
        } catch (e) {
            showToast(`Erro: ${e.message}`, 'error');
        }
    }

    async function promptRestart(assetId, moduleId, serial) {
        if (!await confirmAction(`Reiniciar o app em ${serial || assetId}?`, { okText: 'Reiniciar' })) return;
        if (!moduleId) { showToast('Módulo não identificado.', 'warning'); return; }
        try {
            await API.post(`/modules/${moduleId}/assets/${assetId}/commands`, {
                commandType: 'reboot_device',
            });
            showToast('Comando de reinício enviado!', 'success');
        } catch (e) {
            showToast(`Erro: ${e.message}`, 'error');
        }
    }

    // ===== EDIT MODAL =====
    function setupEditModal() {
        const modal = document.getElementById('device-edit-modal');
        const closeBtn = document.getElementById('device-edit-modal-close');
        const cancelBtn = document.getElementById('device-edit-modal-cancel');
        const saveBtn = document.getElementById('device-edit-modal-save');

        [closeBtn, cancelBtn].forEach(b => {
            if (b) b.addEventListener('click', () => modal.classList.remove('active'));
        });
        if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
        if (saveBtn) saveBtn.addEventListener('click', handleSaveAsset);
    }

    function openEditModal(assetId, moduleId) {
        const asset = allAssets.find(a => (a._id || a.id) === assetId);
        if (!asset) { showToast('Ativo não encontrado.', 'error'); return; }

        document.getElementById('edit-device-serial').value = assetId; // reusing field as asset ID
        document.getElementById('form-device-name').value = asset.asset_name || asset.name || '';
        document.getElementById('form-device-serial').value = asset.serial_number || '';
        document.getElementById('form-device-unit').value = asset.unit || '';
        document.getElementById('form-device-sector').value = asset.sector || asset.location || '';
        document.getElementById('form-device-floor').value = asset.floor || '';

        const modal = document.getElementById('device-edit-modal');
        modal.dataset.moduleId = moduleId;
        modal.classList.add('active');
    }

    // PUT /api/modules/:moduleId/assets/:assetId
    async function handleSaveAsset() {
        const modal = document.getElementById('device-edit-modal');
        const assetId = document.getElementById('edit-device-serial').value;
        const moduleId = modal.dataset.moduleId;

        if (!moduleId) { showToast('Módulo não identificado.', 'error'); return; }

        const asset_name = document.getElementById('form-device-name').value.trim();
        if (!asset_name) { showToast('Nome é obrigatório', 'warning'); return; }

        try {
            await API.put(`/modules/${moduleId}/assets/${assetId}`, {
                asset_name,
                unit: document.getElementById('form-device-unit').value.trim(),
                sector: document.getElementById('form-device-sector').value.trim(),
                floor: document.getElementById('form-device-floor').value.trim(),
            });
            showToast('Dispositivo atualizado!', 'success');
            modal.classList.remove('active');
            fetchAssets();
        } catch (e) {
            showToast(`Erro: ${e.message}`, 'error');
        }
    }

    // DELETE /api/modules/:moduleId/assets/:assetId
    async function deleteAsset(assetId, moduleId, serial) {
        if (!await confirmAction(`Remover dispositivo ${serial || assetId}?`, { danger: true, okText: 'Remover' })) return;
        if (!moduleId) { showToast('Módulo não identificado.', 'error'); return; }
        try {
            await API.delete(`/modules/${moduleId}/assets/${assetId}`);
            showToast('Dispositivo removido.', 'success');
            fetchAssets();
        } catch (e) {
            showToast(`Erro: ${e.message}`, 'error');
        }
    }

    // ===== DETAIL MODAL =====
    function setupDetailModal() {
        const modal = document.getElementById('device-modal');
        if (!modal) return;

        ['device-modal-close', 'device-modal-close-btn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => modal.classList.remove('active'));
        });
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

        const editBtn = document.getElementById('device-modal-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                const assetId = modal.dataset.assetId;
                const moduleId = modal.dataset.moduleId;
                if (assetId && moduleId) {
                    modal.classList.remove('active');
                    openEditModal(assetId, moduleId);
                }
            });
        }
    }

    window.DeviceManager = { reload: fetchAssets };
    App.onPageLoad('devices', loadDevices);
})();

// ===== DETAIL MODAL CONTROLLER =====
// GET /api/modules/:moduleId/assets/:assetId
// GET /api/modules/:moduleId/assets/:assetId/history
const MobileDeviceDetail = (() => {
    function show(assetId, moduleId) {
        const modal = document.getElementById('device-modal');
        const grid = document.getElementById('device-detail-grid');
        if (!modal || !grid) return;

        modal.dataset.assetId = assetId;
        modal.dataset.moduleId = moduleId;

        grid.innerHTML = '<p style="color:var(--text-muted);">Carregando...</p>';
        modal.classList.add('active');

        // Reset to overview tab
        document.getElementById('detail-tab-overview-btn')?.classList.add('active');
        document.getElementById('detail-tab-history-btn')?.classList.remove('active');
        document.getElementById('detail-tab-overview-content')?.style?.setProperty('display', 'block');
        const histContent = document.getElementById('detail-tab-history-content');
        if (histContent) histContent.style.display = 'none';

        // Setup tabs
        setupDetailTabs(assetId, moduleId);

        if (!moduleId) {
            // Try to find in monitoring
            API.get(`/monitoring/assets`)
                .then(data => {
                    const list = Array.isArray(data) ? data : (data.assets || []);
                    const asset = list.find(a => (a._id || a.id) === assetId);
                    if (asset) renderDetail(asset);
                    else grid.innerHTML = '<p style="color:var(--danger);">Ativo não encontrado.</p>';
                })
                .catch(err => { grid.innerHTML = `<p style="color:var(--danger);">Erro: ${esc(err.message)}</p>`; });
            return;
        }

        API.get(`/modules/${moduleId}/assets/${assetId}`)
            .then(data => {
                const asset = data.asset || data;
                renderDetail(asset);
            })
            .catch(err => {
                grid.innerHTML = `<p style="color:var(--danger);">Erro: ${esc(err.message)}</p>`;
            });
    }

    function setupDetailTabs(assetId, moduleId) {
        const overviewBtn = document.getElementById('detail-tab-overview-btn');
        const historyBtn = document.getElementById('detail-tab-history-btn');
        const overviewContent = document.getElementById('detail-tab-overview-content');
        const historyContent = document.getElementById('detail-tab-history-content');

        if (overviewBtn) {
            overviewBtn.onclick = () => {
                overviewBtn.classList.add('active');
                historyBtn?.classList.remove('active');
                if (overviewContent) overviewContent.style.display = 'block';
                if (historyContent) historyContent.style.display = 'none';
            };
        }

        if (historyBtn) {
            historyBtn.onclick = () => {
                historyBtn.classList.add('active');
                overviewBtn?.classList.remove('active');
                if (overviewContent) overviewContent.style.display = 'none';
                if (historyContent) historyContent.style.display = 'block';
                loadHistory(assetId, moduleId);
            };
        }
    }

    // GET /api/modules/:moduleId/assets/:assetId/history
    async function loadHistory(assetId, moduleId) {
        const tbody = document.getElementById('device-history-body-full');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Carregando...</td></tr>';

        try {
            const data = await API.get(`/modules/${moduleId}/assets/${assetId}/history`);
            const history = data.history || [];

            if (!history.length) {
                tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Nenhum histórico.</td></tr>';
                return;
            }

            tbody.innerHTML = history.map(h => `
                <tr>
                    <td>${formatDate(h.timestamp)}</td>
                    <td class="mono">${esc(h.ip || h.bssid || 'N/A')}</td>
                    <td>${esc(h.unit || '-')} / ${esc(h.sector || '-')}</td>
                    <td>${esc(h.source || 'sistema')}</td>
                </tr>`).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="4" style="color:var(--danger);">Erro: ${esc(err.message)}</td></tr>`;
        }
    }

    function renderDetail(a) {
        const modal = document.getElementById('device-modal');
        const grid = document.getElementById('device-detail-grid');
        const title = document.getElementById('device-modal-title');

        if (title) title.textContent = a.asset_name || a.name || 'Dispositivo Móvel';

        const fields = [
            { label: 'Nome', value: a.asset_name || a.name },
            { label: 'Serial', value: a.serial_number },
            { label: 'Modelo', value: a.model },
            { label: 'Fabricante', value: a.manufacturer },
            { label: 'Android', value: a.android_version || a.os_version },
            { label: 'Bateria', value: a.battery_level != null ? `${a.battery_level}%` : null },
            { label: 'IP', value: a.ip_address },
            { label: 'Unidade', value: a.unit },
            { label: 'Setor', value: a.sector || a.location },
            { label: 'Status', value: a.status },
            { label: 'Última Conexão', value: formatDate(a.last_seen || a.updatedAt) },
            { label: 'Criado em', value: formatDate(a.createdAt) },
        ];

        grid.innerHTML = fields
            .filter(f => f.value != null && f.value !== '')
            .map(f => `
            <div class="detail-item">
                <div class="detail-label">${f.label}</div>
                <div class="detail-value">${esc(String(f.value))}</div>
            </div>`).join('');
    }

    return { show };
})();
