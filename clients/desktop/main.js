// clients/desktop/main.js
// Alinhado com settings_service.dart + agent_provider.dart + background_service.dart
//
// CAMPOS DO STORE (idênticos ao SettingsService do Flutter):
//   ip, port, interval, moduleId, sector, floor, token, assetName, forceLegacyMode, lockOnMinimize

const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
const axios = require('axios');
const os = require('os');
const logger = require('./src/services/Logger'); // Integrated Logger

const store = new Store();

// --- AUTO-PROVISIONAMENTO (EXTRAÇÃO DE TOKEN DO NOME DO ARQUIVO) ---
// Formato esperado: "UnifiedDesktop-<TOKEN>.exe"
const fileName = path.basename(process.execPath);
logger.info(`Starting execution from: ${fileName}`);
const tokenMatch = fileName.match(/UnifiedDesktop-([a-fA-F0-9]{64})\.exe/); // Token has 64 hex chars

if (tokenMatch && tokenMatch[1]) {
    const extractedToken = tokenMatch[1];
    const currentToken = store.get('settings.token');

    if (currentToken !== extractedToken) {
        logger.info(`Token detected in filename. Auto-provisioning: ${extractedToken.substring(0, 10)}...`);
        store.set('settings.token', extractedToken);
        // Force sync logic will pick this up on initialization
    }
}
// -------------------------------------------------------------------

let tray = null;
let win = null;
let isQuitting = false;

// ──────────────────────────────────────────────────
// JANELA PRINCIPAL
// ──────────────────────────────────────────────────
function createWindow() {
    win = new BrowserWindow({
        width: 1050,
        height: 720,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        icon: path.join(__dirname, 'src/assets/icon.png'),
    });

    win.loadFile('src/index.html');

    // ── Controles da janela ──
    ipcMain.on('minimize-window', () => {
        const settings = store.get('settings', {});
        if (settings.lockOnMinimize) {
            win.webContents.send('lock-app'); // Tell renderer to lock
        }
        win.hide();
    });

    ipcMain.on('maximize-window', () => {
        win.isMaximized() ? win.unmaximize() : win.maximize();
    });

    ipcMain.on('close-window', () => {
        const settings = store.get('settings', {});
        if (settings.lockOnMinimize) {
            win.webContents.send('lock-app');
        }
        win.hide();
    });

    // Start with DevTools if in dev mode (optional)
    // win.webContents.openDevTools({ mode: 'detach' });

    // ──────────────────────────────────────────────────
    // LOGGER IPC
    // ──────────────────────────────────────────────────
    ipcMain.handle('get-logs', () => logger.getLogs());
    ipcMain.handle('clear-logs', () => {
        logger.clearLogs();
        return { success: true };
    });
    ipcMain.on('log-message', (event, { level, message, data }) => {
        if (logger[level]) logger[level](message, data);
    });

    // ──────────────────────────────────────────────────
    // SETTINGS SERVICE
    // ──────────────────────────────────────────────────

    ipcMain.handle('get-settings', () => {
        return store.get('settings', {
            ip: '',
            port: '3000',
            token: '',
            moduleId: '',
            sector: '',
            floor: '',
            assetName: '',
            interval: 300,
            forceLegacyMode: false,
            lockOnMinimize: true, // Default true for security
            adminPassword: 'admin123' // Simple local storage for now
        });
    });

    ipcMain.handle('save-settings', async (event, settings) => {
        const normalized = {
            ip: String(settings.ip || '').trim(),
            port: String(settings.port || '3000').trim(),
            token: String(settings.token || '').trim(),
            moduleId: String(settings.moduleId || '').trim(),
            sector: String(settings.sector || '').trim(),
            floor: String(settings.floor || '').trim(),
            assetName: String(settings.assetName || '').trim(),
            interval: Number(settings.interval) || 300,
            forceLegacyMode: settings.forceLegacyMode === true,
            lockOnMinimize: settings.lockOnMinimize === true,
            adminPassword: settings.adminPassword || 'admin123'
        };

        store.set('settings', normalized);
        logger.info('Settings updated', normalized);

        // Atualiza o serviço de background
        try {
            const commandPoller = require('./src/services/CommandPoller');
            await commandPoller.updateSettings(normalized);
        } catch (e) {
            logger.warn('Failed to update CommandPoller settings', e.message);
        }

        return { success: true };
    });

    ipcMain.handle('save-force-legacy', async (event, value) => {
        const current = store.get('settings', {});
        current.forceLegacyMode = value === true;
        store.set('settings', current);

        try {
            const commandPoller = require('./src/services/CommandPoller');
            await commandPoller.updateSettings({ forceLegacyMode: value === true });
        } catch (_) { }

        return { success: true };
    });

    // ──────────────────────────────────────────────────
    // MÓDULOS
    // ──────────────────────────────────────────────────

    ipcMain.handle('fetch-modules', async (event, { ip, port, token }) => {
        try {
            const serverUrl = `http://${ip}:${port}`;
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'AUTH_TOKEN': token,
            };

            logger.info(`Fetching modules from ${serverUrl}`);
            const response = await axios.get(`${serverUrl}/api/modules`, {
                headers,
                timeout: 10000,
            });

            return { success: true, modules: response.data?.modules || [] };

        } catch (e) {
            logger.error('Error fetching modules', e.message);
            if (e.response?.status === 404) {
                return { success: true, modules: [], legacyOnly: true };
            }
            if (e.response?.status === 401 || e.response?.status === 403) {
                return { success: false, error: 'Token inválido ou expirado.' };
            }
            return { success: false, error: e.message };
        }
    });

    // ──────────────────────────────────────────────────
    // TESTE DE CONEXÃO
    // ──────────────────────────────────────────────────

    ipcMain.handle('test-connection', async (event, { ip, port, token }) => {
        try {
            const serverUrl = `http://${ip}:${port}`;
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'AUTH_TOKEN': token,
            };

            logger.info(`Testing connection to ${serverUrl}`);
            const response = await axios.get(`${serverUrl}/api/auth/validate`, {
                headers,
                timeout: 10000,
            });

            if (response.status === 401) throw new Error('Token inválido ou expirado.');
            return { success: true };

        } catch (e) {
            logger.error('Connection test failed', e.message);
            if (e.response?.status === 401) {
                return { success: false, error: 'Token inválido ou expirado.' };
            }
            return { success: false, error: `Falha ao conectar: ${e.message}` };
        }
    });

    // ──────────────────────────────────────────────────
    // SINCRONIZAÇÃO FORÇADA
    // ──────────────────────────────────────────────────

    ipcMain.handle('force-sync', async () => {
        try {
            const commandPoller = require('./src/services/CommandPoller');
            logger.info('Manual sync requested');
            await commandPoller.runCycle();
            return {
                success: true,
                lastRunTime: commandPoller.lastRunTime?.toISOString(),
                status: commandPoller.lastRunStatus,
            };
        } catch (e) {
            logger.error('Validation failed', e.message);
            return { success: false, error: e.message };
        }
    });

    // ──────────────────────────────────────────────────
    // STATUS DO SERVIÇO
    // ──────────────────────────────────────────────────

    ipcMain.handle('get-service-status', () => {
        try {
            const commandPoller = require('./src/services/CommandPoller');
            return {
                isRunning: commandPoller.isRunning,
                lastRunStatus: commandPoller.lastRunStatus,
                lastRunTime: commandPoller.lastRunTime?.toISOString() || null,
                nextRunTime: commandPoller.nextRunTime?.toISOString() || null,
                syncCount: commandPoller.syncCount,
                errorCount: commandPoller.errorCount,
            };
        } catch (e) {
            return { isRunning: false, lastRunStatus: 'Erro', syncCount: 0, errorCount: 0 };
        }
    });

    ipcMain.handle('stop-service', () => {
        try {
            const commandPoller = require('./src/services/CommandPoller');
            commandPoller.stop();
            logger.info('Service stopped by user');
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('start-service', async () => {
        try {
            const commandPoller = require('./src/services/CommandPoller');
            await commandPoller.start();
            logger.info('Service started by user');
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    // ──────────────────────────────────────────────────
    // INFORMAÇÕES DO SISTEMA
    // ──────────────────────────────────────────────────

    ipcMain.handle('get-system-info', () => {
        return {
            'Nome do Computador': process.env.COMPUTERNAME || os.hostname(),
            'Usuário': process.env.USERNAME || os.userInfo().username || 'N/A',
            'Sistema Operacional': process.platform,
            'Versão do SO': os.release(),
            'Número de Processadores': String(os.cpus().length),
            'Arquitetura': process.arch,
        };
    });

    // ──────────────────────────────────────────────────
    // ADMIN AUTH
    // ──────────────────────────────────────────────────

    ipcMain.handle('verify-admin', (event, password) => {
        const settings = store.get('settings', {});
        // Fallback to env or default
        const adminPass = settings.adminPassword || process.env.ADMIN_PASSWORD || 'admin123';
        return password === adminPass;
    });
}

// ──────────────────────────────────────────────────
// SYSTEM TRAY
// ──────────────────────────────────────────────────

function createTray() {
    const iconPath = path.join(__dirname, 'src/assets/icon.png');
    tray = new Tray(iconPath);

    const updateContextMenu = () => {
        const commandPoller = require('./src/services/CommandPoller');
        const isRunning = commandPoller.isRunning;

        const contextMenu = Menu.buildFromTemplate([
            { label: 'Unified Agent', enabled: false },
            { type: 'separator' },
            {
                label: isRunning ? 'Status: Online 🟢' : 'Status: Conectando... 🟡',
                enabled: false,
            },
            {
                label: 'Abrir Painel',
                click: () => { win.show(); win.focus(); },
            },
            {
                label: 'Sincronizar Agora',
                click: async () => {
                    logger.info('Tray: Manual sync');
                    await commandPoller.runCycle();
                },
            },
            { type: 'separator' },
            {
                label: 'Encerrar',
                click: () => {
                    isQuitting = true;
                    commandPoller.stop();
                    app.quit();
                },
            },
        ]);
        tray.setContextMenu(contextMenu);
    };

    tray.setToolTip('Unified Agent - Monitoramento Ativo');
    updateContextMenu();

    // Update tray menu periodically to reflect status
    setInterval(updateContextMenu, 5000);

    tray.on('click', () => {
        if (win.isVisible()) {
            win.hide();
        } else {
            win.show();
            win.focus();
        }
    });
}

// ──────────────────────────────────────────────────
// CICLO DE VIDA
// ──────────────────────────────────────────────────

app.whenReady().then(async () => {
    createWindow();

    try { createTray(); } catch (e) {
        logger.error('Failed to create tray', e.message);
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    const commandPoller = require('./src/services/CommandPoller');
    await commandPoller.initialize();
    logger.info('App started');
});

// Minimiza para bandeja ao fechar
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Keep running in background
    }
});

app.on('before-quit', () => {
    isQuitting = true;
    const commandPoller = require('./src/services/CommandPoller');
    commandPoller.stop();
});
