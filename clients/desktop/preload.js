const { contextBridge, ipcRenderer } = require('electron');

const invokeChannels = new Set([
    'get-logs',
    'clear-logs',
    'get-settings',
    'save-settings',
    'fetch-modules',
    'test-connection',
    'force-sync',
    'get-service-status',
    'stop-service',
    'start-service',
    'get-system-info',
    'verify-admin',
    'check-provisioning-token',
    'enroll-device',
]);

const sendChannels = new Set([
    'minimize-window',
    'maximize-window',
    'close-window',
    'log-message',
]);

const onChannels = new Set([
    'lock-app',
]);

contextBridge.exposeInMainWorld('electronAPI', {
    invoke: (channel, payload) => {
        if (!invokeChannels.has(channel)) {
            return Promise.reject(new Error(`IPC channel not allowed: ${channel}`));
        }
        return ipcRenderer.invoke(channel, payload);
    },
    send: (channel, payload) => {
        if (!sendChannels.has(channel)) return;
        ipcRenderer.send(channel, payload);
    },
    on: (channel, callback) => {
        if (!onChannels.has(channel) || typeof callback !== 'function') return;
        const wrapped = (_event, ...args) => callback(...args);
        ipcRenderer.on(channel, wrapped);
    },
});
