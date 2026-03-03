// MDM Dashboard — Mappings Page (Units + BSSID + IP)

(() => {
    let allUnits = [];
    let allBssids = [];
    let allIps = [];

    function loadMappings() {
        setupTabs();
        setupModals();
        loadUnits();
    }

    // ===== TAB SYSTEM =====
    function setupTabs() {
        document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                const panel = document.getElementById(`tab-${tab}`);
                if (panel) panel.classList.add('active');

                if (tab === 'units') loadUnits();
                else if (tab === 'bssid') loadBssids();
                else if (tab === 'ip') loadIps();
            });
        });
    }

    // =================================================================
    // UNITS
    // =================================================================
    async function loadUnits() {
        const tbody = document.getElementById('units-table-body');
        if (!tbody) return;

        try {
            const data = await API.get('/units');
            allUnits = data.units || (Array.isArray(data) ? data : []);
            renderUnits(allUnits);
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><p>Erro ao carregar unidades.</p></td></tr>';
        }
    }

    function renderUnits(units) {
        const tbody = document.getElementById('units-table-body');
        if (!tbody) return;

        if (units.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><div class="empty-icon">🏢</div><p>Nenhuma unidade cadastrada.</p></td></tr>';
            return;
        }

        tbody.innerHTML = units.map(u => {
            const ranges = (u.ip_ranges || []).map(r => `${r.start} — ${r.end}`).join('<br>');
            return `
        <tr>
          <td><strong>${esc(u.name)}</strong></td>
          <td class="mono" style="font-size: 12px;">${ranges || 'N/A'}</td>
          <td>${formatDate(u.created_at)}</td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="MappingManager.editUnit('${esc(u.name)}')" title="Editar">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="MappingManager.removeUnit('${esc(u.name)}')" title="Excluir">🗑</button>
          </td>
        </tr>
      `;
        }).join('');
    }

    // =================================================================
    // BSSID
    // =================================================================
    async function loadBssids() {
        const tbody = document.getElementById('bssid-table-body');
        if (!tbody) return;

        try {
            const data = await API.get('/bssid-mappings');
            allBssids = Array.isArray(data) ? data : (data.mappings || []);
            renderBssids(allBssids);
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>Erro ao carregar BSSIDs.</p></td></tr>';
        }
    }

    function renderBssids(bssids) {
        const tbody = document.getElementById('bssid-table-body');
        if (!tbody) return;

        if (bssids.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-icon">📡</div><p>Nenhum BSSID mapeado.</p></td></tr>';
            return;
        }

        tbody.innerHTML = bssids.map(b => `
      <tr>
        <td class="mono">${esc(b.mac_address_radio)}</td>
        <td>${esc(b.sector)}</td>
        <td>${esc(b.floor)}</td>
        <td>${esc(b.unitName || 'N/A')}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="MappingManager.removeBssid('${esc(b.mac_address_radio)}')" title="Excluir">🗑</button>
        </td>
      </tr>
    `).join('');
    }

    // =================================================================
    // IP MAPPINGS
    // =================================================================
    async function loadIps() {
        const tbody = document.getElementById('ip-table-body');
        if (!tbody) return;

        try {
            const data = await API.get('/monitoring/ip-mappings');
            allIps = Array.isArray(data) ? data : (data.mappings || []);
            renderIps(allIps);
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><p>Erro ao carregar IPs.</p></td></tr>';
        }
    }

    function renderIps(ips) {
        const tbody = document.getElementById('ip-table-body');
        if (!tbody) return;

        if (ips.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><div class="empty-icon">🌐</div><p>Nenhum mapeamento de IP.</p></td></tr>';
            return;
        }

        tbody.innerHTML = ips.map(m => `
      <tr>
        <td>${esc(m.location)}</td>
        <td class="mono">${esc(m.ipStart)}</td>
        <td class="mono">${esc(m.ipEnd)}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="MappingManager.removeIp('${m._id}')" title="Excluir">🗑</button>
        </td>
      </tr>
    `).join('');
    }

    // =================================================================
    // MODALS SETUP
    // =================================================================
    function setupModals() {
        // Unit modal
        setupModal('unit-modal', 'add-unit-btn', 'unit-modal-close', 'unit-modal-cancel');
        const unitSave = document.getElementById('unit-modal-save');
        if (unitSave) unitSave.addEventListener('click', handleSaveUnit);

        // BSSID modal
        setupModal('bssid-modal', 'add-bssid-btn', 'bssid-modal-close', 'bssid-modal-cancel');
        const bssidSave = document.getElementById('bssid-modal-save');
        if (bssidSave) bssidSave.addEventListener('click', handleSaveBssid);

        // IP modal
        setupModal('ip-modal', 'add-ip-btn', 'ip-modal-close', 'ip-modal-cancel');
        const ipSave = document.getElementById('ip-modal-save');
        if (ipSave) ipSave.addEventListener('click', handleSaveIp);

        // Add range button
        const addRangeBtn = document.getElementById('add-ip-range-btn');
        if (addRangeBtn) addRangeBtn.addEventListener('click', addIpRangeRow);
    }

    function setupModal(modalId, openBtnId, closeBtnId, cancelBtnId) {
        const modal = document.getElementById(modalId);
        const openBtn = document.getElementById(openBtnId);
        const closeBtn = document.getElementById(closeBtnId);
        const cancelBtn = document.getElementById(cancelBtnId);

        if (openBtn) openBtn.addEventListener('click', () => {
            modal.classList.add('active');
            // Populate unit select for BSSID modal
            if (modalId === 'bssid-modal') populateUnitSelect();
        });
        [closeBtn, cancelBtn].forEach(b => {
            if (b) b.addEventListener('click', () => modal.classList.remove('active'));
        });
        if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
    }

    async function populateUnitSelect() {
        const select = document.getElementById('form-bssid-unit');
        if (!select) return;
        select.innerHTML = '<option value="">Sem unidade</option>';
        try {
            const data = await API.get('/units');
            const units = data.units || [];
            units.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.name;
                opt.textContent = u.name;
                select.appendChild(opt);
            });
        } catch (e) { /* ignore */ }
    }

    // ===== SAVE HANDLERS =====
    async function handleSaveUnit() {
        const name = document.getElementById('form-unit-name').value.trim();
        const rangeRows = document.querySelectorAll('.ip-range-row');
        const ip_ranges = [];

        rangeRows.forEach(row => {
            const start = row.querySelector('.range-start')?.value.trim();
            const end = row.querySelector('.range-end')?.value.trim();
            if (start && end) ip_ranges.push({ start, end });
        });

        if (!name || ip_ranges.length === 0) {
            showToast('Nome e pelo menos uma faixa de IP são obrigatórios.', 'warning');
            return;
        }

        const editName = document.getElementById('edit-unit-name')?.value;

        try {
            if (editName) {
                await API.put(`/units/${encodeURIComponent(editName)}`, { name, ip_ranges });
                showToast('Unidade atualizada.', 'success');
            } else {
                await API.post('/units', { name, ip_ranges });
                showToast('Unidade criada.', 'success');
            }
            document.getElementById('unit-modal').classList.remove('active');
            loadUnits();
        } catch (err) {
            showToast(`Erro: ${err.message}`, 'error');
        }
    }

    async function handleSaveBssid() {
        const mac = document.getElementById('form-bssid-mac').value.trim();
        const sector = document.getElementById('form-bssid-sector').value.trim();
        const floor = document.getElementById('form-bssid-floor').value.trim();
        const unitName = document.getElementById('form-bssid-unit').value;

        if (!mac || !sector || !floor) {
            showToast('MAC, setor e andar são obrigatórios.', 'warning');
            return;
        }

        try {
            await API.post('/bssid-mappings', { mac_address_radio: mac, sector, floor, unitName });
            showToast('BSSID mapeado.', 'success');
            document.getElementById('bssid-modal').classList.remove('active');
            loadBssids();
        } catch (err) {
            showToast(`Erro: ${err.message}`, 'error');
        }
    }

    async function handleSaveIp() {
        const location = document.getElementById('form-ip-location').value.trim();
        const ipStart = document.getElementById('form-ip-start').value.trim();
        const ipEnd = document.getElementById('form-ip-end').value.trim();

        if (!location || !ipStart || !ipEnd) {
            showToast('Localização, IP inicial e final são obrigatórios.', 'warning');
            return;
        }

        try {
            await API.post('/monitoring/ip-mappings', { location, ipStart, ipEnd });
            showToast('IP mapeado.', 'success');
            document.getElementById('ip-modal').classList.remove('active');
            loadIps();
        } catch (err) {
            showToast(`Erro: ${err.message}`, 'error');
        }
    }

    // ===== IP RANGE DYNAMIC ROWS =====
    function addIpRangeRow() {
        const container = document.getElementById('ip-ranges-container');
        if (!container) return;
        const row = document.createElement('div');
        row.className = 'ip-range-row';
        row.innerHTML = `
      <input type="text" class="range-start" placeholder="IP Inicial (ex: 192.168.1.1)">
      <span style="color: var(--text-muted);">—</span>
      <input type="text" class="range-end" placeholder="IP Final (ex: 192.168.1.254)">
      <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">×</button>
    `;
        container.appendChild(row);
    }

    // ===== EXPOSED ACTIONS =====
    window.MappingManager = {
        editUnit: (name) => {
            const unit = allUnits.find(u => u.name === name);
            if (!unit) return;
            const modal = document.getElementById('unit-modal');
            const titleEl = document.getElementById('unit-modal-title');
            const editEl = document.getElementById('edit-unit-name');
            const nameInput = document.getElementById('form-unit-name');
            const rangeContainer = document.getElementById('ip-ranges-container');

            if (titleEl) titleEl.textContent = 'Editar Unidade';
            if (editEl) editEl.value = name;
            if (nameInput) nameInput.value = name;

            // Populate ranges
            if (rangeContainer) {
                rangeContainer.innerHTML = '';
                (unit.ip_ranges || []).forEach(r => {
                    const row = document.createElement('div');
                    row.className = 'ip-range-row';
                    row.innerHTML = `
            <input type="text" class="range-start" placeholder="IP Inicial" value="${esc(r.start)}">
            <span style="color: var(--text-muted);">—</span>
            <input type="text" class="range-end" placeholder="IP Final" value="${esc(r.end)}">
            <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">×</button>
          `;
                    rangeContainer.appendChild(row);
                });
            }
            modal.classList.add('active');
        },

        removeUnit: async (name) => {
            if (!await confirmAction(`Excluir a unidade "${name}"?`, { danger: true, okText: 'Excluir' })) return;
            try {
                await API.delete(`/units/${encodeURIComponent(name)}`);
                showToast(`Unidade "${name}" excluída.`, 'success');
                loadUnits();
            } catch (err) {
                showToast(`Erro: ${err.message}`, 'error');
            }
        },

        removeBssid: async (mac) => {
            if (!await confirmAction(`Excluir BSSID "${mac}"?`, { danger: true, okText: 'Excluir' })) return;
            try {
                await API.delete(`/bssid-mappings/${encodeURIComponent(mac)}`);
                showToast('BSSID excluído.', 'success');
                loadBssids();
            } catch (err) {
                showToast(`Erro: ${err.message}`, 'error');
            }
        },

        removeIp: async (id) => {
            if (!await confirmAction('Excluir este mapeamento de IP?', { danger: true, okText: 'Excluir' })) return;
            try {
                await API.delete(`/monitoring/ip-mappings/${id}`);
                showToast('Mapeamento excluído.', 'success');
                loadIps();
            } catch (err) {
                showToast(`Erro: ${err.message}`, 'error');
            }
        },
    };

    App.onPageLoad('mappings', loadMappings);
})();
