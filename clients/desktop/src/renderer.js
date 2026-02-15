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
        // Remove active class
        navItems.forEach(n => n.classList.remove('active'));
        views.forEach(v => v.style.display = 'none');

        // Add active class
        item.classList.add('active');
        const viewId = `view-${item.dataset.view}`;
        const view = document.getElementById(viewId);
        if (view) view.style.display = 'block';
    });
});

// Settings Logic
const urlInput = document.getElementById('setting-url');
const tokenInput = document.getElementById('setting-token');

async function loadSettings() {
    const settings = await ipcRenderer.invoke('get-settings');
    if (settings) {
        urlInput.value = settings.serverUrl || '';
        tokenInput.value = settings.authToken || '';
    }
}

document.getElementById('save-settings').addEventListener('click', async () => {
    await ipcRenderer.invoke('save-settings', {
        serverUrl: urlInput.value,
        authToken: tokenInput.value
    });
    alert('Configurações salvas!');
});

// Simulation / Live Data
function updateStats() {
    // In a real app, strict fetching from backend or local system info
    ipcRenderer.invoke('get-system-info').then(info => {
        if (info && info.cpu) {
            // Simulate load based on real data or random for visual effect
            const load = Math.round(info.cpu.currentLoad || Math.random() * 20);
            document.getElementById('cpu-val').textContent = `${load}%`;
        }
    });

    // Simulated Health
    const health = 95 + Math.floor(Math.random() * 5);
    document.getElementById('health-val').textContent = `${health}%`;

    // Last Sync time
    const now = new Date();
    document.getElementById('last-sync').textContent = now.toLocaleTimeString();
}

// Initial Load
loadSettings();
setInterval(updateStats, 5000);
updateStats();

// Add some fake commands for visual proof
const commands = [
    { name: 'Atualização de Software', time: 'Há 5 min', status: 'success', icon: 'fa-download' },
    { name: 'Verificação de Disco', time: 'Há 1 hora', status: 'success', icon: 'fa-hard-drive' },
    { name: 'Reiniciar Serviço', time: 'Há 2 horas', status: 'pending', icon: 'fa-rotate' },
];

const cmdList = document.getElementById('recent-commands');
cmdList.innerHTML = commands.map(cmd => `
    <div class="command-item">
        <div class="cmd-icon"><i class="fa-solid ${cmd.icon}"></i></div>
        <div class="cmd-details">
            <div class="cmd-name">${cmd.name}</div>
            <div class="cmd-time">${cmd.time}</div>
        </div>
        <div class="cmd-status ${cmd.status}">${cmd.status === 'success' ? 'Concluído' : 'Pendente'}</div>
    </div>
`).join('');
