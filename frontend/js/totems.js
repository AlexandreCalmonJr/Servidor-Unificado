// MDM Dashboard — Totems Page
// GET  /api/monitoring/assets?type=totem
// PUT  /api/modules/:moduleId/assets/:assetId
// DEL  /api/modules/:moduleId/assets/:assetId

(() => {
    let allTotems = [];
    let paginator = null;

    function loadTotems() {
        fetchTotems();
        setupSearch();
        setupTotemModal();
    }

    // GET /api/monitoring/assets?type=totem
    async function fetchTotems() {
        const tbody = document.getElementById('totems-table-body');
        if (!tbody) return;

        tbody.innerHTML = `<tr>${skeleton(3, 8)}</tr>`;

        try {
            const data = await API.get('/monitoring/assets?type=totem');
            allTotems = Array.isArray(data) ? data : (data.assets || []);
            initPaginator(allTotems);
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><p>Erro ao carregar totems.</p></td></tr>';
            console.error(err);
        }
    }

    function initPaginator(items) {
        paginator = Paginator(items, {
            perPage: 15,
            onPageChange: (pageItems) => renderTotems(pageItems),
        });
        renderTotems(paginator.getPage());
        paginator.renderControls('totems-pagination');
    }

    function renderTotems(totems) {
        const tbody = document.getElementById('totems-table-body');
        if (!tbody) return;

        if (totems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><div class="empty-icon">🖥️</div><p>Nenhum totem encontrado.</p></td></tr>';
            return;
        }

        // Ensure Actions column header exists
        const thead = document.querySelector('#page-totems thead tr');
        if (thead && !thead.querySelector('th.actions-col')) {
            const th = document.createElement('th');
            th.className = 'actions-col';
            th.textContent = 'Ações';
            thead.appendChild(th);
        }

        tbody.innerHTML = totems.map(t => {
            // Assets from monitoring may have custom_data for totem-specific fields
            const cd = t.custom_data || {};
            const printerStatus = cd.printer_status || t.printer_status || 'N/A';
            const paperStatus = cd.paper_status || t.paper_status || 'N/A';
            const serial = t.serial_number || 'N/A';
            const hostname = t.asset_name || t.hostname || 'N/A';
            const ip = t.ip_address || 'N/A';
            const unit = t.unit || t.sector || t.location || 'N/A';
            const lastUpdate = t.last_seen || t.updatedAt;
            const online = isOnline(lastUpdate);
            const assetId = t._id || t.id;
            const moduleId = t.module_id || '';

            return `
            <tr>
                <td>${esc(hostname)}</td>
                <td class="mono">${esc(serial)}</td>
                <td class="mono">${esc(ip)}</td>
                <td>${esc(unit)}</td>
                <td>${printerBadge(printerStatus)}</td>
                <td>${paperBadge(paperStatus)}</td>
                <td>${online
                    ? '<span class="status-badge online">Online</span>'
                    : '<span class="status-badge offline">Offline</span>'}</td>
                <td>${formatDate(lastUpdate)}</td>
                <td>
                    <button class="btn btn-ghost btn-sm"
                        onclick="TotemManager.edit('${assetId}','${moduleId}')" title="Editar">✏️</button>
                    <button class="btn btn-danger btn-sm"
                        onclick="TotemManager.remove('${assetId}','${moduleId}','${esc(serial)}')" title="Excluir">🗑</button>
                </td>
            </tr>`;
        }).join('');
    }

    function isOnline(lastUpdate) {
        if (!lastUpdate) return false;
        return (Date.now() - new Date(lastUpdate).getTime()) < 10 * 60 * 1000;
    }

    function printerBadge(status) {
        if (!status || status === 'N/A') return '<span class="status-badge pending">N/A</span>';
        const s = status.toLowerCase();
        if (s.includes('ok') || s.includes('ready') || s.includes('normal'))
            return `<span class="status-badge online">${esc(status)}</span>`;
        if (s.includes('error') || s.includes('erro') || s.includes('fail'))
            return `<span class="status-badge offline">${esc(status)}</span>`;
        return `<span class="status-badge warning">${esc(status)}</span>`;
    }

    function paperBadge(status) {
        if (!status || status === 'N/A') return '<span class="status-badge pending">N/A</span>';
        const s = status.toLowerCase();
        if (s.includes('ok') || s.includes('has') || s.includes('normal') || s.includes('present'))
            return `<span class="status-badge online">${esc(status)}</span>`;
        if (s.includes('out') || s.includes('empty') || s.includes('sem') || s.includes('no'))
            return `<span class="status-badge offline">${esc(status)}</span>`;
        return `<span class="status-badge warning">${esc(status)}</span>`;
    }

    // ===== SEARCH =====
    function setupSearch() {
        const input = document.getElementById('totem-search');
        if (!input) return;
        input.addEventListener('input', () => {
            const q = input.value.toLowerCase();
            const filtered = allTotems.filter(t => {
                const hostname = (t.asset_name || t.hostname || '').toLowerCase();
                const serial = (t.serial_number || '').toLowerCase();
                const ip = (t.ip_address || '').toLowerCase();
                const unit = (t.unit || t.sector || t.location || '').toLowerCase();
                return !q || hostname.includes(q) || serial.includes(q) || ip.includes(q) || unit.includes(q);
            });
            initPaginator(filtered);
        });
    }

    // ===== MODAL =====
    function setupTotemModal() {
        const modal = document.getElementById('totem-modal');
        ['totem-modal-close', 'totem-modal-cancel'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => modal.classList.remove('active'));
        });
        if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
        const saveBtn = document.getElementById('totem-modal-save');
        if (saveBtn) saveBtn.addEventListener('click', handleSaveTotem);
    }

    // Populate modal from local allTotems list
    function openTotemModal(assetId, moduleId) {
        const totem = allTotems.find(t => (t._id || t.id) === assetId);
        if (!totem) { showToast('Totem não encontrado.', 'error'); return; }

        const modal = document.getElementById('totem-modal');
        modal.dataset.assetId = assetId;
        modal.dataset.moduleId = moduleId;

        document.getElementById('edit-totem-serial').value = assetId;
        document.getElementById('form-totem-hostname').value = totem.asset_name || totem.hostname || '';
        document.getElementById('form-totem-serial').value = totem.serial_number || '';
        document.getElementById('form-totem-ip').value = totem.ip_address || '';
        document.getElementById('form-totem-notes').value = totem.notes || '';

        modal.classList.add('active');
    }

    // PUT /api/modules/:moduleId/assets/:assetId
    async function handleSaveTotem() {
        const modal = document.getElementById('totem-modal');
        const assetId = modal.dataset.assetId;
        const moduleId = modal.dataset.moduleId;

        if (!moduleId) { showToast('Módulo não identificado.', 'error'); return; }

        const asset_name = document.getElementById('form-totem-hostname').value.trim();
        if (!asset_name) { showToast('Hostname é obrigatório.', 'warning'); return; }

        try {
            await API.put(`/modules/${moduleId}/assets/${assetId}`, {
                asset_name,
                notes: document.getElementById('form-totem-notes').value.trim(),
            });
            showToast('Totem atualizado!', 'success');
            modal.classList.remove('active');
            fetchTotems();
        } catch (e) {
            showToast(`Erro: ${e.message}`, 'error');
        }
    }

    // DELETE /api/modules/:moduleId/assets/:assetId
    async function removeTotem(assetId, moduleId, serial) {
        if (!await confirmAction(`Remover totem ${serial}?`, { danger: true, okText: 'Remover' })) return;
        if (!moduleId) { showToast('Módulo não identificado.', 'error'); return; }
        try {
            await API.delete(`/modules/${moduleId}/assets/${assetId}`);
            showToast('Totem removido.', 'success');
            fetchTotems();
        } catch (e) {
            showToast(`Erro: ${e.message}`, 'error');
        }
    }

    window.TotemManager = {
        edit: openTotemModal,
        remove: removeTotem,
    };

    App.onPageLoad('totems', loadTotems);
})();
