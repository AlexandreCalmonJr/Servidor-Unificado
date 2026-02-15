import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Dynamic Base URL Interceptor
api.interceptors.request.use(async (config) => {
    const serverUrl = await SecureStore.getItemAsync('server_url');
    if (serverUrl) {
        config.baseURL = serverUrl.replace(/\/$/, '') + '/api'; // Ensure no trailing slash and append /api
    }

    // Auth Token (User)
    const token = await SecureStore.getItemAsync('user_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Fleet/Device Token (for registration/handshake)
    const fleetToken = await SecureStore.getItemAsync('fleet_token');
    if (fleetToken) {
        config.headers['auth_token'] = fleetToken;
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

export const saveServerUrl = async (url) => {
    await SecureStore.setItemAsync('server_url', url);
};

export const getServerUrl = async () => {
    return await SecureStore.getItemAsync('server_url');
};

export default api;
