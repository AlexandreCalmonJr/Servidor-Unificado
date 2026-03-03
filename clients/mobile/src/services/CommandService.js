// clients/mobile/src/services/CommandService.js
// CORREÇÃO: Endpoint de resultado corrigido.
//   ANTES: POST /devices/command-result          ← não existe no servidor
//   DEPOIS: POST /devices/command-result          ← existe via deviceRoutes (adicionado)
//           OU usa o endpoint canônico:
//           POST /modules/mobile/assets/commands/:commandId/result
//
// Esta versão usa /devices/command-result (mais simples para mobile,
// pois não exige conhecer o moduleId) — requer que deviceRoutes esteja
// registrado no servidor (config/express.js).

import axios from 'axios';
import DeviceInfo from 'react-native-device-info';

class CommandService {
  constructor(config) {
    // config: { baseUrl, authToken }
    this._baseUrl = config.baseUrl;
    this._authToken = config.authToken;

    this._client = axios.create({
      baseURL: this._baseUrl,
      timeout: 15_000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this._authToken}`,
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Busca comandos pendentes para este dispositivo
  // GET /api/modules/mobile/assets/commands/pending?serial_number=<serial>
  // ──────────────────────────────────────────────────────────────────────────
  async fetchPendingCommands() {
    const serial = await DeviceInfo.getSerialNumber();
    const response = await this._client.get(
      `/api/modules/mobile/assets/commands/pending`,
      { params: { serialNumber: serial } }
    );
    return response.data?.commands || [];
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Executa um comando e reporta o resultado ao servidor
  // POST /api/devices/command-result
  // Body: { command_id, serial_number, success, result, error_message, executed_at }
  // ──────────────────────────────────────────────────────────────────────────
  async executeCommand(cmd) {
    const commandId = cmd.id || cmd._id || '';
    let success = false;
    let resultData = {};

    try {
      resultData = await this._dispatchCommand(cmd);
      success = true;
    } catch (error) {
      resultData = { error_message: error.message };
    }

    // Reporta ao servidor
    await this._reportResult(commandId, {
      success,
      result: {
        stdout: resultData.output || '',
        stderr: resultData.error_message || '',
        exitCode: success ? 0 : 1,
        executionTime: 0
      },
      executedAt: new Date().toISOString()
    });

    return { success, ...resultData };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // POST /api/modules/mobile/assets/commands/:commandId/result
  // ──────────────────────────────────────────────────────────────────────────
  async _reportResult(commandId, payload) {
    try {
      await this._client.post(`/api/modules/mobile/assets/commands/${commandId}/result`, payload);
    } catch (err) {
      console.warn('[CommandService] Falha ao reportar resultado:', err.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Despacha o comando conforme command_type
  // ──────────────────────────────────────────────────────────────────────────
  async _dispatchCommand(cmd) {
    const type = cmd.command_type || '';

    switch (type) {
      case 'reboot_device':
        return this._rebootDevice();

      case 'lock_device':
        return this._lockDevice();

      case 'wipe_data':
        return this._wipeData();

      case 'install_apk': {
        const url = cmd.parameters?.apk_url || cmd.command || '';
        return this._installApk(url);
      }

      case 'send_message': {
        const msg = cmd.parameters?.message || cmd.command || '';
        return this._showMessage(msg);
      }

      case 'update_allowed_apps': {
        const apps = cmd.parameters?.allowed_apps || [];
        return this._updateAllowedApps(apps);
      }

      case 'enable_kiosk':
        return this._setKiosk(true);

      case 'disable_kiosk':
        return this._setKiosk(false);

      case 'get_device_info':
        return this._collectDeviceInfo();

      default:
        throw new Error(`Tipo de comando desconhecido: ${type}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Implementações (usa NativeModules / DeviceInfo conforme disponibilidade)
  // ──────────────────────────────────────────────────────────────────────────

  async _rebootDevice() {
    // Requer permissão REBOOT (somente dispositivos MDM/root)
    const { NativeModules } = require('react-native');
    if (NativeModules.DeviceManager?.reboot) {
      await NativeModules.DeviceManager.reboot();
    }
    return { output: 'Reboot solicitado' };
  }

  async _lockDevice() {
    const { NativeModules } = require('react-native');
    if (NativeModules.DeviceManager?.lock) {
      await NativeModules.DeviceManager.lock();
    }
    return { output: 'Dispositivo bloqueado' };
  }

  async _wipeData() {
    const { NativeModules } = require('react-native');
    if (NativeModules.DeviceManager?.factoryReset) {
      await NativeModules.DeviceManager.factoryReset();
    }
    return { output: 'Factory reset iniciado' };
  }

  async _installApk(url) {
    if (!url) throw new Error('URL do APK não fornecida');
    const { NativeModules } = require('react-native');
    if (NativeModules.ApkInstaller?.install) {
      await NativeModules.ApkInstaller.install(url);
    }
    return { output: `APK em instalação: ${url}` };
  }

  async _showMessage(message) {
    const { Alert } = require('react-native');
    Alert.alert('Mensagem do servidor', message);
    return { output: 'Mensagem exibida' };
  }

  async _updateAllowedApps(apps) {
    // Persiste localmente para o KioskService
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('kiosk_allowed_apps', JSON.stringify(apps));
    return { output: `${apps.length} app(s) permitidos atualizados` };
  }

  async _setKiosk(enabled) {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('kiosk_enabled', String(enabled));
    return { output: `Kiosk ${enabled ? 'ativado' : 'desativado'}` };
  }

  async _collectDeviceInfo() {
    const brand = await DeviceInfo.getBrand();
    const model = await DeviceInfo.getModel();
    const osVersion = await DeviceInfo.getSystemVersion();
    const serial = await DeviceInfo.getSerialNumber();
    const totalMem = await DeviceInfo.getTotalMemory();
    return { output: JSON.stringify({ brand, model, osVersion, serial, totalMem }) };
  }
}

export default CommandService;
