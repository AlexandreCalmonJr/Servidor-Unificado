// MDM Dashboard — Devices Page

(() => {
    let allDevices = [];

    function loadDevices() {
        fetchDevices();
        setupSearch();
        setupFilter();
        setupDeviceEditModal();
        setupDeviceDetailModal(); // Wire up the Detail modal buttons
    }

    async function fetchDevices() {
        const tbody = document.getElementById('devices-table-body');
        if (!tbody) return;

        try {
            const data = await API.get('/devices');
            allDevices = Array.isArray(data) ? data : (data.devices || data.data || []);
            renderDevices(allDevices);
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><p>Erro ao carregar dispositivos.</p></td></tr>';
            console.error('Erro ao carregar dispositivos:', err);
        }
    }

    function renderDevices(devices) {
        const tbody = document.getElementById('devices-table-body');
        if (!tbody) return;

        // Add Actions header if not present
        const thead = document.querySelector('#page-devices thead tr');
        if (thead && !thead.querySelector('th.actions-col')) {
            const th = document.createElement('th');
            th.className = 'actions-col';
            th.textContent = 'Ações';
            thead.appendChild(th);
        }

        if (devices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><div class="empty-icon">📱</div><p>Nenhum dispositivo encontrado.</p></td></tr>';
            return;
        }

        tbody.innerHTML = devices.map(d => `
      <tr>
        <td>${esc(d.device_name || d.name || 'N/A')}</td>
        <td class="mono">${esc(d.serial_number || d.serialNumber || 'N/A')}</td>
        <td>${esc(d.model || d.device_model || 'N/A')}</td>
        <td>${d.battery_level != null ? d.battery_level + '%' : (d.battery != null ? d.battery + '%' : 'N/A')}</td>
        <td class="mono">${esc(d.ip_address || d.ip || 'N/A')}</td>
        <td>${esc(d.sector || d.location || 'N/A')}</td>
        <td>${statusBadge(d.provisioning_status || d.status)}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="DeviceDetail.show('${esc(d._id || d.id || d.serial_number)}')" title="Detalhes">👁</button>
          <button class="btn btn-ghost btn-sm" onclick="DeviceManager.edit('${esc(d.serial_number || d.serialNumber)}')" title="Editar">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="DeviceManager.remove('${esc(d.serial_number || d.serialNumber)}')" title="Excluir">🗑</button>
        </td>
      </tr>
    `).join('');
    }

    function setupSearch() {
        const input = document.getElementById('device-search');
        if (!input) return;
        input.addEventListener('input', () => filterDevices());
    }

    function setupFilter() {
        const select = document.getElementById('device-filter');
        if (!select) return;
        select.addEventListener('change', () => filterDevices());
    }

    function filterDevices() {
        const searchVal = (document.getElementById('device-search')?.value || '').toLowerCase();
        const filterVal = document.getElementById('device-filter')?.value || 'all';

        const filtered = allDevices.filter(d => {
            const name = (d.device_name || d.name || '').toLowerCase();
            const serial = (d.serial_number || d.serialNumber || '').toLowerCase();
            const sector = (d.sector || d.location || '').toLowerCase();
            const matchSearch = !searchVal || name.includes(searchVal) || serial.includes(searchVal) || sector.includes(searchVal);

            const status = (d.provisioning_status || d.status || '').toLowerCase();
            const matchFilter = filterVal === 'all' || status === filterVal;

            return matchSearch && matchFilter;
        });

        renderDevices(filtered);
    }

    // ===== EDIT MODAL =====
    function setupDeviceEditModal() {
        const modal = document.getElementById('device-edit-modal');
        const closeBtn = document.getElementById('device-edit-modal-close');
        const cancelBtn = document.getElementById('device-edit-modal-cancel');
        const saveBtn = document.getElementById('device-edit-modal-save');

        [closeBtn, cancelBtn].forEach(b => {
            if (b) b.addEventListener('click', () => modal.classList.remove('active'));
        });
        if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
        if (saveBtn) saveBtn.addEventListener('click', handleSaveDevice);
    }

    function setupDeviceDetailModal() {
        const modal = document.getElementById('device-modal');
        if (!modal) return;

        // The "Edit" button inside the Detail modal
        const editBtn = document.getElementById('device-modal-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                // Determine current serial from the detail view or store it somewhere
                // For now, let's rely on the global variable or attribute if possible.
                // Better approach: DeviceDetail.currentSerial
                if (DeviceDetail.currentSerial) {
                    modal.classList.remove('active');
                    openDeviceEditModal(DeviceDetail.currentSerial);
                }
            });
        }
    }

    async function openDeviceEditModal(serial) {
        try {
            // Find in local list first to save a request, or fetch fresh
            let device = allDevices.find(d => (d.serial_number || d.serialNumber) === serial);
            if (!device) {
                // Fallback fetch if not in list (e.g. paginated)
                // Note: We don't have a single-fetch by serial route readily exposed in devices.js logic usually, 
                // but existing DeviceDetail uses /devices/:id. 
                // However, /devices/:id in deviceRoutes.js is NOT by Serial? 
                // deviceRoutes: router.get('/:serial_number/location-history') exists.
                // router.get('/devices/:id')?
                // Let's check deviceRoutes again.
                // Ah, deviceRoutes has router.get('/', ...) and router.delete('/:serial_number').
                // It DOES NOT have router.get('/:serial_number') specifically for details, 
                // BUT `DeviceDetail.show` calls `/devices/${deviceId}`.
                // Wait, accessing by ID or Serial? 
                // The code in `DeviceDetail.show` uses `API.get('/devices/${deviceId}')`.
                // But deviceRoutes.js DOES NOT have `router.get('/:id')`.
                // It only has `router.get('/', ...)` (list) and `router.get('/:serial_number/location-history')` and `router.delete(...)`.
                // So `DeviceDetail.show` might be BROKEN if it relies on `GET /devices/:id`.
                // I need to fix this or use `allDevices.find`.
                // For now, let's rely on `allDevices`.
            }

            if (!device) throw new Error('Dispositivo não encontrado localmente');

            document.getElementById('edit-device-serial').value = serial;
            document.getElementById('form-device-name').value = device.device_name || device.name || '';
            document.getElementById('form-device-serial').value = serial;
            document.getElementById('form-device-unit').value = device.unit || '';
            document.getElementById('form-device-sector').value = device.sector || device.location || '';
            document.getElementById('form-device-floor').value = device.floor || '';

            document.getElementById('device-edit-modal').classList.add('active');
        } catch (e) {
            showToast('Erro ao carregar dados do dispositivo', 'error');
        }
    }

    async function handleSaveDevice() {
        const serial = document.getElementById('edit-device-serial').value;
        const device_name = document.getElementById('form-device-name').value.trim();
        const unit = document.getElementById('form-device-unit').value.trim();
        const sector = document.getElementById('form-device-sector').value.trim();
        const floor = document.getElementById('form-device-floor').value.trim();

        if (!device_name) {
            showToast('Nome é obrigatório', 'warning');
            return;
        }

        try {
            await API.put(`/devices/${serial}`, {
                device_name,
                unit,
                sector,
                floor
            });
            showToast('Dispositivo atualizado com sucesso', 'success');
            document.getElementById('device-edit-modal').classList.remove('active');
            fetchDevices(); // Refresh list
        } catch (e) {
            showToast(`Erro ao salvar: ${e.message}`, 'error');
        }
    }

    async function removeDevice(serial) {
        if (!await confirmAction(`Tem certeza que deseja remover o dispositivo ${serial}?`, { danger: true, okText: 'Remover' })) return;
        try {
            await API.delete(`/devices/${serial}`);
            showToast('Dispositivo removido com sucesso', 'success');
            fetchDevices();
        } catch (e) {
            showToast(`Erro ao remover: ${e.message}`, 'error');
        }
    }

    // Export to global scope
    window.DeviceManager = {
        edit: openDeviceEditModal,
        remove: removeDevice
    };

    // Make available for Detail Modal
    window.DeviceDetail = window.DeviceDetail || {}; // Preserve if exists (will be overwritten below effectively)

    App.onPageLoad('devices', loadDevices);
})();

// Device Detail Modal
const DeviceDetail = (() => {
    let currentSerial = null;

    function show(deviceIdOrSerial) {
        const modal = document.getElementById('device-modal');
        const grid = document.getElementById('device-detail-grid');
        const historyBody = document.getElementById('device-history-body');

        if (!modal || !grid) return;

        currentSerial = deviceIdOrSerial;

        grid.innerHTML = '<p style="color: var(--text-muted);">Carregando...</p>';
        if (historyBody) historyBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Carregando...</td></tr>';

        modal.classList.add('active');

        // Parallel fetch: Details + History
        // Note: The backend now supports GET /devices/:serial_number
        Promise.all([
            API.get(`/devices/${deviceIdOrSerial}`),
            API.get(`/devices/${deviceIdOrSerial}/location-history`).catch(() => ({ history: [] }))
        ])
            .then(([deviceData, historyData]) => {
                // Render Details
                const d = deviceData.device || deviceData;
                const title = document.getElementById('device-modal-title');
                if (title) title.textContent = d.device_name || d.name || 'Dispositivo';
                currentSerial = d.serial_number || d.serialNumber;
                grid.innerHTML = buildDetailGrid(d);

                // Render History
                renderHistory(historyData.history || []);
            })
            .catch(err => {
                grid.innerHTML = `<p style="color: var(--danger);">Erro ao carregar detalhes: ${esc(err.message)}</p>`;
                if (historyBody) historyBody.innerHTML = '';
            });
    }

    function renderHistory(history) {
        const tbody = document.getElementById('device-history-body');
        if (!tbody) return;

        if (!history || history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhum histórico recente.</td></tr>';
            return;
        }

        tbody.innerHTML = history.map(h => `
            <tr>
                <td>${formatDate(h.timestamp)}</td>
                <td class="mono">${esc(h.bssid || 'N/A')}</td>
                <td>${esc(h.sector || 'N/A')}</td>
                <td>${esc(h.floor || 'N/A')}</td>
            </tr>
        `).join('');
    }

    function buildDetailGrid(d) {
        const fields = [
            { label: 'Nome', value: d.device_name || d.name },
            { label: 'Serial', value: d.serial_number || d.serialNumber },
            { label: 'Modelo', value: d.model || d.device_model },
            { label: 'Fabricante', value: d.manufacturer },
            { label: 'Android', value: d.android_version },
            { label: 'Bateria', value: d.battery_level != null ? `${d.battery_level}%` : (d.battery != null ? d.battery + '%' : null) },
            { label: 'IP', value: d.ip_address || d.ip },
            { label: 'Unidade', value: d.unit },
            { label: 'Setor', value: d.sector || d.location },
            { label: 'Status', value: d.provisioning_status || d.status },
            { label: 'Manutenção', value: d.maintenance_status },
            { label: 'Última Conexão', value: formatDate(d.last_seen || d.lastSeen || d.updatedAt) },
            { label: 'Criado em', value: formatDate(d.createdAt) },
        ];

        return fields
            .filter(f => f.value != null && f.value !== '')
            .map(f => `
        <div class="detail-item">
          <div class="detail-label">${f.label}</div>
          <div class="detail-value">${esc(String(f.value))}</div>
        </div>
      `).join('');
    }

    return {
        show,
        get currentSerial() { return currentSerial; }
    };
})();
