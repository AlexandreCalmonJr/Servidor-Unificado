// clients/mobile/src/context/AuthContext.js
// Espelho exato de DeviceService (main.dart) + settings_screen.dart
//
// Campos persistidos (idênticos ao SharedPreferences do Flutter):
//   server_host, server_port, auth_token, imei, serial_number,
//   sector, floor, data_interval, heartbeat_interval, command_check_interval

import React, { createContext, useState, useEffect, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Network from 'expo-network';
import * as Battery from 'expo-battery';
import * as Cellular from 'expo-cellular';
import { Platform } from 'react-native';
import { buildServerUrl } from '../utils/serverUrl';
import {
    hasLocalAdminPassword,
    setLocalAdminPassword as storeLocalAdminPassword,
    verifyLocalAdminPassword,
} from '../utils/localAdminPassword';

export const AuthContext = createContext();

// Login local validado por hash armazenado no SecureStore.

export const AuthProvider = ({ children }) => {
    const [isLoading, setIsLoading]       = useState(true);
    const [isLoggedIn, setIsLoggedIn]     = useState(false);
    const [isConfigured, setIsConfigured] = useState(false); // server configurado
    const [isRegistered, setIsRegistered] = useState(false); // device registrado no servidor
    const [settings, setSettings]         = useState(null);
    const [deviceInfo, setDeviceInfo]     = useState({});
    const [serverUrl, setServerUrl]       = useState('');

    // ──────────────────────────────────────────────────
    // BOOTSTRAP  (main.dart → inicialização)
    // ──────────────────────────────────────────────────

    useEffect(() => {
        bootstrapAsync();
    }, []);

    const bootstrapAsync = async () => {
        try {
            // Lê configurações do SecureStore (espelho SharedPreferences do Flutter)
            const host     = await SecureStore.getItemAsync('server_host');
            const port     = await SecureStore.getItemAsync('server_port');
            const token    = await SecureStore.getItemAsync('auth_token');
            const serial   = await SecureStore.getItemAsync('serial_number');
            const loggedIn = await SecureStore.getItemAsync('is_logged_in');
            const registered = await SecureStore.getItemAsync('device_registered');

            if (host && port && token) {
                const protocol = await SecureStore.getItemAsync('server_protocol');
                const url = buildServerUrl(host, port, protocol);
                setServerUrl(url);
                setIsConfigured(true);

                const s = await _loadAllSettings();
                setSettings(s);
            }

            if (registered === 'true') {
                setIsRegistered(true);
            }

            if (loggedIn === 'true') {
                setIsLoggedIn(true);
            }

            // Coleta info do dispositivo (main.dart → _updateDeviceStatus)
            await _refreshDeviceInfo();

        } catch (e) {
            console.error('[AuthContext] Bootstrap falhou:', e);
        } finally {
            setIsLoading(false);
        }
    };

    // ──────────────────────────────────────────────────
    // COLETA INFO DO DISPOSITIVO  (main.dart → _updateDeviceStatus)
    // Campos idênticos ao _deviceInfo do Flutter
    // ──────────────────────────────────────────────────

    const _refreshDeviceInfo = async () => {
        try {
            const serial   = await SecureStore.getItemAsync('serial_number');
            const imei     = await SecureStore.getItemAsync('imei');
            const sector   = await SecureStore.getItemAsync('sector') || 'N/A';
            const floor    = await SecureStore.getItemAsync('floor')  || 'N/A';

            let ipAddress    = 'N/A';
            let wifiBSSID    = 'N/A';
            let wifiName     = 'N/A';

            try {
                const netState = await Network.getNetworkStateAsync();
                if (netState.isConnected) {
                    ipAddress = await Network.getIpAddressAsync() || 'N/A';
                }
            } catch (_) {}

            let batteryLevel = 0;
            try {
                batteryLevel = Math.round((await Battery.getBatteryLevelAsync()) * 100);
            } catch (_) {}

            // Android ID como identificador primário (igual ao androidInfo.id no Flutter)
            let secureAndroidId = 'N/A';
            try {
                secureAndroidId = (Platform.OS === 'android'
                    ? Application.androidId
                    : Application.applicationId) || 'N/A';
            } catch (_) {}

            const info = {
                // Idêntico ao _deviceInfo no main.dart do Flutter
                device_name:        Device.deviceName  || 'Unknown',
                device_model:       Device.modelName   || 'Unknown',
                device_id:          Device.osInternalBuildId || secureAndroidId,
                serial_number:      serial || secureAndroidId,
                imei:               imei   || 'N/A',
                battery:            batteryLevel,
                network:            wifiName,
                host:               Device.deviceName  || 'Unknown',
                sector,
                floor,
                mac_address_radio:  wifiBSSID,
                ip_address:         ipAddress,
                wifi_ipv6:          'N/A',
                wifi_gateway_ip:    'N/A',
                wifi_broadcast:     'N/A',
                wifi_submask:       'N/A',
                last_seen:          new Date().toISOString(),
                is_mobile:          true,
                operating_system:   `${Platform.OS} ${Device.osVersion || ''}`.trim(),
                os_version:         Device.osVersion  || 'N/A',
                manufacturer:       Device.manufacturer || 'N/A',
                secure_android_id:  secureAndroidId,
            };

            setDeviceInfo(info);
            return info;
        } catch (e) {
            console.error('[AuthContext] Erro ao coletar info do dispositivo:', e);
            return {};
        }
    };

    // ──────────────────────────────────────────────────
    // SETTINGS  (settings_screen.dart → SharedPreferences)
    // ──────────────────────────────────────────────────

    const _loadAllSettings = async () => {
        return {
            serverHost:             (await SecureStore.getItemAsync('server_host'))             || '192.168.0.183',
            serverPort:             (await SecureStore.getItemAsync('server_port'))             || '3000',
            serverProtocol:         (await SecureStore.getItemAsync('server_protocol'))         || '',
            authToken:              (await SecureStore.getItemAsync('auth_token'))              || '',
            imei:                   (await SecureStore.getItemAsync('imei'))                    || '',
            serialNumber:           (await SecureStore.getItemAsync('serial_number'))           || '',
            sector:                 (await SecureStore.getItemAsync('sector'))                  || '',
            floor:                  (await SecureStore.getItemAsync('floor'))                   || '',
            dataInterval:           parseInt(await SecureStore.getItemAsync('data_interval'))   || 10,
            heartbeatInterval:      parseInt(await SecureStore.getItemAsync('heartbeat_interval')) || 3,
            commandCheckInterval:   parseInt(await SecureStore.getItemAsync('command_check_interval')) || 1,
        };
    };

    const saveSettings = async (newSettings) => {
        // Persiste no SecureStore (espelho SharedPreferences do Flutter)
        await SecureStore.setItemAsync('server_host',             String(newSettings.serverHost      || ''));
        await SecureStore.setItemAsync('server_port',             String(newSettings.serverPort      || '3000'));
        await SecureStore.setItemAsync('server_protocol',         String(newSettings.serverProtocol  || ''));
        await SecureStore.setItemAsync('auth_token',              String(newSettings.authToken        || ''));
        await SecureStore.setItemAsync('imei',                    String(newSettings.imei             || ''));
        await SecureStore.setItemAsync('serial_number',           String(newSettings.serialNumber     || ''));
        await SecureStore.setItemAsync('sector',                  String(newSettings.sector           || ''));
        await SecureStore.setItemAsync('floor',                   String(newSettings.floor            || ''));
        await SecureStore.setItemAsync('data_interval',           String(newSettings.dataInterval     || 10));
        await SecureStore.setItemAsync('heartbeat_interval',      String(newSettings.heartbeatInterval || 3));
        await SecureStore.setItemAsync('command_check_interval',  String(newSettings.commandCheckInterval || 1));

        if (newSettings.localAdminPassword) {
            await storeLocalAdminPassword(newSettings.localAdminPassword);
        }

        const url = buildServerUrl(
            newSettings.serverHost,
            newSettings.serverPort,
            newSettings.serverProtocol
        );
        setServerUrl(url);
        setIsConfigured(true);
        setSettings(newSettings);
        await _refreshDeviceInfo();
    };

    // ──────────────────────────────────────────────────
    // LOGIN LOCAL
    // ──────────────────────────────────────────────────

    const login = async (password) => {
        const configured = await hasLocalAdminPassword();
        const success = configured && await verifyLocalAdminPassword(password);
        if (success) {
            await SecureStore.setItemAsync('is_logged_in', 'true');
            setIsLoggedIn(true);
        }
        return success;
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('is_logged_in');
        setIsLoggedIn(false);
    };

    // ──────────────────────────────────────────────────
    // DEVICE REGISTRATION
    // ──────────────────────────────────────────────────

    const finishRegistration = async (deviceId) => {
        await SecureStore.setItemAsync('device_registered', 'true');
        await SecureStore.setItemAsync('device_id', String(deviceId));
        setIsRegistered(true);
    };

    const getDeviceInfo = async () => {
        return await _refreshDeviceInfo();
    };

    return (
        <AuthContext.Provider value={{
            isLoading,
            isLoggedIn,
            isConfigured,
            isRegistered,
            settings,
            deviceInfo,
            serverUrl,
            login,
            logout,
            saveSettings,
            setLocalAdminPassword: storeLocalAdminPassword,
            verifyLocalAdminPassword,
            finishRegistration,
            getDeviceInfo,
            refreshDeviceInfo: _refreshDeviceInfo,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
