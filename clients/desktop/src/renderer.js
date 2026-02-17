const { ipcRenderer } = require('electron');

// ──────────────────────────────────────────────────
// STATE MANAGEMENT
// ──────────────────────────────────────────────────
let isLocked = true;
let logInterval = null;
let statusInterval = null;

// ──────────────────────────────────────────────────
// DOM ELEMENTS
// ──────────────────────────────────────────────────
const views = document.querySelectorAll('.view-section');
const navItems = document.querySelectorAll('.nav-item');
const sidebar = document.getElementById('app-sidebar');

// Lock/Login Screen Elements
const lockScreen = document.getElementById('lock-screen');
const loginPass = document.getElementById('login-password');
const loginBtn = document.getElementById('btn-login');
const loginError = document.getElementById('login-error');

// Setup Elements
const setupView = document.getElementById('view-setup-connection');
const setupIp = document.getElementById('setup-ip');
const setupPort = document.getElementById('setup-port');
const setupToken = document.getElementById('setup-token');
const setupBtn = document.getElementById('btn-test-save-connection');
const setupError = document.getElementById('setup-error');

// ──────────────────────────────────────────────────
// INITIALIZATION
// ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Window Controls
    document.getElementById('min-btn').addEventListener('click', () => ipcRenderer.send('minimize-window'));
    document.getElementById('max-btn').addEventListener('click', () => ipcRenderer.send('maximize-window'));
    document.getElementById('close-btn').addEventListener('click', () => ipcRenderer.send('close-window'));

    // Setup Flow
    setupBtn.addEventListener('click', handleSetupConnection);

    // Login Flow
    loginBtn.addEventListener('click', attemptUnlock);
    loginPass.addEventListener('keypress', (e) => { if (e.key === 'Enter') attemptUnlock(); });

    // Dashboard & Settings Events
    document.getElementById('btn-force-sync').addEventListener('click', forceSync);
    document.getElementById('btn-clear-logs').addEventListener('click', async () => {
        await ipcRenderer.invoke('clear-logs');
        refreshLogs();
    });
    document.getElementById('btn-save-settings').addEventListener('click', saveClientSettings);
    document.getElementById('btn-change-server').addEventListener('click', resetConnection);

    document.getElementById('btn-detect-module')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-detect-module');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        // Use current settings (already saved in main store)
        const settings = await ipcRenderer.invoke('get-settings');
        const result = await ipcRenderer.invoke('fetch-modules', settings);

        if (result.success && result.modules.length > 0) {
            // Basic detection: just pick the first desktop one or first one
            const match = result.modules.find(m => m.type === 'desktop') || result.modules[0];
            document.getElementById('input-module').value = match._id || match.id;
            showToast('Módulo detectado: ' + match.name, 'success');
        } else {
            showToast('Nenhum módulo encontrado', 'error');
        }
        btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Detectar';
    });

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.dataset.view;
            switchView(viewId);
        });
    });

    // STARTUP LOGIC
    await checkInitialState();
});

// ──────────────────────────────────────────────────
// FLOW MANAGEMENT
// ──────────────────────────────────────────────────

async function checkInitialState() {
    const settings = await ipcRenderer.invoke('get-settings');
    const hasConnection = settings.ip && settings.token;

    if (!hasConnection) {
        // STEP 1: SETUP
        showSetupView();
    } else {
        // STEP 2: LOCK / LOGIN
        // We always lock on start to force "Login" flow as requested
        startLockScreen();

        // Also load sidebar data for when we unlock
        updateUIWithSettings(settings);
    }
}

function showSetupView() {
    // Hide sidebar, show setup
    sidebar.style.display = 'none';
    views.forEach(v => v.style.display = 'none');
    setupView.style.display = 'flex';
}

function startLockScreen() {
    sidebar.style.display = 'none'; // Hide sidebar while locked
    views.forEach(v => v.style.display = 'none');
    lockScreen.style.display = 'flex';
    loginPass.value = '';
    loginPass.focus();
}

async function handleSetupConnection() {
    setupBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testando...';
    setupBtn.disabled = true;
    setupError.textContent = '';

    const ip = setupIp.value.trim();
    const port = setupPort.value.trim() || '3000';
    const token = setupToken.value.trim();

    if (!ip || !token) {
        setupError.textContent = 'IP e Token são obrigatórios.';
        setupBtn.innerHTML = '<i class="fa-solid fa-plug"></i> Conectar & Salvar';
        setupBtn.disabled = false;
        return;
    }

    try {
        const result = await ipcRenderer.invoke('test-connection', { ip, port, token });

        if (result.success) {
            setupError.style.color = 'var(--status-success)';
            setupError.textContent = 'Conectado! Salvando...';

            // Save settings
            await ipcRenderer.invoke('save-settings', { ip, port, token });

            // Proceed to Step 2 (Login/Lock)
            setTimeout(() => {
                showToast('Configuração salva com sucesso!', 'success');
                startLockScreen(); // Transition to Lock Screen
            }, 1000);

        } else {
            setupError.style.color = 'var(--status-error)';
            setupError.textContent = result.error || 'Falha na conexão.';
            setupBtn.innerHTML = '<i class="fa-solid fa-plug"></i> Conectar & Salvar';
            setupBtn.disabled = false;
        }
    } catch (e) {
        setupError.textContent = 'Erro inesperado: ' + e.message;
        setupBtn.disabled = false;
    }
}

// ──────────────────────────────────────────────────
// LOCK SYSTEM
// ──────────────────────────────────────────────────
ipcRenderer.on('lock-app', () => {
    startLockScreen();
});

async function attemptUnlock() {
    const password = loginPass.value;
    // Verify admin password
    const isValid = await ipcRenderer.invoke('verify-admin', password);

    if (isValid) {
        unlockApp();
    } else {
        const card = document.querySelector('.login-card');
        card.classList.add('shake');
        loginError.textContent = 'Senha incorreta';
        setTimeout(() => card.classList.remove('shake'), 500);
    }
}

function unlockApp() {
    isLocked = false;
    lockScreen.style.display = 'none'; // Hide lock overlay

    // STEP 3: DASHBOARD / CLIENT CONFIG
    sidebar.style.display = 'flex'; // Show Sidebar
    switchView('dashboard');        // Go to Dashboard

    // Start background loops
    startStatusLoop();
    startLogLoop();

    // Refresh data
    refreshStatus();
}

function resetConnection() {
    if (confirm('Deseja redefinir a conexão com o servidor?')) {
        showSetupView();
    }
}

// ──────────────────────────────────────────────────
// DASHBOARD & CLIENT CONFIG
// ──────────────────────────────────────────────────

function switchView(viewName) {
    views.forEach(v => {
        if (v.id !== 'view-setup-connection') v.style.display = 'none';
        v.classList.remove('active'); // Remove active class
        if (v.id === `view-${viewName}`) {
            v.style.display = 'block';
            v.classList.add('active'); // Add active for logic checks
        }
    });

    navItems.forEach(n => n.classList.remove('active'));
    const targetNav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (targetNav) targetNav.classList.add('active');
}

function updateUIWithSettings(settings) {
    // Populate Client Config Fields
    document.getElementById('input-module').value = settings.moduleId || '';
    document.getElementById('input-sector').value = settings.sector || '';
    document.getElementById('input-floor').value = settings.floor || '';
    document.getElementById('check-legacy').checked = settings.forceLegacyMode || false;
    document.getElementById('check-lock').checked = settings.lockOnMinimize || false;

    document.getElementById('lbl-connected-server').textContent = `${settings.ip}:${settings.port}`;

    // Populate Info Fields
    document.getElementById('info-ip').value = settings.ip || '---';
}

async function saveClientSettings() {
    const current = await ipcRenderer.invoke('get-settings');

    // Merge new client settings with existing connection settings
    const newSettings = {
        ...current,
        moduleId: document.getElementById('input-module').value,
        sector: document.getElementById('input-sector').value,
        floor: document.getElementById('input-floor').value,
        forceLegacyMode: document.getElementById('check-legacy').checked,
        lockOnMinimize: document.getElementById('check-lock').checked
    };

    const result = await ipcRenderer.invoke('save-settings', newSettings);
    if (result.success) {
        showToast('Configurações do cliente salvas!', 'success');
        refreshStatus();
    } else {
        showToast('Erro ao salvar.', 'error');
    }
}

async function refreshStatus() {
    const status = await ipcRenderer.invoke('get-service-status');
    const settings = await ipcRenderer.invoke('get-settings');

    // Global Badge
    const badgeText = document.getElementById('global-status-text');
    const badgeDot = document.getElementById('global-status-dot');

    if (status.isRunning) {
        badgeText.textContent = 'Online';
        badgeDot.className = 'status-indicator online';
    } else {
        badgeText.textContent = 'Offline';
        badgeDot.className = 'status-indicator error';
    }

    // Stats
    setText('stat-last-sync', formatTime(status.lastRunTime));
    setText('stat-status-text', status.lastRunStatus || 'N/A');
    setText('stat-module', settings.moduleId || (settings.forceLegacyMode ? 'Legado' : 'Não Configurado'));

    const sysInfo = await ipcRenderer.invoke('get-system-info');
    document.getElementById('info-hostname').value = sysInfo['Nome do Computador'];
    document.getElementById('info-ip').value = settings.ip || '---';
}

async function forceSync() {
    const btn = document.getElementById('btn-force-sync');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';

    const result = await ipcRenderer.invoke('force-sync');
    if (result.success) showToast('Sincronização OK', 'success');
    else showToast('Falha: ' + result.error, 'error');

    btn.disabled = false;
    btn.innerHTML = original;
    refreshStatus();
}

// ──────────────────────────────────────────────────
// LOGS
// ──────────────────────────────────────────────────
async function refreshLogs() {
    // Only if view is visible
    const logsView = document.getElementById('view-logs');
    if (!logsView || logsView.style.display === 'none') return;

    const logs = await ipcRenderer.invoke('get-logs');
    const container = document.getElementById('log-container');

    container.innerHTML = logs.map(log => `
        <div class="log-entry">
            <span class="log-ts">${formatTime(log.timestamp)}</span>
            <span class="log-level ${log.level}">${log.level}</span>
            <span class="log-msg">${escapeHtml(log.message)}</span>
             ${log.data ? `<span style="color:#555">${JSON.stringify(log.data)}</span>` : ''}
        </div>
    `).join('');
}

function startStatusLoop() {
    if (statusInterval) clearInterval(statusInterval);
    statusInterval = setInterval(refreshStatus, 5000);
}

function startLogLoop() {
    if (logInterval) clearInterval(logInterval);
    logInterval = setInterval(refreshLogs, 3000);
}

// ──────────────────────────────────────────────────
// UTILS
// ──────────────────────────────────────────────────
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function formatTime(iso) {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString();
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white; padding: 12px 24px; border-radius: 8px;
        z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: fadeInSlide 0.3s forwards;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}