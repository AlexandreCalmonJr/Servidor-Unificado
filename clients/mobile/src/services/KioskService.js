// clients/mobile/src/services/KioskService.js
// Wrapper JS para o KioskModule nativo + gerenciamento de apps permitidos

import { NativeModules, Alert, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import api from './api';

const { KioskModule } = NativeModules;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// KIOSK MODE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function startKioskMode() {
    if (Platform.OS !== 'android') {
        console.warn('[KioskService] Kiosk mode só disponível no Android');
        return false;
    }
    if (!KioskModule) {
        console.error('[KioskService] KioskModule nativo não disponível. Verifique o bare workflow.');
        return false;
    }
    try {
        const result = await KioskModule.startKioskMode();
        await SecureStore.setItemAsync('kiosk_mode', 'true');
        console.log('[KioskService] ✅ Kiosk mode ativado');
        return result;
    } catch (e) {
        console.error('[KioskService] ❌ Erro ao ativar kiosk:', e.message);
        return false;
    }
}

export async function stopKioskMode() {
    if (!KioskModule) return false;
    try {
        const result = await KioskModule.stopKioskMode();
        await SecureStore.setItemAsync('kiosk_mode', 'false');
        console.log('[KioskService] ✅ Kiosk mode desativado');
        return result;
    } catch (e) {
        console.error('[KioskService] ❌ Erro ao desativar kiosk:', e.message);
        return false;
    }
}

export async function isKioskActive() {
    if (!KioskModule) return false;
    try {
        return await KioskModule.isKioskActive();
    } catch (_) {
        return false;
    }
}

export async function setAsDefaultLauncher() {
    if (!KioskModule) return false;
    try {
        const isDeviceOwner = await KioskModule.setAsDefaultLauncher();
        if (!isDeviceOwner) {
            Alert.alert(
                '🏠 Definir Launcher',
                'Selecione "MDM Agent" como o launcher padrão na tela que abriu.',
            );
        }
        return true;
    } catch (e) {
        console.error('[KioskService] Erro ao definir launcher:', e.message);
        return false;
    }
}

export async function launchApp(packageName) {
    if (!KioskModule) return false;
    try {
        return await KioskModule.launchApp(packageName);
    } catch (e) {
        console.error(`[KioskService] Erro ao abrir ${packageName}:`, e.message);
        return false;
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// APPS INSTALADOS (via módulo nativo)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getInstalledApps() {
    if (!KioskModule) return [];
    try {
        return await KioskModule.getInstalledApps();
    } catch (e) {
        console.error('[KioskService] Erro ao buscar apps instalados:', e.message);
        return [];
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// APPS PERMITIDOS (vindos do servidor via comando ou GET)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ALLOWED_APPS_KEY = 'allowed_apps';

// Salva a lista de apps permitidos localmente
export async function saveAllowedApps(packages) {
    await SecureStore.setItemAsync(ALLOWED_APPS_KEY, JSON.stringify(packages));
    console.log(`[KioskService] ✅ ${packages.length} app(s) permitido(s) salvo(s)`);
}

// Lê a lista de apps permitidos do armazenamento local
export async function loadAllowedApps() {
    try {
        const raw = await SecureStore.getItemAsync(ALLOWED_APPS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (_) {
        return [];
    }
}

// Busca a lista do servidor (GET /api/devices/:serialNumber/allowed-apps)
export async function fetchAllowedAppsFromServer() {
    try {
        const serialNumber = await SecureStore.getItemAsync('serial_number');
        if (!serialNumber) return null;

        const response = await api.get(`/devices/${serialNumber}/allowed-apps`);
        const packages  = response.data?.allowed_apps || response.data?.packages || [];

        if (packages.length > 0) {
            await saveAllowedApps(packages);
            console.log(`[KioskService] 📥 ${packages.length} app(s) sincronizado(s) do servidor`);
        }

        return packages;
    } catch (e) {
        console.warn('[KioskService] Não foi possível buscar apps do servidor:', e.message);
        return null;
    }
}

// Cruza apps instalados com apps permitidos
export async function getAllowedInstalledApps() {
    const [installed, allowed] = await Promise.all([
        getInstalledApps(),
        loadAllowedApps(),
    ]);

    // Se não há lista de permitidos → mostra todos os instalados
    if (!allowed || allowed.length === 0) {
        return installed;
    }

    return installed.filter(app => allowed.includes(app.packageName));
}

// Estado persistido do launcher mode
export async function getLauncherMode() {
    const mode = await SecureStore.getItemAsync('launcher_mode');
    return mode === 'true';
}

export async function setLauncherMode(enabled) {
    await SecureStore.setItemAsync('launcher_mode', enabled ? 'true' : 'false');
}
