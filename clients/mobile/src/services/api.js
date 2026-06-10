// clients/mobile/src/services/api.js
// Espelho dos headers do auth_service.dart do Flutter:
//   - Authorization: Bearer <token>
//   - AUTH_TOKEN: <token>   (fallback legado)
// Base URL construída de server_host + server_port (igual ao DeviceService._serverUrl)

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { buildServerUrl } from '../utils/serverUrl';

const api = axios.create({
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor — monta baseURL e headers dinamicamente (DeviceService → initialize)
api.interceptors.request.use(async (config) => {
    const host  = await SecureStore.getItemAsync('server_host');
    const port  = await SecureStore.getItemAsync('server_port');
    const protocol = await SecureStore.getItemAsync('server_protocol');
    const token = await SecureStore.getItemAsync('auth_token');

    if (host && port) {
        const baseUrl = buildServerUrl(host, port, protocol);
        config.baseURL = `${baseUrl}/api`;
    }

    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
        config.headers['AUTH_TOKEN']    = token; // fallback legado (igual ao Flutter)
    }

    return config;
}, (error) => Promise.reject(error));

// ──────────────────────────────────────────────────────────
// HELPERS DE URL E TOKEN (para uso direto sem interceptor)
// ──────────────────────────────────────────────────────────

export const getServerUrl = async () => {
    const host = await SecureStore.getItemAsync('server_host');
    const port = await SecureStore.getItemAsync('server_port');
    const protocol = await SecureStore.getItemAsync('server_protocol');
    if (!host || !port) return null;
    return buildServerUrl(host, port, protocol);
};

export const getAuthToken = async () => {
    return await SecureStore.getItemAsync('auth_token');
};

export const saveServerConfig = async (host, port, token) => {
    await SecureStore.setItemAsync('server_host', host);
    await SecureStore.setItemAsync('server_port', port);
    if (token) await SecureStore.setItemAsync('auth_token', token);
};

export default api;
