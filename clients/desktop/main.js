const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const si = require('systeminformation');
const fs = require('fs');

const store = new Store();

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // Simplifying for prototype - enabling direct node access in renderer
        },
        frame: false, // Frameless for custom UI (Glassmorphism)
        transparent: true,
        backgroundColor: '#00000000'
        // icon: path.join(__dirname, 'assets/icon.png')
    });

    win.loadFile('src/index.html');

    // Open DevTools in dev mode
    // win.webContents.openDevTools();

    // IPC Handlers
    ipcMain.on('minimize-window', () => win.minimize());
    ipcMain.on('maximize-window', () => {
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
    });
    ipcMain.on('close-window', () => win.close());

    // System Info
    ipcMain.handle('get-system-info', async () => {
        try {
            const cpu = await si.cpu();
            const mem = await si.mem();
            const os = await si.osInfo();
            const network = await si.networkInterfaces();
            return { cpu, mem, os, network };
        } catch (error) {
            console.error(error);
            return null;
        }
    });

    // Save Settings
    ipcMain.handle('save-settings', (event, settings) => {
        store.set('settings', settings);
        return true;
    });

    // Get Settings
    ipcMain.handle('get-settings', () => {
        return store.get('settings', {
            serverUrl: 'http://localhost:3000',
            authToken: '',
            deviceName: os.hostname() // default
        });
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
