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
        setupChangePassword();
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

    function setupChangePassword() {
        const btn = document.getElementById('change-password-btn');
        const modal = document.getElementById('password-modal');
        const closeBtn = document.getElementById('password-modal-close');
        const cancelBtn = document.getElementById('password-modal-cancel');
        const saveBtn = document.getElementById('password-modal-save');
        const form = document.getElementById('password-form');

        if (btn && modal) {
            btn.addEventListener('click', () => {
                if (form) form.reset();
                modal.classList.add('active');
            });
        }

        [closeBtn, cancelBtn].forEach(b => {
            if (b) b.addEventListener('click', () => modal.classList.remove('active'));
        });

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const currentPassword = document.getElementById('form-current-password').value;
                const newPassword = document.getElementById('form-new-password').value;
                const confirmPassword = document.getElementById('form-confirm-password').value;

                if (!currentPassword || !newPassword || !confirmPassword) {
                    showToast('Preencha todos os campos.', 'warning');
                    return;
                }

                if (newPassword.length < 6) {
                    showToast('A nova senha deve ter no mínimo 6 caracteres.', 'warning');
                    return;
                }

                if (newPassword !== confirmPassword) {
                    showToast('As senhas não coincidem.', 'warning');
                    return;
                }

                try {
                    await API.post('/auth/change-password', { currentPassword, newPassword });
                    showToast('Senha alterada com sucesso!', 'success');
                    modal.classList.remove('active');
                    if (form) form.reset();
                } catch (err) {
                    showToast(err.message || 'Erro ao alterar senha.', 'error');
                }
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

// Utility: XSS-safe text escaping
function esc(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

// Utility: status badge HTML
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

// Utility: set element text by ID
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// Utility: set progress bar width + color by ID
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

// ===== PAGINATION UTILITY =====
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
            if (!el) return;

            const tp = totalPages();
            if (tp <= 1) { el.innerHTML = ''; return; }

            let html = '<div class="pagination">';
            html += `<button class="btn btn-ghost btn-sm" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;

            let range = [];
            if (tp <= 7) {
                range = Array.from({ length: tp }, (_, i) => i + 1);
            } else {
                if (currentPage <= 4) {
                    range = [1, 2, 3, 4, 5, '...', tp];
                } else if (currentPage >= tp - 3) {
                    range = [1, '...', tp - 4, tp - 3, tp - 2, tp - 1, tp];
                } else {
                    range = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', tp];
                }
            }

            range.forEach(p => {
                if (p === '...') {
                    html += '<span class="pagination-ellipsis">…</span>';
                } else {
                    html += `<button class="btn btn-sm ${p === currentPage ? 'btn-primary' : 'btn-ghost'}" data-page="${p}">${p}</button>`;
                }
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
                        this.renderControls(container); // Re-render controls
                        if (opts.onPageChange) opts.onPageChange(this.getPage(), this);
                    }
                });
            });
        },
    };
}

// ===== SKELETON LOADER =====
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

// ===== CUSTOM CONFIRM MODAL =====
function confirmAction(message, opts = {}) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const msgEl = document.getElementById('confirm-modal-message');
        const btnOk = document.getElementById('confirm-modal-ok');
        const btnCancel = document.getElementById('confirm-modal-cancel');
        const closeBtn = document.getElementById('confirm-modal-close');

        if (!modal || !msgEl) {
            resolve(confirm(message));
            return;
        }

        msgEl.textContent = message;

        if (btnOk) {
            btnOk.textContent = opts.okText || 'Confirmar';
            btnOk.className = `btn ${opts.danger ? 'btn-danger' : 'btn-primary'}`;
        }

        modal.classList.add('active');

        function cleanup(result) {
            modal.classList.remove('active');
            btnOk?.removeEventListener('click', onOk);
            btnCancel?.removeEventListener('click', onCancel);
            closeBtn?.removeEventListener('click', onCancel);
            modal.removeEventListener('click', onBackdrop);
            resolve(result);
        }

        function onOk() { cleanup(true); }
        function onCancel() { cleanup(false); }
        function onBackdrop(e) { if (e.target === modal) cleanup(false); }

        btnOk?.addEventListener('click', onOk);
        btnCancel?.addEventListener('click', onCancel);
        closeBtn?.addEventListener('click', onCancel);
        modal.addEventListener('click', onBackdrop);
    });
}

// Start app
document.addEventListener('DOMContentLoaded', () => App.init());
