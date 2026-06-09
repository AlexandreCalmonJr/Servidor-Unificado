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
const crypto = require('crypto');
const logger = require('./src/services/Logger'); // Integrated Logger

const store = new Store();

function buildServerUrl(host, port) {
    const normalizedHost = String(host || '').trim();
    const normalizedPort = String(port || '3000').trim();
    if (!normalizedHost) return '';
    if (/^https?:\/\//i.test(normalizedHost)) return normalizedHost.replace(/\/+$/, '');

    const allowHttp = String(process.env.MDM_ALLOW_HTTP || '').toLowerCase() === 'true';
    const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(normalizedHost);
    const protocol = allowHttp || isLoopback ? 'http' : 'https';
    return `${protocol}://${normalizedHost}:${normalizedPort}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto
        .pbkdf2Sync(String(password || ''), salt, 120000, 32, 'sha256')
        .toString('hex');
    return { salt, hash };
}

function verifyPassword(password, storedHash, salt) {
    if (!storedHash || !salt) return false;
    const candidate = hashPassword(password, salt).hash;
    const a = Buffer.from(candidate, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function migrateAdminPassword(settings = {}) {
    if (settings.adminPasswordHash && settings.adminPasswordSalt) {
        return settings;
    }

    const legacyPassword = settings.adminPassword || process.env.ADMIN_PASSWORD;
    if (!legacyPassword) {
        return settings;
    }

    const { salt, hash } = hashPassword(legacyPassword);
    const migrated = {
        ...settings,
        adminPasswordSalt: salt,
        adminPasswordHash: hash,
    };
    delete migrated.adminPassword;
    store.set('settings', migrated);
    logger.info('Admin password migrated to hash storage');
    return migrated;
}

// --- AUTO-PROVISIONAMENTO (EXTRAÇÃO DE TOKEN DO NOME DO ARQUIVO) ---
// Formato esperado: "UnifiedAgent_192.168.0.1_3000_<TOKEN>.exe"
const fileName = path.basename(process.execPath);
logger.info(`Starting execution from: ${fileName}`);

// Aceita "UnifiedAgent_", "UnifiedDesktop-", IP (pode conter traços se ipv6), porta e token 64/32 chars
const autoProvMatch = fileName.match(/Unified(?:Agent|Desktop)[_-]+([a-zA-Z0-9.-]+)_(\d+)_([a-fA-F0-9]{32,64})\.exe/i) ||
    fileName.match(/UnifiedDesktop-([a-fA-F0-9]{64})\.exe/i); // Fallback to older format

if (autoProvMatch) {
    if (autoProvMatch.length === 4) {
        // Formato Completo: [1]=IP, [2]=Port, [3]=Token
        const extractedIp = autoProvMatch[1].replace(/-/g, ':'); // Restore IPv6 colons if they were replaced
        const extractedPort = autoProvMatch[2];
        const extractedToken = autoProvMatch[3];

        const prevToken = store.get('settings.token');
        if (prevToken !== extractedToken) {
            logger.info(`Zero-Touch Provisioning detected: IP=${extractedIp}, Port=${extractedPort}, Token=${extractedToken.substring(0, 10)}...`);
            store.set('settings.ip', extractedIp);
            store.set('settings.port', extractedPort);
            store.set('settings.token', extractedToken);
            store.set('settings.zeroTouch', true); // Marcação para a interface saber
        }
    } else if (autoProvMatch.length === 2) {
        // Formato Antigo: Apenas Token
        const extractedToken = autoProvMatch[1];
        if (store.get('settings.token') !== extractedToken) {
            logger.info(`Legacy Token Provisioning detected: ${extractedToken.substring(0, 10)}...`);
            store.set('settings.token', extractedToken);
        }
    }
}
// -------------------------------------------------------------------

let tray = null;
let win = null;
let isQuitting = false;

function resolveAppIconPath() {
    const candidates = [
        path.join(__dirname, '..', 'frontend', 'favicon.png'),
        path.join(__dirname, 'src', 'assets', 'icon.png'),
    ];
    for (const iconPath of candidates) {
        try {
            if (require('fs').existsSync(iconPath)) return iconPath;
        } catch (_) { /* noop */ }
    }
    return path.join(__dirname, 'src', 'assets', 'icon.png');
}

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
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        icon: resolveAppIconPath(),
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
        return migrateAdminPassword(store.get('settings', {
            ip: '',
            port: '3000',
            token: '',
            moduleId: '',
            sector: '',
            floor: '',
            assetName: '',
            interval: 300,
            forceLegacyMode: false,
            enableUsbMonitor: true,
            lockOnMinimize: true, // Default true for security
            zeroTouch: false
        }));
    });

    ipcMain.handle('save-settings', async (event, settings) => {
        // [CORREÇÃO] Busca as configurações atuais antes de sobrescrever
        const currentSettings = store.get('settings', {});

        const normalized = {
            // Se o frontend mandar vazio, mantém o que já estava salvo
            ip: String(settings.ip || currentSettings.ip || '').trim(),
            port: String(settings.port || currentSettings.port || '3000').trim(),
            token: String(settings.token || currentSettings.token || '').trim(),

            moduleId: String(settings.moduleId !== undefined ? settings.moduleId : currentSettings.moduleId || '').trim(),
            sector: String(settings.sector !== undefined ? settings.sector : currentSettings.sector || '').trim(),
            floor: String(settings.floor !== undefined ? settings.floor : currentSettings.floor || '').trim(),
            assetName: String(settings.assetName !== undefined ? settings.assetName : currentSettings.assetName || '').trim(),

            interval: Number(settings.interval) || currentSettings.interval || 300,

            // Booleanos precisam de checagem estrita para não virarem true/false acidentalmente
            forceLegacyMode: settings.forceLegacyMode !== undefined ? settings.forceLegacyMode === true : currentSettings.forceLegacyMode,
            enableUsbMonitor: settings.enableUsbMonitor !== undefined ? settings.enableUsbMonitor === true : (currentSettings.enableUsbMonitor !== false),
            lockOnMinimize: settings.lockOnMinimize !== undefined ? settings.lockOnMinimize === true : currentSettings.lockOnMinimize,
            adminPasswordSalt: currentSettings.adminPasswordSalt,
            adminPasswordHash: currentSettings.adminPasswordHash,
        };

        if (settings.adminPassword) {
            const { salt, hash } = hashPassword(settings.adminPassword);
            normalized.adminPasswordSalt = salt;
            normalized.adminPasswordHash = hash;
        }

        store.set('settings', normalized);
        logger.info('Settings updated', normalized);

        // Atualiza o serviço de background
        try {
            const commandPoller = require('./src/services/CommandPoller');
            await commandPoller.updateSettings(normalized);

            // [OPCIONAL/RECOMENDADO] Reinicia o polling se tivermos IP, Porta e Token
            if (normalized.ip && normalized.token && normalized.moduleId) {
                if (!commandPoller.isRunning) {  // ✅ SEM parênteses - é um getter
                    await commandPoller.start();
                }
            }
        } catch (e) {
            logger.warn('Failed to update CommandPoller settings', e.message);
        }

        return { success: true };
    });

    // ──────────────────────────────────────────────────
    // MÓDULOS
    // ──────────────────────────────────────────────────

    ipcMain.handle('fetch-modules', async (event, { ip, port, token }) => {
        try {
            const serverUrl = buildServerUrl(ip, port);
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'AUTH_TOKEN': token,
            };

            logger.info(`Fetching modules from ${serverUrl}`);
            const response = await axios.get(`${serverUrl}/api/modules`, {
                headers,
                timeout: 10000,
                proxy: false,
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
            const serverUrl = buildServerUrl(ip, port);
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'AUTH_TOKEN': token,
            };

            logger.info(`Testing connection to ${serverUrl}`);
            const response = await axios.get(`${serverUrl}/api/auth/validate`, {
                headers,
                timeout: 10000,
                proxy: false,
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
        const settings = migrateAdminPassword(store.get('settings', {}));
        if (!settings.adminPasswordHash || !settings.adminPasswordSalt) {
            if (!process.env.ADMIN_PASSWORD) {
                logger.warn('Admin password not configured. Set ADMIN_PASSWORD once to initialize local access.');
                return false;
            }
            const { salt, hash } = hashPassword(process.env.ADMIN_PASSWORD);
            store.set('settings.adminPasswordSalt', salt);
            store.set('settings.adminPasswordHash', hash);
            return verifyPassword(password, hash, salt);
        }
        return verifyPassword(password, settings.adminPasswordHash, settings.adminPasswordSalt);
    });

    // ──────────────────────────────────────────────────
    // PROVISIONING IPC
    // ──────────────────────────────────────────────────

    // Verifica se o token informado é um token de provisionamento
    ipcMain.handle('check-provisioning-token', async (event, { ip, port, token }) => {
        try {
            const serverUrl = buildServerUrl(ip, port);
            const response = await axios.get(
                `${serverUrl}/api/provisioning/tokens/${token}/status`,
                { timeout: 10000, proxy: false }
            );
            // 200 → token válido e ativo
            return { isProvisioningToken: true, valid: true, ...response.data };
        } catch (e) {
            const status = e.response?.status;
            const body = e.response?.data || {};

            // 410 = É um token de provisionamento, porém expirado ou esgotado
            if (status === 410) {
                return {
                    isProvisioningToken: true,
                    valid: false,
                    message: body.message || 'Token expirado ou esgotado',
                    ...body,
                };
            }

            // 404 = O token não existe no banco (pode ser um JWT admin)
            if (status === 404 || status === 400) {
                return { isProvisioningToken: false };
            }

            // Erro de rede ou inesperado
            return { isProvisioningToken: false, networkError: e.message };
        }
    });

    // Enrola este dispositivo usando token de provisionamento
    ipcMain.handle('enroll-device', async (event, { ip, port, token }) => {
        try {
            const DataCollector = require('./src/services/DataCollector');
            const info = await DataCollector.getCoreSystemInfo();
            const serverUrl = buildServerUrl(ip, port);
            const payload = {
                provisioning_token: token,
                device_id: info.serial_number,
                device_name: info.asset_name || info.hostname,
                device_model: info.model || os.hostname(),
                serial_number: info.serial_number,
                ip_address: info.ip_address,
                mac_address_radio: (info.mac_address_radio && info.mac_address_radio !== 'N/A')
                    ? info.mac_address_radio : null,
            };

            logger.info(`[Enroll] Provisionando: ${payload.device_name} (${payload.serial_number})`);
            const response = await axios.post(
                `${serverUrl}/api/provisioning/enroll`,
                payload,
                { timeout: 30000, proxy: false }
            );

            return {
                success: true,
                organization: response.data.organization,
                config_profile: response.data.config_profile,
                module_id: response.data.module_id,
                module_type: response.data.module_type,
                // Token de autenticação para uso contínuo pós-enrollment
                device_token: response.data.device_token,
                commands_count: response.data.commands_count,
            };
        } catch (e) {
            logger.error(`[Enroll] Erro: ${e.message}`);
            return { success: false, error: e.response?.data?.error || e.message };
        }
    });
}

// ──────────────────────────────────────────────────
// SYSTEM TRAY
// ──────────────────────────────────────────────────

function createTray() {
    const iconPath = resolveAppIconPath();
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
    const CommandExecutor = require('./src/services/CommandExecutor');
    const executor = new CommandExecutor(logger);

    // ✅ CORREÇÃO: Escutar os comandos que chegam do Poller e executá-los
    commandPoller.on('commands', async (commands) => {
        logger.info(`[main] Recebidos ${commands.length} comando(s) do servidor.`);
        for (const cmd of commands) {
            try {
                // Executa o comando localmente
                const result = await executor.execute(cmd);
                logger.info(`[main] Comando ${cmd.id} executado. Sucesso: ${result.success}`);

                // Reporta o resultado de volta para o servidor
                await commandPoller.reportCommandResult(cmd.id, result.success, result.result);
            } catch (err) {
                logger.error(`[main] Erro ao executar comando ${cmd.id}: ${err.message}`);
                await commandPoller.reportCommandResult(cmd.id, false, { stderr: err.message, exitCode: 1 });
            }
        }
    });

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
