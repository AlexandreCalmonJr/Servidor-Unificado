// MDM Dashboard — App Controller

const App = (() => {
    let currentPage = 'dashboard';
    const printerSubPages = new Set(['printers-list', 'printers-details', 'printers-stock', 'printers-supplies', 'printers-history', 'printers-alerts']);
    const printerViewByPage = {
        'printers-list': 'list',
        'printers-details': 'details',
        'printers-stock': 'stock',
        'printers-supplies': 'supplies',
        'printers-history': 'history',
        'printers-alerts': 'alerts',
    };

    const pageTitles = {
        dashboard: 'Dashboard',
        devices: 'Dispositivos Móveis',
        totems: 'Totems',
        modules: 'Módulos',
        commands: 'Comandos Remotos',
        provisioning: 'Provisionamento',
        profiles: 'Perfis de Configuração',
        mappings: 'Mapeamentos',
        diagnostics: 'Diagnósticos',
        users: 'Usuários',
        server: 'Servidor & APKs',
        reports: 'Relatórios',
        printers: 'Impressoras',
        'printers-list': 'Impressoras - Lista',
        'printers-details': 'Impressoras - Detalhes',
        'printers-stock': 'Impressoras - Estoque',
        'printers-supplies': 'Impressoras - Insumos',
        'printers-history': 'Impressoras - Historico',
        'printers-alerts': 'Impressoras - Alertas',
    };

    const pageLoaders = {};

    function init() {
        checkAuth();
        setupNavigation();
        setupSidebar();
        setupMobile();
        setupLogout();
        loadUserInfo();

        if (window.lucide) window.lucide.createIcons();
        if (pageLoaders.dashboard) pageLoaders.dashboard();
        if ((currentPage === 'printers' || printerSubPages.has(currentPage)) && pageLoaders.printers) {
            pageLoaders.printers();
        }
    }

    function checkAuth() {
        if (!API.getToken()) window.location.href = '/panel/login.html';
    }

    function loadUserInfo() {
        const stored = localStorage.getItem('mdm_user');
        if (stored) {
            try { displayUser(JSON.parse(stored)); } catch (e) { /* ignore */ }
        }

        API.get('/auth/verify')
            .then(data => {
                const user = data.user || data;
                localStorage.setItem('mdm_user', JSON.stringify(user));
                displayUser(user);
            })
            .catch(() => { /* handled by 401 in api.js */ });
    }

    function displayUser(user) {
        const nameEl = document.getElementById('user-display-name');
        const roleEl = document.getElementById('user-display-role');
        const avatarEl = document.getElementById('user-avatar');

        if (nameEl) nameEl.textContent = user.username || 'Usuário';
        if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Administrador' : 'Usuário';
        if (avatarEl) avatarEl.textContent = (user.username || 'U').substring(0, 2).toUpperCase();
    }

    function setupNavigation() {
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.addEventListener('click', () => navigateTo(item.dataset.page));
        });

        document.querySelectorAll('.nav-subitem[data-page]').forEach(item => {
            item.addEventListener('click', (event) => {
                event.stopPropagation();
                navigateTo(item.dataset.page);
            });
        });
    }

    function navigateTo(page) {
        if (!pageTitles[page]) return;
        currentPage = page;
        const rootPage = printerSubPages.has(page) ? 'printers' : page;
        window.__printersView = printerViewByPage[page] || 'list';

        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.classList.toggle('active', item.dataset.page === rootPage);
        });
        document.querySelectorAll('.nav-subitem[data-page]').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
        document.getElementById(`page-${rootPage}`)?.classList.add('active');

        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = pageTitles[page];

        closeMobileMenu();
        if (pageLoaders[rootPage]) pageLoaders[rootPage]();
    }

    function setupSidebar() {
        const toggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
            });
            if (localStorage.getItem('sidebar_collapsed') === 'true') {
                sidebar.classList.add('collapsed');
            }
        }
    }

    function setupMobile() {
        const menuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-overlay');

        menuBtn?.addEventListener('click', () => {
            sidebar?.classList.add('mobile-open');
            overlay?.classList.add('active');
        });
        overlay?.addEventListener('click', closeMobileMenu);
    }

    function closeMobileMenu() {
        document.getElementById('sidebar')?.classList.remove('mobile-open');
        document.getElementById('mobile-overlay')?.classList.remove('active');
    }

    function setupLogout() {
        document.getElementById('logout-btn')?.addEventListener('click', async () => {
            await API.logout();
            window.location.href = '/panel/login.html';
        });
    }

    function onPageLoad(page, callback) {
        pageLoaders[page] = callback;
    }

    // Carrega uma view de impressoras (cada subpagina em seu proprio HTML)
    let currentPrintersViewLoaded = null;
    onPageLoad('printers', async () => {
        const contentArea = document.getElementById('page-content');
        if (!contentArea) return;

        try {
            const view = window.__printersView || 'list';
            const viewPathByKey = {
                list: '/views/printers-list.html',
                details: '/views/printers-details.html',
                stock: '/views/printers-stock.html',
                supplies: '/views/printers-supplies.html',
                history: '/views/printers-history.html',
                alerts: '/views/printers-alerts.html',
            };
            const viewPath = viewPathByKey[view] || viewPathByKey.list;

            if (currentPrintersViewLoaded !== view) {
                const response = await fetch(`${viewPath}?v=${Date.now()}`, { cache: 'no-store' });
                const html = await response.text();
                contentArea.innerHTML = html;
                currentPrintersViewLoaded = view;
            }

            const cssId = 'printers-dashboard-css';
            if (!document.getElementById(cssId)) {
                const link = document.createElement('link');
                link.id = cssId;
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = '/css/printers-dashboard.css';
                document.head.appendChild(link);
            }

            if (typeof initPrintersDashboard === 'function') {
                initPrintersDashboard();
            } else if (!document.querySelector('script[data-printers-dashboard="1"]')) {
                const script = document.createElement('script');
                script.src = `/js/printers-dashboard.js?v=${Date.now()}`;
                script.dataset.printersDashboard = '1';
                script.onload = () => {
                    if (typeof initPrintersDashboard === 'function') initPrintersDashboard();
                };
                document.body.appendChild(script);
            }
        } catch (error) {
            console.error('Erro ao carregar dashboard de impressoras:', error);
            contentArea.innerHTML = '<p>Erro ao carregar o dashboard de impressoras.</p>';
        }
    });

    return { init, navigateTo, onPageLoad };
})();

// ===== TOAST =====
// Única implementação canônica. toast-notifications.js também define window.showToast —
// este arquivo é carregado ANTES, então toast-notifications.js vai sobrescrever.
// A assinatura unificada é: showToast(message, type = 'info', duration = 4000)
// toast-notifications.js respeita essa assinatura via seu wrapper global.
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ===== UTILITIES =====
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatUptime(seconds) {
    if (!seconds || seconds < 0) return '--';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function formatSize(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0, size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(1)} ${units[i]}`;
}

function getBarColor(value) {
    if (value >= 90) return 'red';
    if (value >= 70) return 'yellow';
    return 'green';
}

function esc(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

function statusBadge(status) {
    if (!status) return '<span class="status-badge pending">N/A</span>';
    const map = {
        active: 'online', online: 'online', completed: 'online',
        offline: 'offline', inactive: 'offline', failed: 'offline',
        pending: 'pending', provisioning: 'pending',
        maintenance: 'maintenance', warning: 'warning',
        expired: 'offline', used: 'pending',
    };
    const cls = map[status.toLowerCase()] || 'pending';
    return `<span class="status-badge ${cls}">${esc(status)}</span>`;
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setBar(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.style.width = `${Math.min(value, 100)}%`;
        el.className = `progress-bar-fill ${getBarColor(value)}`;
    }
}

// ===== GLOBAL SEARCH =====
(() => {
    let searchTimeout = null;

    document.addEventListener('DOMContentLoaded', () => {
        const input = document.getElementById('global-search-input');
        const results = document.getElementById('global-search-results');
        if (!input || !results) return;

        input.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const q = input.value.trim();
            if (q.length < 2) { results.style.display = 'none'; return; }
            searchTimeout = setTimeout(() => runSearch(q), 300);
        });

        input.addEventListener('blur', () => setTimeout(() => { results.style.display = 'none'; }, 200));
        input.addEventListener('focus', () => {
            if (input.value.trim().length >= 2) runSearch(input.value.trim());
        });
    });

    async function runSearch(query) {
        const results = document.getElementById('global-search-results');
        const q = query.toLowerCase();
        const items = [];

        try {
            const [assetsResult, modulesResult] = await Promise.allSettled([
                API.get('/monitoring/assets'),
                API.get('/modules'),
            ]);

            if (assetsResult.status === 'fulfilled') {
                const list = Array.isArray(assetsResult.value)
                    ? assetsResult.value
                    : (assetsResult.value.assets || []);

                list.filter(a =>
                    (a.asset_name || a.name || '').toLowerCase().includes(q) ||
                    (a.serial_number || '').toLowerCase().includes(q) ||
                    (a.ip_address || '').toLowerCase().includes(q)
                ).slice(0, 6).forEach(a => {
                    const typeIconMap = { mobile: '📱', totem: '🖥️', desktop: '💻', notebook: '💻', printer: '🖨️' };
                    const icon = typeIconMap[a.asset_type] || '📦';
                    const page = a.asset_type === 'mobile' ? 'devices' : a.asset_type === 'totem' ? 'totems' : 'modules';
                    items.push({ icon, label: a.asset_name || a.name || 'N/A', sub: a.serial_number || a.asset_type, page });
                });
            }

            if (modulesResult.status === 'fulfilled') {
                const list = modulesResult.value.modules || [];
                list.filter(m =>
                    (m.name || '').toLowerCase().includes(q) ||
                    (m.type || '').toLowerCase().includes(q)
                ).slice(0, 3).forEach(m => {
                    items.push({ icon: '📦', label: m.name, sub: m.type, page: 'modules' });
                });
            }
        } catch (e) { /* ignore */ }

        if (items.length === 0) {
            results.innerHTML = '<div class="search-item" style="color:var(--text-muted);">Nenhum resultado</div>';
        } else {
            results.innerHTML = items.map(i => `
                <div class="search-item" data-page="${i.page}">
                    <span>${i.icon}</span>
                    <div>
                        <strong>${esc(i.label)}</strong>
                        <div style="font-size:11px;color:var(--text-muted);">${esc(i.sub)}</div>
                    </div>
                </div>`).join('');

            results.querySelectorAll('.search-item[data-page]').forEach(el => {
                el.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    App.navigateTo(el.dataset.page);
                    results.style.display = 'none';
                    document.getElementById('global-search-input').value = '';
                });
            });
        }
        results.style.display = 'block';
    }
})();

// ===== PAGINATOR =====
function Paginator(items, opts = {}) {
    const perPage = opts.perPage || 15;
    let currentPage = 1;
    const totalPages = () => Math.max(1, Math.ceil(items.length / perPage));
    let container = null;

    return {
        getPage() {
            const start = (currentPage - 1) * perPage;
            return items.slice(start, start + perPage);
        },
        currentPage() { return currentPage; },
        totalPages,
        setPage(p) { currentPage = Math.max(1, Math.min(p, totalPages())); },
        renderControls(containerId) {
            if (containerId) container = containerId;
            const el = document.getElementById(container);
            if (!el) return; // ← silencioso se container não existir

            const tp = totalPages();
            if (tp <= 1) { el.innerHTML = ''; return; }

            let html = '<div class="pagination">';
            html += `<button class="btn btn-ghost btn-sm" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;

            let range = [];
            if (tp <= 7) range = Array.from({ length: tp }, (_, i) => i + 1);
            else if (currentPage <= 4) range = [1, 2, 3, 4, 5, '...', tp];
            else if (currentPage >= tp - 3) range = [1, '...', tp - 4, tp - 3, tp - 2, tp - 1, tp];
            else range = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', tp];

            range.forEach(p => {
                if (p === '...') html += '<span class="pagination-ellipsis">…</span>';
                else html += `<button class="btn btn-sm ${p === currentPage ? 'btn-primary' : 'btn-ghost'}" data-page="${p}">${p}</button>`;
            });

            html += `<button class="btn btn-ghost btn-sm" data-page="${currentPage + 1}" ${currentPage === tp ? 'disabled' : ''}>›</button>`;
            html += `<span class="pagination-info">${items.length} itens</span>`;
            html += '</div>';
            el.innerHTML = html;

            el.querySelectorAll('button[data-page]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const p = parseInt(btn.dataset.page);
                    if (!isNaN(p)) {
                        this.setPage(p);
                        this.renderControls(container);
                        if (opts.onPageChange) opts.onPageChange(this.getPage(), this);
                    }
                });
            });
        },
    };
}

// ===== SKELETON =====
function skeleton(rows = 5, cols = 4) {
    let html = '';
    for (let r = 0; r < rows; r++) {
        html += '<tr class="skeleton-row">';
        for (let c = 0; c < cols; c++) {
            const w = 50 + Math.random() * 40;
            html += `<td><div class="skeleton-line" style="width:${w}%"></div></td>`;
        }
        html += '</tr>';
    }
    return html;
}

// ===== CONFIRM MODAL =====
// ─── CORREÇÃO: implementação própria que não depende de modal no HTML ─────
// Cria o modal dinamicamente na primeira chamada e reutiliza nas seguintes.
function confirmAction(message, opts = {}) {
    return new Promise((resolve) => {
        // Reutiliza modal existente ou cria um novo
        let modal = document.getElementById('confirm-modal');

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'confirm-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-box" style="max-width:420px;">
                    <div class="modal-header">
                        <h3 id="confirm-modal-title">Confirmar ação</h3>
                        <button class="modal-close" id="confirm-modal-close">×</button>
                    </div>
                    <div class="modal-body">
                        <p id="confirm-modal-message" style="color:var(--text-secondary);line-height:1.5;"></p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-ghost" id="confirm-modal-cancel">Cancelar</button>
                        <button class="btn btn-primary" id="confirm-modal-ok">Confirmar</button>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }

        const msgEl = modal.querySelector('#confirm-modal-message');
        const btnOk = modal.querySelector('#confirm-modal-ok');
        const btnCancel = modal.querySelector('#confirm-modal-cancel');
        const closeBtn = modal.querySelector('#confirm-modal-close');

        msgEl.textContent = message;
        btnOk.textContent = opts.okText || 'Confirmar';
        btnOk.className = `btn ${opts.danger ? 'btn-danger' : 'btn-primary'}`;

        modal.classList.add('active');

        function cleanup(result) {
            modal.classList.remove('active');
            btnOk.removeEventListener('click', onOk);
            btnCancel.removeEventListener('click', onCancel);
            closeBtn.removeEventListener('click', onCancel);
            modal.removeEventListener('click', onBackdrop);
            resolve(result);
        }

        const onOk = () => cleanup(true);
        const onCancel = () => cleanup(false);
        const onBackdrop = (e) => { if (e.target === modal) cleanup(false); };

        btnOk.addEventListener('click', onOk);
        btnCancel.addEventListener('click', onCancel);
        closeBtn.addEventListener('click', onCancel);
        modal.addEventListener('click', onBackdrop);
    });
}

document.addEventListener('DOMContentLoaded', () => App.init());
