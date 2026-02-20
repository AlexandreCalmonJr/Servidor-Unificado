// MDM Dashboard — Totems Page

(() => {
    let allTotems = [];

    function loadTotems() {
        fetchTotems();
        setupSearch();
        setupTotemModal();
    }

    let paginator = null;

    async function fetchTotems() {
        const tbody = document.getElementById('totems-table-body');
        if (!tbody) return;

        try {
            // ✅ CONSOLIDADO: Usar /api/modules/totem/assets em vez de /api/totems
            let data;
            try {
                data = await API.get('/modules/totem/assets');
                allTotems = data.assets || data.data || [];
            } catch {
                // Fallback para monitoramento
                data = await API.get('/monitoring/totems');
                allTotems = Array.isArray(data) ? data : (data.totems || data.data || []);
            }

            initPaginator(allTotems);
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><p>Erro ao carregar totems.</p></td></tr>';
            console.error('Erro ao carregar totems:', err);
        }
    }

    function initPaginator(items) {
        paginator = Paginator(items, {
            perPage: 15,
            onPageChange: (pageItems) => renderTotems(pageItems)
        });
        renderTotems(paginator.getPage());
        paginator.renderControls('totems-pagination');
    }

    function renderTotems(totems) {
        const tbody = document.getElementById('totems-table-body');
        if (!tbody) return;

        if (totems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><div class="empty-icon">🖥️</div><p>Nenhum totem encontrado.</p></td></tr>';
            return;
        }

        // Add Actions header if not present
        const thead = document.querySelector('#page-totems thead tr');
        if (thead && !thead.querySelector('th.actions-col')) {
            const th = document.createElement('th');
            th.className = 'actions-col';
            th.textContent = 'Ações';
            thead.appendChild(th);
        }

        tbody.innerHTML = totems.map(t => {
            const printerStatus = t.printerStatus || t.printer_status || 'N/A';
            const paperStatus = t.paperStatus || t.paper_status || 'N/A';
            const serial = t.serialNumber || t.serial_number || 'N/A';
            const hostname = t.hostname || t.device_name || 'N/A';
            const ip = t.ip || t.ip_address || 'N/A';
            const unit = t.unit || t.location || t.sector || 'N/A';
            const lastUpdate = t.updatedAt || t.last_seen || t.lastUpdate;
            const online = isOnline(lastUpdate);

            return `
        <tr>
          <td>${esc(hostname)}</td>
          <td class="mono">${esc(serial)}</td>
          <td class="mono">${esc(ip)}</td>
          <td>${esc(unit)}</td>
          <td>${printerBadge(printerStatus)}</td>
          <td>${paperBadge(paperStatus)}</td>
          <td>${online ? '<span class="status-badge online">Online</span>' : '<span class="status-badge offline">Offline</span>'}</td>
          <td>${formatDate(lastUpdate)}</td>
          <td>
             <button class="btn btn-ghost btn-sm" onclick="TotemManager.edit('${esc(serial)}')" title="Editar">✏️</button>
             <button class="btn btn-danger btn-sm" onclick="TotemManager.remove('${esc(serial)}')" title="Excluir">🗑</button>
          </td>
        </tr>
      `;
        }).join('');
    }

    function isOnline(lastUpdate) {
        if (!lastUpdate) return false;
        const diff = Date.now() - new Date(lastUpdate).getTime();
        return diff < 10 * 60 * 1000; // 10 minutes threshold
    }

    function printerBadge(status) {
        if (!status || status === 'N/A') return '<span class="status-badge pending">N/A</span>';
        const s = status.toLowerCase();
        if (s.includes('ok') || s.includes('ready') || s.includes('normal')) {
            return `<span class="status-badge online">${esc(status)}</span>`;
        }
        if (s.includes('error') || s.includes('erro') || s.includes('fail')) {
            return `<span class="status-badge offline">${esc(status)}</span>`;
        }
        return `<span class="status-badge warning">${esc(status)}</span>`;
    }

    function paperBadge(status) {
        if (!status || status === 'N/A') return '<span class="status-badge pending">N/A</span>';
        const s = status.toLowerCase();
        if (s.includes('ok') || s.includes('has') || s.includes('normal') || s.includes('present')) {
            return `<span class="status-badge online">${esc(status)}</span>`;
        }
        if (s.includes('out') || s.includes('empty') || s.includes('sem') || s.includes('no')) {
            return `<span class="status-badge offline">${esc(status)}</span>`;
        }
        return `<span class="status-badge warning">${esc(status)}</span>`;
    }

    function setupSearch() {
        const input = document.getElementById('totem-search');
        if (!input) return;
        input.addEventListener('input', () => {
            const q = input.value.toLowerCase();
            const filtered = allTotems.filter(t => {
                const hostname = (t.hostname || t.device_name || '').toLowerCase();
                const serial = (t.serialNumber || t.serial_number || '').toLowerCase();
                const ip = (t.ip || '').toLowerCase();
                const unit = (t.unit || t.location || '').toLowerCase();
                return !q || hostname.includes(q) || serial.includes(q) || ip.includes(q) || unit.includes(q);
            });

            initPaginator(filtered);
        });
    }

    // ===== MODAL & CRUD =====
    function setupTotemModal() {
        const modal = document.getElementById('totem-modal');
        const closeBtn = document.getElementById('totem-modal-close');
        const cancelBtn = document.getElementById('totem-modal-cancel');
        const saveBtn = document.getElementById('totem-modal-save');

        [closeBtn, cancelBtn].forEach(b => {
            if (b) b.addEventListener('click', () => modal.classList.remove('active'));
        });
        if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
        if (saveBtn) saveBtn.addEventListener('click', handleSaveTotem);
    }

    async function openTotemModal(serial) {
        try {
            // ✅ CONSOLIDADO: Usar /modules/totem/assets/{id}
            const totem = await API.get(`/modules/totem/assets/${serial}`);
            if (!totem) throw new Error('Totem não encontrado');

            document.getElementById('edit-totem-serial').value = serial;
            document.getElementById('form-totem-hostname').value = totem.hostname || totem.device_name || '';
            document.getElementById('form-totem-serial').value = totem.serialNumber || totem.serial_number || '';
            document.getElementById('form-totem-ip').value = totem.ip || totem.ip_address || '';
            document.getElementById('form-totem-notes').value = totem.notes || '';

            document.getElementById('totem-modal').classList.add('active');
        } catch (e) {
            showToast('Erro ao carregar dados do totem', 'error');
        }
    }

    async function handleSaveTotem() {
        const serial = document.getElementById('edit-totem-serial').value;
        const hostname = document.getElementById('form-totem-hostname').value.trim();
        const notes = document.getElementById('form-totem-notes').value.trim();

        if (!hostname) {
            showToast('Hostname é obrigatório', 'warning');
            return;
        }

        try {
            // ✅ CONSOLIDADO: Usar /modules/totem/assets/{id}
            await API.put(`/modules/totem/assets/${serial}`, {
                hostname,
                notes
            });
            showToast('Totem atualizado com sucesso', 'success');
            document.getElementById('totem-modal').classList.remove('active');
            fetchTotems();
        } catch (e) {
            showToast(`Erro ao salvar: ${e.message}`, 'error');
        }
    }

    async function removeTotem(serial) {
        if (!await confirmAction(`Tem certeza que deseja remover o totem ${serial}?`, { danger: true, okText: 'Remover' })) return;
        try {
            // ✅ CONSOLIDADO: Usar /modules/totem/assets/{id}
            await API.delete(`/modules/totem/assets/${serial}`);
            showToast('Totem removido com sucesso', 'success');
            fetchTotems();
        } catch (e) {
            showToast(`Erro ao remover: ${e.message}`, 'error');
        }
    }

    // Export to global scope
    window.TotemManager = {
        edit: openTotemModal,
        remove: removeTotem
    };

    App.onPageLoad('totems', loadTotems);
})();
