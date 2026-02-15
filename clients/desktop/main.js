const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
const si = require('systeminformation');
const fs = require('fs');
const os = require('os');

const store = new Store();
let tray = null;
let win = null;

function createWindow() {
    win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // Simplifying for prototype
        },
        frame: false, // Frameless for custom UI (Glassmorphism)
        transparent: true,
        backgroundColor: '#00000000',
        icon: path.join(__dirname, 'src/assets/icon.png') // Ensure this exists or use default
    });

    win.loadFile('src/index.html');

    // IPC Handlers
    ipcMain.on('minimize-window', () => win.hide()); // Minimize to tray by hiding
    ipcMain.on('maximize-window', () => {
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
    });
    ipcMain.on('close-window', () => win.hide()); // Close to tray

    // System Info
    ipcMain.handle('get-system-info', async () => {
        try {
            const cpu = await si.cpu();
            const mem = await si.mem();
            const osInfo = await si.osInfo();
            const network = await si.networkInterfaces();
            return { cpu, mem, os: osInfo, network };
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
            module: '',
            deviceName: os.hostname()
        });
    });

    // Verify Admin Password (Simple hardcoded for now, or env var)
    ipcMain.handle('verify-admin', (event, password) => {
        // In production, this should be hashed or validated against the server
        return password === 'admin123';
    });
}

function createTray() {
    const iconPath = path.join(__dirname, 'src/assets/icon.png');
    // Fallback icon if not exists (usually just app icon in dev)
    tray = new Tray(iconPath); // Ensure you have an icon!

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Abrir Agent', click: () => win.show() },
        {
            label: 'Sair', click: () => {
                app.isQuiting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Unified Agent - Monitorando');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        win.isVisible() ? win.hide() : win.show();
    });
}

app.whenReady().then(() => {
    createWindow();
    // createTray(); // Uncomment when icon is present, otherwise it might fail without a valid icon path

    // Mock Tray for now if no icon - REMOVE THIS BLOCK AND UNCOMMENT ABOVE IN PROD
    try {
        createTray();
    } catch (e) {
        console.log("Tray not created (missing icon?):", e);
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // Start Command Poller
    const commandPoller = require('./src/services/CommandPoller');
    commandPoller.start();
});

app.on('window-all-closed', () => {
    // Do not quit, just keep running in tray
    if (process.platform !== 'darwin') {
        // app.quit(); 
    }
});
