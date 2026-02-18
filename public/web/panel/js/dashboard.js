// MDM Dashboard — Dashboard Page

(() => {
    let refreshInterval = null;
    let statusChart = null;
    let resourceChart = null;

    function loadDashboard() {
        loadMetrics();
        loadRecentDevices();
        loadDeviceStatusChart();
        loadModuleStats();

        // Auto-refresh every 30s
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(() => {
            loadMetrics();
            loadDeviceStatusChart();
            loadModuleStats();
        }, 30000);
    }

    async function loadMetrics() {
        try {
            const data = await API.get('/server/status');

            setText('m-devices', data.device_count ?? '--');
            setText('m-provisioned', data.provisioned_devices ?? '--');
            setText('m-commands', data.pending_commands ?? '--');

            const cpu = data.cpu_usage ?? 0;
            const mem = data.memory_usage ?? 0;

            setText('m-cpu', `${cpu.toFixed(1)}%`);
            setText('m-memory', `${mem.toFixed(1)}%`);

            setBar('m-cpu-bar', cpu);
            setBar('m-memory-bar', mem);

            const uptime = data.uptime ?? 0;
            setText('m-uptime', formatUptime(uptime));

            // Topbar server status
            const dot = document.getElementById('server-status-dot');
            const uptimeEl = document.getElementById('server-uptime');
            if (dot) dot.className = 'status-dot';
            if (uptimeEl) uptimeEl.textContent = formatUptime(uptime);

            // Sub-texts
            const devSub = document.getElementById('m-devices-sub');
            if (devSub) devSub.textContent = 'registrados';
            const provSub = document.getElementById('m-provisioned-sub');
            if (provSub) provSub.textContent = `de ${data.device_count ?? 0}`;

            // Resource chart
            renderResourceChart(cpu, mem);

        } catch (err) {
            console.error('Erro ao carregar métricas:', err);
        }
    }

    async function loadDeviceStatusChart() {
        const canvas = document.getElementById('chart-status');
        if (!canvas || typeof Chart === 'undefined') return;

        try {
            const devices = await API.get('/devices');
            const list = Array.isArray(devices) ? devices : (devices.devices || devices.data || []);

            const counts = {};
            list.forEach(d => {
                const st = d.provisioning_status || d.status || 'unknown';
                counts[st] = (counts[st] || 0) + 1;
            });

            const labels = Object.keys(counts);
            const values = Object.values(counts);
            const colors = labels.map(l => {
                const map = {
                    completed: '#22c55e', active: '#22c55e', online: '#22c55e',
                    pending: '#f59e0b', in_progress: '#f59e0b',
                    failed: '#ef4444', offline: '#ef4444',
                    maintenance: '#8b5cf6',
                };
                return map[l] || '#64748b';
            });

            if (statusChart) statusChart.destroy();
            statusChart = new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#94a3b8', font: { size: 11 }, padding: 12 },
                        },
                    },
                    cutout: '65%',
                },
            });
        } catch (err) {
            console.error('Erro no gráfico de status:', err);
        }
    }

    function renderResourceChart(cpu, mem) {
        const canvas = document.getElementById('chart-resources');
        if (!canvas || typeof Chart === 'undefined') return;

        if (resourceChart) resourceChart.destroy();
        resourceChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: ['CPU', 'Memória'],
                datasets: [{
                    data: [cpu, mem],
                    backgroundColor: ['#3b82f6', '#8b5cf6'],
                    borderRadius: 8,
                    barThickness: 50,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { color: '#64748b', callback: v => v + '%' },
                        grid: { color: 'rgba(100,116,139,0.15)' },
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false },
                    },
                },
                plugins: { legend: { display: false } },
            },
        });
    }

    async function loadRecentDevices() {
        const tbody = document.getElementById('recent-devices-body');
        if (!tbody) return;

        try {
            const devices = await API.get('/devices');
            const list = Array.isArray(devices) ? devices : (devices.devices || devices.data || []);
            const recent = list.slice(0, 5);

            if (recent.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-icon">📱</div><p>Nenhum dispositivo encontrado.</p></td></tr>';
                return;
            }

            tbody.innerHTML = recent.map(d => `
        <tr data-device-id="${d._id || d.id}">
          <td>${esc(d.device_name || d.name || 'N/A')}</td>
          <td class="mono">${esc(d.serial_number || d.serialNumber || 'N/A')}</td>
          <td>${formatDate(d.last_seen || d.lastSeen || d.updatedAt)}</td>
          <td>${esc(d.sector || d.location || 'N/A')}</td>
          <td><span class="status-badge ${d.provisioning_status || d.status}">${d.provisioning_status || d.status}</span></td>
        </tr>
      `).join('');
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>Erro ao carregar dispositivos.</p></td></tr>';
            console.error('Erro ao carregar dispositivos recentes:', err);
        }
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-metrics-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadMetrics();
            loadRecentDevices();
            loadDeviceStatusChart();
            showToast('Métricas atualizadas', 'success', 2000);
        });
    }

    async function loadModuleStats() {
        const grid = document.getElementById('module-stats-grid');
        if (!grid) return;

        try {
            // 1. Fetch active modules
            const modulesData = await API.get('/modules');
            const modules = modulesData.modules || [];

            if (modules.length === 0) {
                grid.innerHTML = '<div class="metric-card"><div class="metric-sub">Nenhum módulo ativo</div></div>';
                return;
            }

            // 2. Fetch stats for each module in parallel
            const statsPromises = modules.map(m =>
                API.get(`/modules/${m._id || m.id}/stats`)
                    .then(stats => ({ ...m, stats }))
                    .catch(err => ({ ...m, stats: null, error: err }))
            );

            const results = await Promise.all(statsPromises);

            // 3. Render cards
            grid.innerHTML = results.map(item => {
                const s = item.stats || { total: 0, online: 0, offline: 0 };
                const icon = getModuleIcon(item.type);

                return `
                <div class="metric-card" style="border-left: 4px solid var(--primary);">
                    <div class="metric-header">
                        <span class="metric-label" style="font-weight:600;">${esc(item.name)}</span>
                        <span class="metric-icon">${icon}</span>
                    </div>
                    <div class="metric-value" style="font-size: 2rem;">${s.total}</div>
                    <div class="metric-sub" style="display:flex; gap:10px; margin-top:4px;">
                        <span style="color:var(--success)">● ${s.online} Online</span>
                        <span style="color:var(--danger)">● ${s.offline} Offline</span>
                    </div>
                </div>
                `;
            }).join('');

        } catch (err) {
            console.error('Erro ao carregar stats dos módulos:', err);
            grid.innerHTML = '<div class="metric-card"><div class="metric-sub">Erro ao carregar dados</div></div>';
        }
    }

    function getModuleIcon(type) {
        const icons = {
            mobile: '📱', totem: '🖥️', desktop: '💻', notebook: '💻',
            panel: '📺', printer: '🖨️', scanner: '📠', custom: '⚙️'
        };
        return icons[type] || '📦';
    }

    // Expose for WebSocket
    const originalRefresh = window.DashboardRefresh;
    window.DashboardRefresh = () => {
        if (originalRefresh) originalRefresh();
        loadModuleStats();
    };

    App.onPageLoad('dashboard', loadDashboard);
})();
