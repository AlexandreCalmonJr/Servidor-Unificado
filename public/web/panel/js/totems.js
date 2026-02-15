// MDM Dashboard — Totems Page

(() => {
    let allTotems = [];

    function loadTotems() {
        fetchTotems();
        setupSearch();
    }

    async function fetchTotems() {
        const tbody = document.getElementById('totems-table-body');
        if (!tbody) return;

        try {
            // Try the totems-specific endpoint first, then monitoring fallback
            let data;
            try {
                data = await API.get('/totems/totems');
            } catch {
                data = await API.get('/monitoring/totems');
            }

            allTotems = Array.isArray(data) ? data : (data.totems || data.data || []);
            renderTotems(allTotems);
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><p>Erro ao carregar totems.</p></td></tr>';
            console.error('Erro ao carregar totems:', err);
        }
    }

    function renderTotems(totems) {
        const tbody = document.getElementById('totems-table-body');
        if (!tbody) return;

        if (totems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><div class="empty-icon">🖥️</div><p>Nenhum totem encontrado.</p></td></tr>';
            return;
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
            renderTotems(filtered);
        });
    }

    App.onPageLoad('totems', loadTotems);
})();
