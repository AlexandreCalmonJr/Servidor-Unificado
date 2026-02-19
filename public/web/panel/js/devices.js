// MDM Dashboard — Devices Page

(() => {
    let allDevices = [];

    function loadDevices() {
        setupDeviceEditModal();
        setupDeviceDetailModal();
        setupSearch();
        setupFilter();
        setupActionDelegation();
        fetchDevices();
    }

    let paginator = null;

    async function fetchDevices() {
        const tbody = document.getElementById('devices-table-body');
        if (!tbody) return;

        try {
            const data = await API.get('/devices');
            allDevices = Array.isArray(data) ? data : (data.devices || data.data || []);

            // Init paginator
            initPaginator(allDevices);
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-red-400"><p>Erro ao carregar dispositivos.</p></td></tr>';
            console.error('Erro ao carregar dispositivos:', err);
        }
    }

    function initPaginator(items) {
        paginator = Paginator(items, {
            perPage: 15,
            onPageChange: (pageItems) => renderDevices(pageItems)
        });
        renderDevices(paginator.getPage());
        paginator.renderControls('devices-pagination');
    }

    function renderDevices(devices) {
        const tbody = document.getElementById('devices-table-body');
        if (!tbody) return;

        // Add Actions header if not present (handled in EJS now, but safe to keep check or remove logic if strictly adhering to EJS)
        // Ignoring the header injection since EJS now has it fixed.

        if (devices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-slate-500"><div class="flex flex-col items-center gap-2"><i data-lucide="smartphone" size="32" class="opacity-50"></i><p>Nenhum dispositivo encontrado.</p></div></td></tr>';
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        tbody.innerHTML = devices.map(d => {
            let statusColor = 'bg-slate-500/10 text-slate-400';
            const st = (d.provisioning_status || d.status || 'unknown').toLowerCase();
            if (['online', 'active', 'completed'].includes(st)) statusColor = 'bg-emerald-500/10 text-emerald-400';
            else if (['offline', 'failed', 'error'].includes(st)) statusColor = 'bg-red-500/10 text-red-400';
            else if (['pending', 'in_progress', 'warning'].includes(st)) statusColor = 'bg-amber-500/10 text-amber-400';
            else if (['maintenance'].includes(st)) statusColor = 'bg-purple-500/10 text-purple-400';

            return `
            <tr class="hover:bg-slate-800/50 transition-colors group" data-device-id="${d._id || d.id}">
                <td class="p-4 border-b border-slate-800">
                    <div class="font-medium text-white">${esc(d.device_name || d.name || d.model || d.device_model || d.serial_number || d.serialNumber || 'Dispositivo sem nome')}</div>
                </td>
                <td class="p-4 border-b border-slate-800 font-mono text-xs text-slate-400">${esc(d.serial_number || d.serialNumber || 'N/A')}</td>
                <td class="p-4 border-b border-slate-800">${esc(d.model || d.device_model || 'N/A')}</td>
                <td class="p-4 border-b border-slate-800">
                    <div class="flex items-center gap-1">
                        <i data-lucide="battery" size="14" class="${(d.battery_level < 20 ? 'text-red-400' : 'text-slate-500')}"></i>
                        <span>${d.battery_level != null ? d.battery_level + '%' : (d.battery != null ? d.battery + '%' : 'N/A')}</span>
                    </div>
                </td>
                <td class="p-4 border-b border-slate-800 font-mono text-xs">${esc(d.ip_address || d.ip || 'N/A')}</td>
                <td class="p-4 border-b border-slate-800">${esc(d.sector || d.location || 'N/A')}</td>
                <td class="p-4 border-b border-slate-800">
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}">
                        ${st}
                    </span>
                </td>
                <td class="p-4 border-b border-slate-800 text-right">
                    <div class="flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors" data-action="view" data-id="${esc(d._id || d.id || d.serial_number)}" title="Detalhes"><i data-lucide="eye" size="16"></i></button>
                        <button class="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" data-action="edit" data-serial="${esc(d.serial_number || d.serialNumber)}" title="Editar"><i data-lucide="edit-2" size="16"></i></button>
                        <button class="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors" data-action="install_apk" data-serial="${esc(d.serial_number || d.serialNumber)}" title="Instalar APK"><i data-lucide="download" size="16"></i></button>
                        <button class="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors" data-action="restart" data-serial="${esc(d.serial_number || d.serialNumber)}" title="Reiniciar App"><i data-lucide="rotate-cw" size="16"></i></button>
                        <button class="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" data-action="delete" data-serial="${esc(d.serial_number || d.serialNumber)}" title="Excluir"><i data-lucide="trash-2" size="16"></i></button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
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

        // Re-init paginator with filtered results
        initPaginator(filtered);
    }

    // ===== ACTION DELEGATION (CSP-safe) =====
    function setupActionDelegation() {
        const tbody = document.getElementById('devices-table-body');
        if (!tbody || tbody.dataset.delegated) return;
        tbody.dataset.delegated = 'true';
        tbody.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            if (action === 'view') DeviceDetail.show(btn.dataset.id);
            else if (action === 'edit') openDeviceEditModal(btn.dataset.serial);
            else if (action === 'delete') removeDevice(btn.dataset.serial);
            else if (action === 'install_apk') promptInstallApk(btn.dataset.serial);
            else if (action === 'restart') confirmRestart(btn.dataset.serial);
        });
    }

    async function promptInstallApk(serial) {
        const url = prompt(`Digite a URL do APK para instalar em ${serial}:`);
        if (!url) return;

        try {
            await API.post('/devices/executeCommand', {
                serial_number: serial,
                command: 'install_apk',
                apkUrl: url
            });
            showToast('Comando de instalação enviado!', 'success');
        } catch (e) {
            showToast(`Erro ao enviar comando: ${e.message}`, 'error');
        }
    }

    async function confirmRestart(serial) {
        if (!confirm(`Deseja reiniciar o aplicativo no dispositivo ${serial}?`)) return;

        try {
            await API.post('/devices/executeCommand', {
                serial_number: serial,
                command: 'restart_app'
            });
            showToast('Comando de reinício enviado!', 'success');
        } catch (e) {
            showToast(`Erro ao enviar comando: ${e.message}`, 'error');
        }
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

        // Close buttons (x and Fechar)
        const closeBtn = document.getElementById('device-modal-close');
        const closeBtnFooter = document.getElementById('device-modal-close-btn');
        [closeBtn, closeBtnFooter].forEach(b => {
            if (b) b.addEventListener('click', () => modal.classList.remove('active'));
        });

        // Close on overlay click
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

        // The "Edit" button inside the Detail modal
        const editBtn = document.getElementById('device-modal-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
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
        if (!await confirmAction(`Tem certeza que deseja remover o dispositivo móvel ${serial}?`, { danger: true, okText: 'Remover' })) return;
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
                if (title) title.textContent = d.device_name || d.name || 'Dispositivo Móvel';
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
