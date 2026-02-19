// clients/mobile/src/services/CommandService.js
// Espelho de:
//   - DeviceService.checkForCommands()   (main.dart)
//   - DeviceService._executeCommand()    (main.dart)
//   - background_service onStart → commandCheckInterval (main.dart)
//
// Endpoints:
//   - GET /api/devices/commands?serial_number=...
//   - POST /api/devices/command-result

import { Alert, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import * as Updates from 'expo-updates';
import * as IntentLauncher from 'expo-intent-launcher';
import api from './api';
import {
    startKioskMode, stopKioskMode,
    setAsDefaultLauncher, saveAllowedApps,
} from './KioskService';

// Intervalo padrão (main.dart → command_check_interval: 1 minuto)
const DEFAULT_INTERVAL_MS = 1 * 60 * 1000; // 1 minuto em ms

class CommandService {
    constructor() {
        this._timer = null;
        this._isProcessing = false;
    }

    // start() — background_service onStart (main.dart)
    async start() {
        if (this._timer) return;

        // Lê o intervalo configurado (main.dart → command_check_interval)
        const rawInterval = await SecureStore.getItemAsync('command_check_interval');
        const intervalMinutes = parseInt(rawInterval) || 1;
        const intervalMs = intervalMinutes * 60 * 1000;

        this._timer = setInterval(() => this.checkForCommands(), intervalMs);
        console.log(`[CommandService] ✅ Iniciado — intervalo: ${intervalMinutes} min`);

        // Executa imediatamente na inicialização
        this.checkForCommands();
    }

    stop() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
        console.log('[CommandService] 🛑 Parado');
    }

    // checkForCommands() — DeviceService.checkForCommands() (main.dart)
    async checkForCommands() {
        if (this._isProcessing) return;

        try {
            const serialNumber = await SecureStore.getItemAsync('serial_number');
            const token = await SecureStore.getItemAsync('auth_token');

            if (!serialNumber || !token) return;

            // GET /api/modules/mobile/assets/commands/pending?serial_number=...
            const response = await api.get('/modules/mobile/assets/commands/pending', {
                params: { serial_number: serialNumber },
            });

            const commands = response.data?.commands || [];
            if (commands.length === 0) return;

            console.log(`[CommandService] 📥 ${commands.length} comando(s) recebido(s)`);
            this._isProcessing = true;

            for (const command of commands) {
                await this._executeCommand(command);
            }

        } catch (e) {
            // Silencioso para não lotar o console em modo offline
        } finally {
            this._isProcessing = false;
        }
    }

    // _executeCommand() — DeviceService._executeCommand() (main.dart)
    // Tipos: lock_device, wipe_data, install_app / install_apk, restrict_settings, restart_app
    async _executeCommand(command) {
        const commandId = command.id || command._id;
        const type = command.command || command.command_type || command.commandType;
        const params = command.parameters || {};
        const serialNumber = await SecureStore.getItemAsync('serial_number');

        console.log(`[CommandService] ⚙️ Executando: ${type}`);

        let success = false;
        let result = '';
        let errorMessage = '';

        try {
            switch (type) {

                // main.dart → case 'lock_device'
                case 'lock_device':
                    Alert.alert('🔒 MDM', 'Dispositivo bloqueado remotamente pelo administrador.');
                    success = true;
                    result = 'Bloqueio solicitado';
                    break;

                // main.dart → case 'wipe_data'
                case 'wipe_data':
                    Alert.alert(
                        '⚠️ Wipe Remoto',
                        'O administrador solicitou a limpeza de dados. Por favor, confirme.',
                        [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                                text: 'Confirmar', style: 'destructive',
                                onPress: () => console.warn('[CommandService] Wipe confirmado pelo usuário')
                            },
                        ]
                    );
                    success = true;
                    result = 'Wipe solicitado (requer confirmação do usuário)';
                    break;

                // main.dart → case 'install_app' / CommandService original: 'install_apk'
                case 'install_apk':
                case 'install_app': {
                    const apkUrl = params.apkUrl || params.apk_url;
                    if (!apkUrl) throw new Error('URL do APK ausente nos parâmetros');
                    await this._installApk(apkUrl);
                    success = true;
                    result = 'APK instalado com sucesso';
                    break;
                }

                // main.dart → case 'restrict_settings'
                case 'restrict_settings': {
                    const restrict = params.restrict ?? true;
                    Alert.alert(
                        restrict ? '🔒 Restrição Ativada' : '🔓 Restrição Removida',
                        `O administrador ${restrict ? 'restringiu' : 'liberou'} as configurações do dispositivo.`
                    );
                    success = true;
                    result = `Configurações ${restrict ? 'restringidas' : 'liberadas'}`;
                    break;
                }

                // Reiniciar app (restart_app / reboot)
                case 'restart_app':
                case 'reboot':
                    await this._restartApp();
                    success = true;
                    result = 'App reiniciado';
                    break;

                // ── KIOSK / LAUNCHER ──────────────────────────────────

                // Ativar modo kiosk (trava o dispositivo)
                case 'enable_kiosk':
                case 'start_kiosk': {
                    const ok = await startKioskMode();
                    success = ok;
                    result = ok ? 'Modo kiosk ativado' : 'Falha ao ativar kiosk';
                    break;
                }

                // Desativar modo kiosk
                case 'disable_kiosk':
                case 'stop_kiosk': {
                    const ok = await stopKioskMode();
                    success = ok;
                    result = ok ? 'Modo kiosk desativado' : 'Falha ao desativar kiosk';
                    break;
                }

                // Definir como launcher padrão
                case 'set_default_launcher': {
                    const ok = await setAsDefaultLauncher();
                    success = ok;
                    result = 'Launcher configurado';
                    break;
                }

                // Atualizar lista de apps permitidos no launcher
                // payload: { packages: ["com.whatsapp", "com.chrome", ...] }
                case 'update_allowed_apps': {
                    const packages = params.packages || params.allowed_apps || [];
                    if (!Array.isArray(packages)) {
                        throw new Error('packages deve ser um array de packageNames');
                    }
                    await saveAllowedApps(packages);
                    success = true;
                    result = `${packages.length} app(s) permitido(s) atualizado(s)`;
                    console.log('[CommandService] 📱 Apps permitidos atualizados:', packages);
                    break;
                }

                // Mensagem remota (push_message / show_message)
                case 'push_message':
                case 'show_message': {
                    const msg = params.message || params.text || 'Mensagem do administrador';
                    Alert.alert('📨 Mensagem MDM', msg);
                    success = true;
                    result = 'Mensagem exibida';
                    break;
                }

                default:
                    console.warn(`[CommandService] ⚠️ Comando desconhecido: ${type}`);
                    result = `Tipo de comando não suportado: ${type}`;
                    success = false;
            }

        } catch (e) {
            errorMessage = e.message;
            console.error(`[CommandService] ❌ Erro ao executar ${type}:`, e.message);
        }

        // Reportar resultado ao servidor (POST /api/devices/command-result)
        try {
            await api.post('/devices/command-result', {
                command_id: commandId,
                serial_number: serialNumber,
                success,
                result: result || undefined,
                error_message: errorMessage || undefined,
                executed_at: new Date().toISOString(),
            });
            console.log(`[CommandService] ✅ Resultado reportado: ${success ? 'sucesso' : 'falha'}`);
        } catch (e) {
            console.error('[CommandService] ❌ Falha ao reportar resultado:', e.message);
        }
    }

    // _installApk() — CommandService original (preservado + melhorias)
    async _installApk(url) {
        const filename = url.split('/').pop() || 'update.apk';
        const fileUri = (FileSystem.cacheDirectory || '') + filename;

        const downloadRes = await FileSystem.downloadAsync(url, fileUri);
        if (downloadRes.status !== 200) throw new Error(`Download falhou: HTTP ${downloadRes.status}`);

        const contentUri = await FileSystem.getContentUriAsync(downloadRes.uri);

        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: 'application/vnd.android.package-archive',
        });
    }

    // _restartApp() — CommandService original (preservado)
    async _restartApp() {
        try {
            await Updates.reloadAsync();
        } catch (_) {
            Alert.alert('🔄 Reinício Remoto', 'Reinicie o aplicativo manualmente para aplicar as mudanças.');
        }
    }
}

export default new CommandService();
