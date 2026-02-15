const { ipcRenderer } = require('electron');

// Window Controls
document.getElementById('min-btn').addEventListener('click', () => ipcRenderer.send('minimize-window'));
document.getElementById('max-btn').addEventListener('click', () => ipcRenderer.send('maximize-window'));
document.getElementById('close-btn').addEventListener('click', () => ipcRenderer.send('close-window'));

// Navigation
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view-section');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Prevent navigating to settings without admin auth if already configured
        if (item.dataset.view === 'settings') {
            checkAdminAuth(() => switchView(item));
        } else {
            switchView(item);
        }
    });
});

function switchView(item) {
    navItems.forEach(n => n.classList.remove('active'));
    views.forEach(v => v.style.display = 'none');
    item.classList.add('active');
    const viewId = `view-${item.dataset.view}`;
    const view = document.getElementById(viewId);
    if (view) view.style.display = 'block';
}

// SETUP & SETTINGS LOGIC
const setupOverlay = document.getElementById('setup-overlay');
const adminOverlay = document.getElementById('admin-overlay');
const urlInput = document.getElementById('setting-url');
const tokenInput = document.getElementById('setting-token');
const moduleSelect = document.getElementById('setting-module');

// Mock Modules for now (should fetch from API in production)
const availableModules = [
    { id: 'recepcao', name: 'Recepção' },
    { id: 'triagem', name: 'Triagem' },
    { id: 'medico', name: 'Consultório Médico' },
    { id: 'farmacia', name: 'Farmácia' },
    { id: 'admin', name: 'Administração' }
];

function populateModules() {
    const setupModuleSelect = document.getElementById('setup-module');
    const options = availableModules.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    if (setupModuleSelect) setupModuleSelect.innerHTML = `<option value="">Selecione um Módulo...</option>${options}`;
    if (moduleSelect) moduleSelect.innerHTML = `<option value="">Selecione um Módulo...</option>${options}`;
}

async function loadSettings() {
    const settings = await ipcRenderer.invoke('get-settings');

    // Check if configured
    if (!settings.serverUrl || !settings.module) {
        showSetupWizard();
    } else {
        // Load into Settings configuration inputs
        urlInput.value = settings.serverUrl || '';
        tokenInput.value = settings.authToken || '';
        moduleSelect.value = settings.module || '';
    }
}


function showSetupWizard() {
    populateModules();
    setupOverlay.style.display = 'flex';
}

// SETUP: Test Connection
const testBtn = document.createElement('button');
testBtn.textContent = 'Testar Conexão';
testBtn.className = 'secondary';
testBtn.style.marginBottom = '10px';
testBtn.onclick = async () => {
    const url = document.getElementById('setup-url').value;
    if (!url) {
        alert('Digite a URL do servidor.');
        return;
    }

    testBtn.textContent = 'Testando...';
    try {
        // Use fetch from renderer (ignoring CORS for now if configured, or use IPC proxy)
        const cleanUrl = url.replace(/\/$/, '');
        const response = await fetch(`${cleanUrl}/public/status`);
        const data = await response.json();

        if (data.success) {
            alert(`Conexão OK! Versão: ${data.version}`);
            testBtn.style.borderColor = '#10b981';
            testBtn.style.color = '#10b981';
        } else {
            throw new Error('Falha no status');
        }
    } catch (e) {
        alert('Erro ao conectar: ' + e.message);
        testBtn.style.borderColor = '#ef4444';
        testBtn.style.color = '#ef4444';
    } finally {
        testBtn.textContent = 'Testar Conexão';
    }
};

// Insert Test Button before Save Button
const saveBtn = document.getElementById('setup-save-btn');
saveBtn.parentNode.insertBefore(testBtn, saveBtn);

// Setup Wizard Save
document.getElementById('setup-save-btn').addEventListener('click', async () => {
    const url = document.getElementById('setup-url').value;
    const module = document.getElementById('setup-module').value;

    if (!url || !module) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    await ipcRenderer.invoke('save-settings', {
        serverUrl: url,
        authToken: '', // Auth token not always needed for desktop module mode? Or auto-generated?
        module: module
    });

    setupOverlay.style.display = 'none';
    alert('Configuração concluída! O Agent está rodando.');
    location.reload(); // Reload to apply settings
});

// Admin Lock Logic
let adminAuthenticated = false;

function checkAdminAuth(callback) {
    if (adminAuthenticated) {
        callback();
        return;
    }

    // Show Admin Login Overlay
    adminOverlay.style.display = 'flex';

    const confirmBtn = document.getElementById('admin-login-btn');
    const cancelBtn = document.getElementById('admin-cancel-btn');
    const infoMsg = document.getElementById('admin-info');

    // Clean up old listeners (simple way)
    const newConfirm = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);

    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    newConfirm.addEventListener('click', async () => {
        const pass = document.getElementById('admin-password').value;
        const isValid = await ipcRenderer.invoke('verify-admin', pass);

        if (isValid) {
            adminAuthenticated = true;
            adminOverlay.style.display = 'none';
            document.getElementById('admin-password').value = '';
            infoMsg.textContent = '';
            callback();
        } else {
            infoMsg.textContent = 'Senha incorreta.';
        }
    });

    newCancel.addEventListener('click', () => {
        adminOverlay.style.display = 'none';
        document.getElementById('admin-password').value = '';
        infoMsg.textContent = '';
    });
}

// Settings Page Save
document.getElementById('save-settings').addEventListener('click', async () => {
    await ipcRenderer.invoke('save-settings', {
        serverUrl: urlInput.value,
        authToken: tokenInput.value,
        module: moduleSelect.value
    });
    alert('Configurações salvas!');
});

// Simulation / Live Data
function updateStats() {
    ipcRenderer.invoke('get-system-info').then(info => {
        if (info && info.cpu) {
            const load = Math.round(info.cpu.currentLoad || Math.random() * 20);
            document.getElementById('cpu-val').textContent = `${load}%`;
        }
    });

    const health = 95 + Math.floor(Math.random() * 5);
    document.getElementById('health-val').textContent = `${health}%`;

    const now = new Date();
    document.getElementById('last-sync').textContent = now.toLocaleTimeString();
}

// Initial Load
populateModules();
loadSettings();
setInterval(updateStats, 5000);
updateStats();

// ... (Existing code) ...

// COMMAND HISTORY LOGIC (Passive)
const historyBody = document.getElementById('command-history-body');

async function loadCommandHistory() {
    if (!historyBody) return;

    // In a real agent, this would fetch local logs or ask the server for "My Commands"
    // For now, let's keep it simple or empty.
    historyBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Histórico vazio.</td></tr>';
}

// Auto-load on switching to this view
navItems.forEach(item => {
    item.addEventListener('click', () => {
        if (item.dataset.view === 'commands') {
            loadCommandHistory();
        }
    });
});
