// clients/desktop/main.js
// Alinhado com settings_service.dart + agent_provider.dart + background_service.dart
//
// CAMPOS DO STORE (idênticos ao SettingsService do Flutter):
//   ip, port, interval, moduleId, sector, floor, token, assetName, forceLegacyMode

const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
const axios = require('axios');
const os = require('os');

const store = new Store();
let tray = null;
let win  = null;

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
            nodeIntegration:  true,
            contextIsolation: false,
        },
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        icon: path.join(__dirname, 'src/assets/icon.png'),
    });

    win.loadFile('src/index.html');

    // ── Controles da janela (window_manager equivalente) ──
    ipcMain.on('minimize-window', () => win.hide());
    ipcMain.on('maximize-window', () => {
        win.isMaximized() ? win.unmaximize() : win.maximize();
    });
    ipcMain.on('close-window', () => win.hide()); // Mantém na bandeja

    // ──────────────────────────────────────────────────
    // SETTINGS SERVICE  (settings_service.dart)
    // Campos: ip, port, interval, moduleId, sector, floor, token, assetName, forceLegacyMode
    // ──────────────────────────────────────────────────

    ipcMain.handle('get-settings', () => {
        return store.get('settings', {
            ip:             '',
            port:           '3000',
            token:          '',
            moduleId:       '',
            sector:         '',
            floor:          '',
            assetName:      '',
            interval:       300,     // padrão 5 minutos (settings_service.dart)
            forceLegacyMode: false,
        });
    });

    ipcMain.handle('save-settings', async (event, settings) => {
        // Garante que os campos correspondem exatamente ao SettingsService
        const normalized = {
            ip:              String(settings.ip              || '').trim(),
            port:            String(settings.port            || '3000').trim(),
            token:           String(settings.token           || '').trim(),
            moduleId:        String(settings.moduleId        || '').trim(),
            sector:          String(settings.sector          || '').trim(),
            floor:           String(settings.floor           || '').trim(),
            assetName:       String(settings.assetName       || '').trim(),
            interval:        Number(settings.interval)       || 300,
            forceLegacyMode: settings.forceLegacyMode === true,
        };

        store.set('settings', normalized);

        // Atualiza o serviço de background com as novas configs
        try {
            const commandPoller = require('./src/services/CommandPoller');
            await commandPoller.updateSettings(normalized);
        } catch (e) {
            console.warn('[main] Poller não disponível ainda:', e.message);
        }

        return { success: true };
    });

    // Salva apenas forceLegacyMode (settings_service.dart → saveForceLegacyMode)
    ipcMain.handle('save-force-legacy', async (event, value) => {
        const current = store.get('settings', {});
        current.forceLegacyMode = value === true;
        store.set('settings', current);

        try {
            const commandPoller = require('./src/services/CommandPoller');
            await commandPoller.updateSettings({ forceLegacyMode: value === true });
        } catch (_) {}

        return { success: true };
    });

    // ──────────────────────────────────────────────────
    // MÓDULOS  (agent_provider.dart → fetchModules)
    // ──────────────────────────────────────────────────

    ipcMain.handle('fetch-modules', async (event, { ip, port, token }) => {
        try {
            const serverUrl = `http://${ip}:${port}`;
            const headers   = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'AUTH_TOKEN': token,
            };

            const response = await axios.get(`${serverUrl}/api/modules`, {
                headers,
                timeout: 10000,
            });

            return { success: true, modules: response.data?.modules || [] };

        } catch (e) {
            // 404 → servidor não suporta módulos (agent_provider.dart → fetchModules case 404)
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
    // TESTE DE CONEXÃO  (agent_provider.dart → _testConnection)
    // Rota: GET /api/auth/validate
    // ──────────────────────────────────────────────────

    ipcMain.handle('test-connection', async (event, { ip, port, token }) => {
        try {
            const serverUrl = `http://${ip}:${port}`;
            const headers   = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'AUTH_TOKEN': token,
            };

            const response = await axios.get(`${serverUrl}/api/auth/validate`, {
                headers,
                timeout: 10000,
            });

            if (response.status === 401) throw new Error('Token inválido ou expirado.');
            return { success: true };

        } catch (e) {
            if (e.response?.status === 401) {
                return { success: false, error: 'Token inválido ou expirado.' };
            }
            return { success: false, error: `Falha ao conectar: ${e.message}` };
        }
    });

    // ──────────────────────────────────────────────────
    // SINCRONIZAÇÃO FORÇADA  (background_service.dart → runCycle)
    // ──────────────────────────────────────────────────

    ipcMain.handle('force-sync', async () => {
        try {
            const commandPoller = require('./src/services/CommandPoller');
            await commandPoller.runCycle();
            return {
                success:    true,
                lastRunTime: commandPoller.lastRunTime?.toISOString(),
                status:     commandPoller.lastRunStatus,
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    // ──────────────────────────────────────────────────
    // STATUS DO SERVIÇO  (status_screen.dart)
    // ──────────────────────────────────────────────────

    ipcMain.handle('get-service-status', () => {
        try {
            const commandPoller = require('./src/services/CommandPoller');
            return {
                isRunning:     commandPoller.isRunning,
                lastRunStatus: commandPoller.lastRunStatus,
                lastRunTime:   commandPoller.lastRunTime?.toISOString() || null,
                nextRunTime:   commandPoller.nextRunTime?.toISOString() || null,
                syncCount:     commandPoller.syncCount,
                errorCount:    commandPoller.errorCount,
            };
        } catch (_) {
            return { isRunning: false, lastRunStatus: 'Erro', syncCount: 0, errorCount: 0 };
        }
    });

    ipcMain.handle('stop-service', () => {
        try {
            const commandPoller = require('./src/services/CommandPoller');
            commandPoller.stop();
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('start-service', async () => {
        try {
            const commandPoller = require('./src/services/CommandPoller');
            await commandPoller.start();
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    // ──────────────────────────────────────────────────
    // INFORMAÇÕES DO SISTEMA  (status_screen.dart → _getSystemInfo)
    // Campos compatíveis com a StatusScreen do Flutter
    // ──────────────────────────────────────────────────

    ipcMain.handle('get-system-info', () => {
        return {
            'Nome do Computador': process.env.COMPUTERNAME || os.hostname(),
            'Usuário':            process.env.USERNAME    || os.userInfo().username || 'N/A',
            'Sistema Operacional': process.platform,
            'Versão do SO':       os.release(),
            'Número de Processadores': String(os.cpus().length),
            'Arquitetura':        process.arch,
        };
    });

    // ──────────────────────────────────────────────────
    // ADMIN AUTH
    // ──────────────────────────────────────────────────

    ipcMain.handle('verify-admin', (event, password) => {
        const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
        return password === adminPass;
    });
}

// ──────────────────────────────────────────────────
// SYSTEM TRAY  (system_tray_service.dart)
// ──────────────────────────────────────────────────

function createTray() {
    const iconPath = path.join(__dirname, 'src/assets/icon.png');
    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Abrir Painel',
            click: () => { win.show(); win.focus(); },
        },
        {
            label: 'Forçar Sincronização',
            click: async () => {
                console.log('[main] Sincronização forçada pelo usuário');
                const commandPoller = require('./src/services/CommandPoller');
                await commandPoller.runCycle();
            },
        },
        {
            label: 'Reiniciar Serviço',
            click: async () => {
                console.log('[main] Reiniciando o serviço');
                const commandPoller = require('./src/services/CommandPoller');
                await commandPoller.initialize();
            },
        },
        { type: 'separator' },
        {
            label: 'Sair',
            click: () => {
                app.isQuiting = true;
                const commandPoller = require('./src/services/CommandPoller');
                commandPoller.stop();
                app.quit();
            },
        },
    ]);

    tray.setToolTip('Agente de Monitoramento - Ativo');
    tray.setContextMenu(contextMenu);

    // Clique → abre/fecha janela (system_tray_service.dart → kSystemTrayEventClick)
    tray.on('click', () => {
        if (win.isVisible()) { win.hide(); } else { win.show(); win.focus(); }
    });
}

// ──────────────────────────────────────────────────
// CICLO DE VIDA  (main.dart)
// ──────────────────────────────────────────────────

app.whenReady().then(async () => {
    createWindow();

    try { createTray(); } catch (e) {
        console.log('[main] Tray não criada:', e.message);
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    // Inicializa o Background Service  (main.dart → BackgroundService.initialize)
    const commandPoller = require('./src/services/CommandPoller');
    await commandPoller.initialize();
});

// Minimiza para bandeja ao fechar (window_listener.dart → onWindowClose)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Não fecha — mantém na bandeja
    }
});

app.on('before-quit', () => {
    const commandPoller = require('./src/services/CommandPoller');
    commandPoller.stop();
});