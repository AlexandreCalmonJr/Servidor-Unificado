import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Updates from 'expo-updates';
import api from './api';

const POLLING_INTERVAL = 10000; // 10 seconds

class CommandService {
    constructor() {
        this.interval = null;
        this.isProcessing = false;
    }

    start() {
        if (this.interval) return;
        this.interval = setInterval(() => this.pollCommands(), POLLING_INTERVAL);
        console.log('Command Service Started');
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    async pollCommands() {
        if (this.isProcessing) return;

        try {
            const deviceId = await SecureStore.getItemAsync('device_registered') === 'true'
                ? await SecureStore.getItemAsync('device_id') // Check if we stored serial there? 
                : null;

            // In DeviceRegisterScreen we sent 'serial_number' as IMEI/ID.
            // We should use that same ID to poll.
            // Let's assume we stored it or can retrieve it.
            // For now, let's use the 'device_id' key which logic says holds the ID/Serial.

            if (!deviceId) return;

            // Correct Endpoint: GET /devices/commands?serial_number=...
            const response = await api.get(`/devices/commands`, {
                params: { serial_number: deviceId }
            });

            const commands = response.data.commands || [];

            if (commands.length > 0) {
                this.isProcessing = true;
                for (const cmd of commands) {
                    await this.executeCommand(cmd);
                }
                this.isProcessing = false;
            }

        } catch (error) {
            // console.warn('Command poll failed', error);
        }
    }

    async executeCommand(command) {
        console.log('Executing Command:', command.command_type);
        const deviceId = await SecureStore.getItemAsync('device_id');

        try {
            switch (command.command_type) {
                case 'install_apk':
                    await this.installApk(command.parameters.apkUrl);
                    break;
                case 'restart_app':
                case 'reboot':
                    await this.restartApp();
                    break;
                default:
                    console.warn('Unknown command type:', command.command_type);
            }

            // Mark as executed
            await api.post('/devices/command-result', {
                command_id: command.id,
                serial_number: deviceId,
                success: true,
                result: 'Success'
            });

        } catch (error) {
            console.error('Command Execution Failed:', error);
            await api.post('/devices/command-result', {
                command_id: command.id,
                serial_number: deviceId,
                success: false,
                error_message: error.message
            });
        }
    }

    async installApk(url) {
        if (!url) throw new Error('URL invalid for APK');

        const filename = url.split('/').pop() || 'update.apk';
        const fileUri = FileSystem.cacheDirectory + filename;

        // 1. Download
        const downloadRes = await FileSystem.downloadAsync(url, fileUri);
        if (downloadRes.status !== 200) throw new Error('Download failed');

        // 2. Install (Intent)
        const contentUri = await FileSystem.getContentUriAsync(downloadRes.uri);

        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: 'application/vnd.android.package-archive'
        });
    }

    async restartApp() {
        try {
            await Updates.reloadAsync();
        } catch (e) {
            // Fallback for dev mode
            Alert.alert('Comando Remoto', 'Solicitação de reinício recebida. Reinicie o app manualmente.');
        }
    }
}

export default new CommandService();
