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

            tbody.innerHTML = recent.map(d => {
                let statusColor = 'bg-slate-500/10 text-slate-400';
                const st = (d.provisioning_status || d.status || 'unknown').toLowerCase();

                if (['online', 'active', 'completed'].includes(st)) statusColor = 'bg-emerald-500/10 text-emerald-400';
                else if (['offline', 'failed', 'error'].includes(st)) statusColor = 'bg-red-500/10 text-red-400';
                else if (['pending', 'in_progress', 'warning'].includes(st)) statusColor = 'bg-amber-500/10 text-amber-400';
                else if (['maintenance'].includes(st)) statusColor = 'bg-purple-500/10 text-purple-400';

                return `
                <tr class="hover:bg-slate-800/50 transition-colors" data-device-id="${d._id || d.id}">
                    <td class="p-4 border-b border-slate-800 text-white font-medium">${esc(d.device_name || d.name || 'N/A')}</td>
                    <td class="p-4 border-b border-slate-800 font-mono text-xs">${esc(d.serial_number || d.serialNumber || 'N/A')}</td>
                    <td class="p-4 border-b border-slate-800">${formatDate(d.last_seen || d.lastSeen || d.updatedAt)}</td>
                    <td class="p-4 border-b border-slate-800">${esc(d.sector || d.location || 'N/A')}</td>
                    <td class="p-4 border-b border-slate-800">
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}">
                            ${st}
                        </span>
                    </td>
                </tr>
                `;
            }).join('');
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
                // Map legacy types to Lucide icon names
                const iconMap = {
                    mobile: 'smartphone', totem: 'monitor', desktop: 'monitor', notebook: 'laptop',
                    panel: 'tv', printer: 'printer', scanner: 'scan', custom: 'settings'
                };
                const iconName = iconMap[item.type] || 'box';

                return `
                <div class="bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-slate-700 transition-colors group">
                    <div class="flex justify-between items-start mb-3">
                        <span class="text-slate-400 text-sm font-medium uppercase tracking-wider">${esc(item.name)}</span>
                        <div class="p-2 rounded-lg bg-slate-800 text-slate-400 group-hover:text-white transition-colors">
                            <i data-lucide="${iconName}" size="18"></i>
                        </div>
                    </div>
                    <div class="text-3xl font-bold text-white mb-3">${s.total}</div>
                    <div class="flex items-center gap-3 text-xs font-medium">
                        <span class="flex items-center gap-1 text-emerald-400">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ${s.online}
                        </span>
                        <span class="flex items-center gap-1 text-red-400">
                            <span class="w-1.5 h-1.5 rounded-full bg-red-400"></span> ${s.offline}
                        </span>
                    </div>
                </div>
                `;
            }).join('');

            // Re-initialize icons for new content
            if (window.lucide) window.lucide.createIcons();

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
