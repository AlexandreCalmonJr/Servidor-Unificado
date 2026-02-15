// MDM Dashboard — App Controller

const App = (() => {
    let currentPage = 'dashboard';

    // Page titles map
    const pageTitles = {
        dashboard: 'Dashboard',
        devices: 'Dispositivos',
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
    };

    // Page load callbacks
    const pageLoaders = {};

    function init() {
        checkAuth();
        setupNavigation();
        setupSidebar();
        setupMobile();
        setupLogout();
        loadUserInfo();

        // Trigger initial page load
        if (pageLoaders.dashboard) pageLoaders.dashboard();
    }

    function checkAuth() {
        if (!API.getToken()) {
            window.location.href = 'login.html';
        }
    }

    function loadUserInfo() {
        const stored = localStorage.getItem('mdm_user');
        if (stored) {
            try {
                const user = JSON.parse(stored);
                displayUser(user);
            } catch (e) { /* ignore parse errors */ }
        }

        // Also verify token and get fresh data
        API.get('/auth/verify')
            .then(data => {
                if (data.user || data) {
                    const user = data.user || data;
                    localStorage.setItem('mdm_user', JSON.stringify(user));
                    displayUser(user);
                }
            })
            .catch(() => {
                // Token invalid — will be caught by API 401 handler
            });
    }

    function displayUser(user) {
        const nameEl = document.getElementById('user-display-name');
        const roleEl = document.getElementById('user-display-role');
        const avatarEl = document.getElementById('user-avatar');

        if (nameEl) nameEl.textContent = user.username || 'Usuário';
        if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Administrador' : 'Usuário';
        if (avatarEl) {
            const initials = (user.username || 'U').substring(0, 2).toUpperCase();
            avatarEl.textContent = initials;
        }
    }

    function setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item[data-page]');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                navigateTo(page);
            });
        });
    }

    function navigateTo(page) {
        if (!pageTitles[page]) return;
        currentPage = page;

        // Update nav active state
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Update page sections
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.remove('active');
        });
        const target = document.getElementById(`page-${page}`);
        if (target) target.classList.add('active');

        // Update title
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = pageTitles[page];

        // Close mobile menu
        closeMobileMenu();

        // Load page data
        if (pageLoaders[page]) pageLoaders[page]();
    }

    function setupSidebar() {
        const toggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
            });

            // Restore state
            if (localStorage.getItem('sidebar_collapsed') === 'true') {
                sidebar.classList.add('collapsed');
            }
        }
    }

    function setupMobile() {
        const menuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-overlay');

        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                sidebar.classList.add('mobile-open');
                overlay.classList.add('active');
            });
        }

        if (overlay) {
            overlay.addEventListener('click', closeMobileMenu);
        }
    }

    function closeMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-overlay');
        if (sidebar) sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('active');
    }

    function setupLogout() {
        const btn = document.getElementById('logout-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                API.clearAuth();
                window.location.href = 'login.html';
            });
        }
    }

    // Register page loader
    function onPageLoad(page, callback) {
        pageLoaders[page] = callback;
    }

    return { init, navigateTo, onPageLoad };
})();

// Toast notification system
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

// Utility: format date
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// Utility: format uptime
function formatUptime(seconds) {
    if (!seconds || seconds < 0) return '--';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

// Utility: format file size
function formatSize(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
}

// Utility: get color class for progress bar based on value
function getBarColor(value) {
    if (value >= 90) return 'red';
    if (value >= 70) return 'yellow';
    return 'green';
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

        input.addEventListener('blur', () => {
            setTimeout(() => { results.style.display = 'none'; }, 200);
        });

        input.addEventListener('focus', () => {
            if (input.value.trim().length >= 2) runSearch(input.value.trim());
        });
    });

    async function runSearch(query) {
        const results = document.getElementById('global-search-results');
        const q = query.toLowerCase();
        const items = [];

        try {
            const [devData, modData] = await Promise.allSettled([
                API.get('/devices'),
                API.get('/modules'),
            ]);

            if (devData.status === 'fulfilled') {
                const list = Array.isArray(devData.value) ? devData.value : (devData.value.devices || []);
                list.filter(d =>
                    (d.device_name || '').toLowerCase().includes(q) ||
                    (d.serial_number || '').toLowerCase().includes(q) ||
                    (d.ip_address || '').toLowerCase().includes(q)
                ).slice(0, 5).forEach(d => {
                    items.push({
                        icon: '📱',
                        label: d.device_name || d.serial_number,
                        sub: d.serial_number || '',
                        page: 'devices',
                    });
                });
            }

            if (modData.status === 'fulfilled') {
                const list = modData.value.modules || (Array.isArray(modData.value) ? modData.value : []);
                list.filter(m =>
                    (m.name || '').toLowerCase().includes(q) ||
                    (m.type || '').toLowerCase().includes(q)
                ).slice(0, 3).forEach(m => {
                    items.push({
                        icon: '📦',
                        label: m.name,
                        sub: m.type,
                        page: 'modules',
                    });
                });
            }
        } catch (e) { /* ignore */ }

        if (items.length === 0) {
            results.innerHTML = '<div class="search-item" style="color:var(--text-muted);">Nenhum resultado</div>';
        } else {
            results.innerHTML = items.map(i => `
                <div class="search-item" data-page="${i.page}">
                    <span>${i.icon}</span>
                    <div><strong>${esc(i.label)}</strong><div style="font-size:11px;color:var(--text-muted);">${esc(i.sub)}</div></div>
                </div>
            `).join('');
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

// Start app
document.addEventListener('DOMContentLoaded', () => App.init());
