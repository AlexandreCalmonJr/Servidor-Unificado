// MDM Dashboard — Modules Page

// MDM Dashboard — Modules Page

(() => {
    let allModules = [];

    const MODULE_TYPES = [
        { value: 'mobile', label: 'Mobile', icon: '📱' },
        { value: 'totem', label: 'Totem', icon: '🖥️' },
        { value: 'desktop', label: 'Desktop', icon: '💻' },
        { value: 'notebook', label: 'Notebook', icon: '💻' },
        { value: 'panel', label: 'Painel/TV', icon: '📺' },
        { value: 'printer', label: 'Impressora', icon: '🖨️' },
        { value: 'scanner', label: 'Scanner', icon: '📠' },
        { value: 'custom', label: 'Customizado', icon: '⚙️' },
    ];

    function loadModules() {
        fetchModules();
        setupModuleModal();
        setupAssetModal();
    }

    async function fetchModules() {
        const container = document.getElementById('modules-cards');
        if (!container) return;

        try {
            const data = await API.get('/modules');
            allModules = data.modules || [];
            renderModuleCards(allModules);
        } catch (err) {
            container.innerHTML = '<div class="empty-state"><p>Erro ao carregar módulos.</p></div>';
            console.error('Erro:', err);
        }
    }

    function renderModuleCards(modules) {
        const container = document.getElementById('modules-cards');
        if (!container) return;

        if (modules.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><p>Nenhum módulo cadastrado. Clique em "+ Novo Módulo" para criar.</p></div>';
            return;
        }

        container.innerHTML = modules.map(m => {
            const typeInfo = MODULE_TYPES.find(t => t.value === m.type) || { icon: '📦', label: m.type };
            return `
        <div class="module-card" data-module-id="${m._id || m.id}">
          <div class="module-card-header">
            <span class="module-icon">${typeInfo.icon}</span>
            <div>
              <div class="module-card-name">${esc(m.name)}</div>
              <div class="module-card-type">${typeInfo.label}</div>
            </div>
            <div class="module-card-actions">
              <button class="btn btn-ghost btn-sm" onclick="ModuleManager.edit('${m._id || m.id}')" title="Editar">✏️</button>
              <button class="btn btn-danger btn-sm" onclick="ModuleManager.remove('${m._id || m.id}', '${esc(m.name)}')" title="Excluir">🗑</button>
            </div>
          </div>
          <p class="module-card-desc">${esc(m.description || 'Sem descrição')}</p>
          <div class="module-card-footer">
            <span class="module-asset-count">${m.asset_count ?? 0} ativo(s)</span>
            <span class="status-badge ${m.is_active ? 'online' : 'offline'}">${m.is_active ? 'Ativo' : 'Inativo'}</span>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
             <button class="btn btn-ghost btn-sm module-expand-btn" style="flex:1;" onclick="ModuleManager.toggleAssets('${m._id || m.id}', '${esc(m.type)}')">📋 Ver Ativos</button>
             <button class="btn btn-primary btn-sm" onclick="ModuleManager.addAsset('${m._id || m.id}', '${esc(m.type)}')" title="Adicionar Ativo">+ Ativo</button>
          </div>
          <div class="module-assets-area" id="module-assets-${m._id || m.id}" style="display:none;"></div>
        </div>
      `;
        }).join('');
    }

    // ===== MODULE MODAL =====
    function setupModuleModal() {
        const modal = document.getElementById('module-modal');
        const addBtn = document.getElementById('add-module-btn');
        const closeBtn = document.getElementById('module-modal-close');
        const cancelBtn = document.getElementById('module-modal-cancel');
        const saveBtn = document.getElementById('module-modal-save');

        if (addBtn) addBtn.addEventListener('click', () => openModuleModal());
        [closeBtn, cancelBtn].forEach(b => {
            if (b) b.addEventListener('click', () => modal.classList.remove('active'));
        });
        if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
        if (saveBtn) saveBtn.addEventListener('click', handleSaveModule);
    }

    function openModuleModal(mod = null) {
        const modal = document.getElementById('module-modal');
        const title = document.getElementById('module-modal-title');
        const form = document.getElementById('module-form');
        const editId = document.getElementById('edit-module-id');

        if (form) form.reset();

        const typeSelect = document.getElementById('form-module-type');
        if (typeSelect && typeSelect.options.length <= 1) {
            MODULE_TYPES.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.value;
                opt.textContent = `${t.icon} ${t.label}`;
                typeSelect.appendChild(opt);
            });
        }

        if (mod) {
            title.textContent = 'Editar Módulo';
            editId.value = mod._id || mod.id;
            document.getElementById('form-module-name').value = mod.name || '';
            document.getElementById('form-module-type').value = mod.type || 'custom';
            document.getElementById('form-module-desc').value = mod.description || '';
        } else {
            title.textContent = 'Novo Módulo';
            editId.value = '';
        }

        modal.classList.add('active');
    }

    async function handleSaveModule() {
        const editId = document.getElementById('edit-module-id').value;
        const name = document.getElementById('form-module-name').value.trim();
        const type = document.getElementById('form-module-type').value;
        const description = document.getElementById('form-module-desc').value.trim();

        if (!name || !type) {
            showToast('Nome e tipo são obrigatórios.', 'warning');
            return;
        }

        const body = { name, type, description };

        try {
            if (editId) {
                await API.put(`/modules/${editId}`, body);
                showToast('Módulo atualizado.', 'success');
            } else {
                await API.post('/modules', body);
                showToast('Módulo criado com sucesso.', 'success');
            }
            document.getElementById('module-modal').classList.remove('active');
            fetchModules();
        } catch (err) {
            showToast(`Erro: ${err.message}`, 'error');
        }
    }

    // ===== ASSET MODAL & LOGIC =====
    function setupAssetModal() {
        const modal = document.getElementById('asset-modal');
        const closeBtn = document.getElementById('asset-modal-close');
        const cancelBtn = document.getElementById('asset-modal-cancel');
        const form = document.getElementById('asset-form');

        [closeBtn, cancelBtn].forEach(b => {
            if (b) b.addEventListener('click', () => modal.classList.remove('active'));
        });
        if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                handleSaveAsset();
            });
        }
    }

    function openAssetModal(type, asset = null, prefillModuleId = null) {
        const modal = document.getElementById('asset-modal');
        const title = document.getElementById('asset-modal-title');
        const form = document.getElementById('asset-form');
        const idField = document.getElementById('asset-id');
        const modTypeField = document.getElementById('asset-module-type');

        // Se estivermos criando (asset=null) e temos prefillModuleId, guardamos isso no dataset do form
        if (prefillModuleId) {
            form.dataset.moduleId = prefillModuleId;
        }

        if (form) form.reset();
        modTypeField.value = type;

        // Render dynamic fields
        renderAssetForm(type, asset);

        if (asset) {
            title.textContent = 'Editar Ativo';
            idField.value = asset._id || asset.id;
            document.getElementById('asset-name').value = asset.asset_name || asset.name || '';
            document.getElementById('asset-serial').value = asset.serial_number || asset.serial || '';
            document.getElementById('asset-location').value = asset.location || '';
            document.getElementById('asset-assigned').value = asset.assigned_to || '';
        } else {
            title.textContent = 'Novo Ativo';
            idField.value = '';
        }

        modal.classList.add('active');
    }

    function renderAssetForm(type, asset) {
        const container = document.getElementById('asset-dynamic-fields');
        if (!container) return;

        let html = '';
        const a = asset || {};

        switch (type) {
            case 'desktop':
            case 'notebook':
                html += `
                    <div class="form-row">
                        <div class="form-group"><label>Hostname</label><input type="text" name="hostname" value="${esc(a.hostname || '')}" class="dyn-field" required></div>
                        <div class="form-group"><label>SO</label><input type="text" name="operating_system" value="${esc(a.operating_system || '')}" class="dyn-field"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Processador</label><input type="text" name="processor" value="${esc(a.processor || '')}" class="dyn-field"></div>
                        <div class="form-group"><label>RAM</label><input type="text" name="ram" value="${esc(a.ram || '')}" class="dyn-field"></div>
                    </div>
                    <div class="form-group"><label>Armazenamento</label><input type="text" name="storage" value="${esc(a.storage || '')}" class="dyn-field"></div>
                `;
                if (type === 'notebook') {
                    html += `<div class="form-group"><label>Nível Bateria (%)</label><input type="number" name="battery_level" value="${a.battery_level || ''}" class="dyn-field" min="0" max="100"></div>`;
                }
                break;
            case 'panel':
                html += `
                    <div class="form-row">
                        <div class="form-group"><label>Tamanho Tela</label><input type="text" name="screen_size" value="${esc(a.screen_size || '')}" class="dyn-field"></div>
                        <div class="form-group"><label>Resolução</label><input type="text" name="resolution" value="${esc(a.resolution || '')}" class="dyn-field"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>IP</label><input type="text" name="ip_address" value="${esc(a.ip_address || '')}" class="dyn-field"></div>
                        <div class="form-group"><label>Firmware</label><input type="text" name="firmware_version" value="${esc(a.firmware_version || '')}" class="dyn-field"></div>
                    </div>
                `;
                break;
            case 'printer':
                html += `
                    <div class="form-row">
                        <div class="form-group"><label>IP</label><input type="text" name="ip_address" value="${esc(a.ip_address || '')}" class="dyn-field"></div>
                        <div class="form-group"><label>Modelo</label><input type="text" name="model" value="${esc(a.model || '')}" class="dyn-field"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Toner (%)</label><input type="text" name="toner_levels" value="${esc(a.toner_levels ? JSON.stringify(a.toner_levels) : '')}" class="dyn-field" placeholder='{"black": 80}'></div>
                        <div class="form-group"><label>Papel (%)</label><input type="number" name="paper_level" value="${a.paper_level || ''}" class="dyn-field"></div>
                    </div>
                `;
                break;
            default:
                html += `<div class="form-group"><label>Descrição/Dados</label><textarea name="custom_data" class="dyn-field">${a.custom_data ? JSON.stringify(a.custom_data) : ''}</textarea></div>`;
        }
        container.innerHTML = html;
    }

    async function handleSaveAsset() {
        const form = document.getElementById('asset-form');
        const id = document.getElementById('asset-id').value;
        const moduleId = form.dataset.moduleId;
        const type = document.getElementById('asset-module-type').value;

        // Base fields
        const body = {
            asset_name: document.getElementById('asset-name').value.trim(),
            serial_number: document.getElementById('asset-serial').value.trim(),
            location: document.getElementById('asset-location').value.trim(),
            assigned_to: document.getElementById('asset-assigned').value.trim(),
            asset_type: type
        };

        // Dynamic fields
        document.querySelectorAll('.dyn-field').forEach(input => {
            if (input.value) body[input.name] = input.value;
        });

        if (!moduleId) {
            showToast('Erro: Módulo não identificado.', 'error');
            return;
        }

        try {
            if (id) {
                await API.put(`/modules/${moduleId}/assets/${id}`, body);
                showToast('Ativo atualizado.', 'success');
            } else {
                await API.post(`/modules/${moduleId}/assets`, body);
                showToast('Ativo criado com sucesso.', 'success');
            }
            document.getElementById('asset-modal').classList.remove('active');

            // Refresh assets list
            const area = document.getElementById(`module-assets-${moduleId}`);
            if (area && area.style.display !== 'none') {
                await loadModuleAssets(moduleId, type, area);
            }
            fetchModules(); // update counts
        } catch (err) {
            showToast(`Erro: ${err.message}`, 'error');
        }
    }


    // ===== ASSETS LISTING =====
    async function toggleAssets(moduleId, moduleType) {
        const area = document.getElementById(`module-assets-${moduleId}`);
        if (!area) return;

        if (area.style.display === 'none') {
            area.style.display = 'block';
            area.innerHTML = '<p style="color: var(--text-muted); padding: 12px;">Carregando ativos...</p>';
            await loadModuleAssets(moduleId, moduleType, area);
        } else {
            area.style.display = 'none';
        }
    }

    async function loadModuleAssets(moduleId, moduleType, area) {
        try {
            const data = await API.get(`/modules/${moduleId}/assets`);
            const assets = data.assets || [];

            if (assets.length === 0) {
                area.innerHTML = '<p style="color: var(--text-muted); padding: 12px;">Nenhum ativo neste módulo.</p>';
                return;
            }

            area.innerHTML = `
        <table class="data-table" style="margin-top: 8px;">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Serial</th>
              <th>Status</th>
              <th>Localização</th>
              <th>Última Vez</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${assets.map(a => `
              <tr>
                <td>${esc(a.asset_name || a.name || 'N/A')}</td>
                <td class="mono">${esc(a.serial_number || 'N/A')}</td>
                <td>${statusBadge(a.status)}</td>
                <td>${esc(a.location || 'N/A')}</td>
                <td>${formatDate(a.last_seen)}</td>
                <td>
                  <button class="btn btn-ghost btn-sm" onclick="ModuleManager.editAsset('${moduleId}', '${moduleType}', '${a._id || a.id}')" title="Editar">✏️</button>
                  <button class="btn btn-danger btn-sm" onclick="ModuleManager.removeAsset('${moduleId}', '${a._id || a.id}', '${esc(a.asset_name || '')}')" title="Excluir">🗑</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="padding: 8px; color: var(--text-muted); font-size: 12px;">
          Total: ${data.total_count || assets.length} ativo(s)
        </div>
      `;
        } catch (err) {
            area.innerHTML = `<p style="color: var(--danger); padding: 12px;">Erro: ${esc(err.message)}</p>`;
        }
    }

    // ===== EXPOSED ACTIONS =====
    window.ModuleManager = {
        edit: (id) => {
            const mod = allModules.find(m => (m._id || m.id) === id);
            if (mod) openModuleModal(mod);
        },
        remove: async (id, name) => {
            if (!confirm(`Excluir o módulo "${name}"? Ele não pode ter ativos.`)) return;
            try {
                await API.delete(`/modules/${id}`);
                showToast(`Módulo "${name}" excluído.`, 'success');
                fetchModules();
            } catch (err) {
                showToast(`Erro: ${err.message}`, 'error');
            }
        },
        toggleAssets,
        addAsset: (moduleId, type) => {
            openAssetModal(type, null, moduleId);
        },
        editAsset: async (moduleId, type, assetId) => {
            try {
                // Fetch single asset details
                const asset = await API.get(`/modules/${moduleId}/assets/${assetId}`);
                // Need to pass modal form the moduleId for saving
                document.getElementById('asset-form').dataset.moduleId = moduleId;
                openAssetModal(type, asset);
            } catch (e) {
                showToast('Erro ao carregar ativo', 'error');
            }
        },
        removeAsset: async (moduleId, assetId, assetName) => {
            if (!confirm(`Excluir o ativo "${assetName}"?`)) return;
            try {
                await API.delete(`/modules/${moduleId}/assets/${assetId}`);
                showToast(`Ativo excluído.`, 'success');
                // Re-fetch assets in that module
                const area = document.getElementById(`module-assets-${moduleId}`);
                const mod = allModules.find(m => (m._id || m.id) === moduleId);
                if (area && mod) await loadModuleAssets(moduleId, mod.type, area);
                fetchModules(); // refresh count
            } catch (err) {
                showToast(`Erro: ${err.message}`, 'error');
            }
        },
    };

    App.onPageLoad('modules', loadModules);
})();
