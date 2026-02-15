// MDM Dashboard — Devices Page

(() => {
    let allDevices = [];

    function loadDevices() {
        fetchDevices();
        setupSearch();
        setupFilter();
    }

    async function fetchDevices() {
        const tbody = document.getElementById('devices-table-body');
        if (!tbody) return;

        try {
            const data = await API.get('/devices');
            allDevices = Array.isArray(data) ? data : (data.devices || data.data || []);
            renderDevices(allDevices);
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><p>Erro ao carregar dispositivos.</p></td></tr>';
            console.error('Erro ao carregar dispositivos:', err);
        }
    }

    function renderDevices(devices) {
        const tbody = document.getElementById('devices-table-body');
        if (!tbody) return;

        if (devices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><div class="empty-icon">📱</div><p>Nenhum dispositivo encontrado.</p></td></tr>';
            return;
        }

        tbody.innerHTML = devices.map(d => `
      <tr>
        <td>${esc(d.device_name || d.name || 'N/A')}</td>
        <td class="mono">${esc(d.serial_number || d.serialNumber || 'N/A')}</td>
        <td>${esc(d.model || 'N/A')}</td>
        <td>${d.battery_level != null ? d.battery_level + '%' : 'N/A'}</td>
        <td class="mono">${esc(d.ip_address || d.ip || 'N/A')}</td>
        <td>${esc(d.sector || d.location || 'N/A')}</td>
        <td>${statusBadge(d.provisioning_status || d.status)}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="DeviceDetail.show('${esc(d._id || d.id)}')">👁 Ver</button>
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

    App.onPageLoad('devices', loadDevices);
})();

// Device Detail Modal
const DeviceDetail = (() => {
    function show(deviceId) {
        const modal = document.getElementById('device-modal');
        const grid = document.getElementById('device-detail-grid');
        if (!modal || !grid) return;

        grid.innerHTML = '<p style="color: var(--text-muted);">Carregando...</p>';
        modal.classList.add('active');

        API.get(`/devices/${deviceId}`)
            .then(data => {
                const d = data.device || data;
                const title = document.getElementById('device-modal-title');
                if (title) title.textContent = d.device_name || d.name || 'Dispositivo';

                grid.innerHTML = buildDetailGrid(d);
            })
            .catch(err => {
                grid.innerHTML = `<p style="color: var(--danger);">Erro: ${esc(err.message)}</p>`;
            });
    }

    function buildDetailGrid(d) {
        const fields = [
            { label: 'Nome', value: d.device_name || d.name },
            { label: 'Serial', value: d.serial_number || d.serialNumber },
            { label: 'Modelo', value: d.model },
            { label: 'Fabricante', value: d.manufacturer },
            { label: 'Android', value: d.android_version },
            { label: 'Bateria', value: d.battery_level != null ? `${d.battery_level}%` : null },
            { label: 'IP', value: d.ip_address || d.ip },
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

    // Close handlers
    document.addEventListener('DOMContentLoaded', () => {
        const modal = document.getElementById('device-modal');
        const closeBtn = document.getElementById('device-modal-close');
        const closeBtnFooter = document.getElementById('device-modal-close-btn');

        [closeBtn, closeBtnFooter].forEach(btn => {
            if (btn) btn.addEventListener('click', () => modal.classList.remove('active'));
        });

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        }
    });

    return { show };
})();
