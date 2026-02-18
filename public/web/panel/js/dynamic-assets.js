// MDM Dashboard — Dynamic Module Assets Page
// Handles dedicated per-module asset pages with full CRUD

(() => {
    let currentModuleId = null;
    let currentModuleType = null;
    let currentModuleName = null;
    let allAssets = [];

    function loadDynamicModule(moduleId) {
        if (!moduleId) return;
        currentModuleId = moduleId;

        fetchModuleDetail(moduleId);
        setupDynamicModal();
        setupDynamicSearch();
    }

    async function fetchModuleDetail(moduleId) {
        const title = document.getElementById('dynamic-module-title');
        const tbody = document.getElementById('dynamic-table-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><p>Carregando...</p></td></tr>';

        try {
            const mod = await API.get(`/modules/${moduleId}`);
            currentModuleType = mod.type || 'custom';
            currentModuleName = mod.name || 'Módulo';

            if (title) title.textContent = `${currentModuleName}`;

            const pageTitle = document.getElementById('page-title');
            if (pageTitle) pageTitle.textContent = currentModuleName;

            await fetchAssets(moduleId);
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><p style="color:var(--danger);">Erro: ${esc(err.message)}</p></td></tr>`;
        }
    }

    let paginator = null;

    async function fetchAssets(moduleId) {
        const tbody = document.getElementById('dynamic-table-body');
        if (!tbody) return;

        try {
            const data = await API.get(`/modules/${moduleId}/assets`);
            allAssets = data.assets || [];

            initPaginator(allAssets);
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><p style="color:var(--danger);">Erro: ${esc(err.message)}</p></td></tr>`;
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

        if (assets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-icon">📦</div><p>Nenhum ativo neste módulo.</p></td></tr>';
            return;
        }

        tbody.innerHTML = assets.map(a => `
            <tr>
                <td>${esc(a.asset_name || a.name || 'N/A')}</td>
                <td class="mono">${esc(a.serial_number || 'N/A')}</td>
                <td class="mono">${esc(a.ip_address || 'N/A')}</td>
                <td>${esc(a.location || 'N/A')}</td>
                <td>${statusBadge(a.status)}</td>
                <td>${formatDate(a.last_seen || a.updatedAt)}</td>
                <td>
                    <button class="btn btn-ghost btn-sm" onclick="DynamicAssetManager.edit('${a._id || a.id}')" title="Editar">✏️</button>
                    <button class="btn btn-ghost btn-sm" onclick="DynamicAssetManager.sendCommand('${a._id || a.id}', '${esc(a.asset_name || '')}')" title="Comando">⚡</button>
                    <button class="btn btn-danger btn-sm" onclick="DynamicAssetManager.remove('${a._id || a.id}', '${esc(a.asset_name || '')}')" title="Excluir">🗑</button>
                </td>
            </tr>
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

    // ===== MODAL =====
    function setupDynamicModal() {
        const modal = document.getElementById('dynamic-asset-modal');
        const addBtn = document.getElementById('dynamic-add-btn');
        const closeBtn = document.getElementById('dynamic-asset-modal-close');
        const cancelBtn = document.getElementById('dynamic-asset-modal-cancel');
        const saveBtn = document.getElementById('dynamic-asset-modal-save');

        if (addBtn) {
            addBtn.onclick = () => openModal();
        }

        [closeBtn, cancelBtn].forEach(b => {
            if (b) b.onclick = () => modal.classList.remove('active');
        });

        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) modal.classList.remove('active');
            };
        }

        if (saveBtn) {
            saveBtn.onclick = handleSave;
        }
    }

    function openModal(asset = null) {
        const modal = document.getElementById('dynamic-asset-modal');
        const title = document.getElementById('dynamic-asset-modal-title');
        const idField = document.getElementById('dynamic-asset-id');
        const nameField = document.getElementById('dynamic-asset-name');
        const identField = document.getElementById('dynamic-asset-identifier');
        const ipField = document.getElementById('dynamic-asset-ip');
        const locField = document.getElementById('dynamic-asset-location');
        const statusField = document.getElementById('dynamic-asset-status');
        const notesField = document.getElementById('dynamic-asset-notes');

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
                </button>`;
            }).join('');

            // Bind click events
            container.querySelectorAll('.nav-dynamic-module').forEach(btn => {
                btn.addEventListener('click', () => {
                    const modId = btn.dataset.moduleId;
                    const modName = btn.dataset.moduleName;

                    // Deactivate all nav items
                    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                    btn.classList.add('active');

                    // Hide all page sections, show dynamic one
                    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
                    const dynPage = document.getElementById('page-dynamic-module');
                    if (dynPage) dynPage.classList.add('active');

                    // Update title
                    const pageTitle = document.getElementById('page-title');
                    if (pageTitle) pageTitle.textContent = modName;

                    // Load the module
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
