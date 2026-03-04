// MDM Dashboard — Dashboard Page

(() => {
    // ─── CORREÇÃO: guardamos o ID do interval para poder cancelar corretamente.
    // O interval anterior era limpo apenas no início de loadDashboard(), o que
    // não funcionava se o usuário saísse da página sem voltar — múltiplos
    // intervals se acumulavam silenciosamente. Agora usamos um único slot
    // e fazemos cleanup via visibilitychange + navegação.
    let refreshIntervalId = null;
    let statusChart = null;
    let resourceChart = null;

    function startAutoRefresh() {
        stopAutoRefresh();
        refreshIntervalId = setInterval(() => {
            loadMetrics();
            loadAssetStatusChart();
            loadModuleStats();
        }, 30000);
    }

    function stopAutoRefresh() {
        if (refreshIntervalId !== null) {
            clearInterval(refreshIntervalId);
            refreshIntervalId = null;
        }
    }

    // Para o refresh quando a aba fica oculta e retoma quando volta
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAutoRefresh();
        } else if (document.getElementById('page-dashboard')?.classList.contains('active')) {
            loadDashboard();
        }
    });

    function loadDashboard() {
        loadMetrics();
        loadRecentAssets();
        loadAssetStatusChart();
        loadModuleStats();
        startAutoRefresh();
    }

    async function loadMetrics() {
        try {
            const data = await API.get('/server/status');

            setText('m-devices', data.asset_count ?? data.device_count ?? '--');
            setText('m-provisioned', data.provisioned_devices ?? '--');
            setText('m-commands', data.pending_commands ?? '--');

            const cpu = data.cpu_usage ?? 0;
            const mem = data.memory_usage ?? 0;

            setText('m-cpu', `${cpu.toFixed(1)}%`);
            setText('m-memory', `${mem.toFixed(1)}%`);

            setBar('m-cpu-bar', cpu);
            setBar('m-memory-bar', mem);

            const uptime = data.uptime ?? 0;
            const uptimeFmt = formatUptime(uptime);
            setText('m-uptime', uptimeFmt);

            const dot = document.getElementById('server-status-dot');
            const uptimeEl = document.getElementById('server-uptime');
            if (dot) dot.className = 'status-dot';
            if (uptimeEl) uptimeEl.textContent = uptimeFmt;

            const devSub = document.getElementById('m-devices-sub');
            const provSub = document.getElementById('m-provisioned-sub');
            if (devSub) devSub.textContent = 'ativos registrados';
            if (provSub) provSub.textContent = `de ${data.asset_count ?? data.device_count ?? 0}`;

            renderResourceChart(cpu, mem);
        } catch (err) {
            console.error('Erro ao carregar métricas:', err);
        }
    }

    async function loadAssetStatusChart() {
        const canvas = document.getElementById('chart-status');
        if (!canvas || typeof Chart === 'undefined') return;

        try {
            const data = await API.get('/monitoring/assets');
            const list = Array.isArray(data) ? data : (data.assets || []);

            const counts = {};
            list.forEach(a => {
                const st = a.status || 'unknown';
                counts[st] = (counts[st] || 0) + 1;
            });

            const labels = Object.keys(counts);
            const values = Object.values(counts);
            const colors = labels.map(l => {
                const map = {
                    active: '#22c55e', online: '#22c55e', completed: '#22c55e',
                    pending: '#f59e0b', in_progress: '#f59e0b', warning: '#f59e0b',
                    failed: '#ef4444', offline: '#ef4444', inactive: '#ef4444',
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
                        beginAtZero: true, max: 100,
                        ticks: { color: '#64748b', callback: v => v + '%' },
                        grid: { color: 'rgba(100,116,139,0.15)' },
                    },
                    x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
                },
                plugins: { legend: { display: false } },
            },
        });
    }

    async function loadRecentAssets() {
        const tbody = document.getElementById('recent-devices-body');
        if (!tbody) return;

        try {
            const data = await API.get('/monitoring/assets');
            const list = Array.isArray(data) ? data : (data.assets || []);
            const recent = list.slice(0, 5);

            if (recent.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-icon">📦</div><p>Nenhum ativo encontrado.</p></td></tr>';
                return;
            }

            tbody.innerHTML = recent.map(a => {
                const st = (a.status || 'unknown').toLowerCase();
                let statusColor = 'bg-slate-500/10 text-slate-400';
                if (['online', 'active', 'completed'].includes(st)) statusColor = 'bg-emerald-500/10 text-emerald-400';
                else if (['offline', 'failed', 'error', 'inactive'].includes(st)) statusColor = 'bg-red-500/10 text-red-400';
                else if (['pending', 'warning'].includes(st)) statusColor = 'bg-amber-500/10 text-amber-400';
                else if (st === 'maintenance') statusColor = 'bg-purple-500/10 text-purple-400';

                return `
                <tr data-asset-id="${a._id || a.id}">
                    <td>${esc(a.asset_name || a.name || 'N/A')}</td>
                    <td class="mono text-xs">${esc(a.serial_number || 'N/A')}</td>
                    <td>${formatDate(a.last_seen || a.updatedAt)}</td>
                    <td>${esc(a.sector || a.location || 'N/A')}</td>
                    <td><span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}">${st}</span></td>
                </tr>`;
            }).join('');
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>Erro ao carregar ativos.</p></td></tr>';
        }
    }

    const refreshBtn = document.getElementById('refresh-metrics-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadMetrics();
            loadRecentAssets();
            loadAssetStatusChart();
            showToast('Métricas atualizadas', 'success', 2000);
        });
    }

    async function loadModuleStats() {
        const grid = document.getElementById('dashboard-module-stats');
        if (!grid) return;

        try {
            const modulesData = await API.get('/modules');
            const modules = modulesData.modules || [];

            if (modules.length === 0) {
                grid.innerHTML = '<div class="metric-card"><div class="metric-sub">Nenhum módulo ativo</div></div>';
                return;
            }

            const statsPromises = modules.map(m =>
                API.get(`/modules/${m._id || m.id}/stats`)
                    .then(stats => ({ ...m, stats }))
                    .catch(() => ({ ...m, stats: { total: 0, online: 0, offline: 0 } }))
            );

            const results = await Promise.all(statsPromises);

            const typeIcons = {
                mobile: '📱', totem: '🖥️', desktop: '💻', notebook: '💻',
                panel: '📺', printer: '🖨️', scanner: '📠', custom: '⚙️',
            };

            grid.innerHTML = results.map(item => {
                const s = item.stats || { total: 0, online: 0, offline: 0 };
                const icon = typeIcons[item.type] || '📦';
                return `
                <div class="module-stat-card" style="border-left-color: var(--accent);">
                    <div class="module-stat-icon" style="background: var(--accent-dim); color: var(--accent);">${icon}</div>
                    <div class="module-stat-info">
                        <span class="module-stat-label">${esc(item.name)}</span>
                        <span class="module-stat-value" style="color: var(--text-primary);">${s.total}</span>
                    </div>
                    <div style="margin-left: auto; display: flex; gap: 10px; font-size: 0.75rem; font-weight: 600;">
                        <span style="color: var(--success);">🟢 ${s.online}</span>
                        <span style="color: var(--danger);">🔴 ${s.offline}</span>
                    </div>
                </div>`;
            }).join('');
        } catch (err) {
            console.error('Erro ao carregar stats dos módulos:', err);
        }
    }

    // Exposto para o WebSocket client atualizar o dashboard em tempo real
    window.DashboardRefresh = () => {
        loadMetrics();
        loadModuleStats();
    };

    App.onPageLoad('dashboard', loadDashboard);
})();