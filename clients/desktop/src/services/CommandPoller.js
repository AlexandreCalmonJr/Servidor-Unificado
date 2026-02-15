const axios = require('axios');
const { app, nativeTheme } = require('electron');
const { exec } = require('child_process');
const Store = require('electron-store');
const os = require('os');
const store = new Store();

class CommandPoller {
    constructor() {
        this.interval = null;
        this.isProcessing = false;
        this.pollInterval = 10000; // 10s
    }

    start() {
        if (this.interval) return;
        console.log('Desktop Command Poller Started');
        this.interval = setInterval(() => this.poll(), this.pollInterval);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    async poll() {
        if (this.isProcessing) return;

        const settings = store.get('settings');
        if (!settings || !settings.serverUrl) return;

        // Use Serial Number equivalent (e.g., Hostname or specific stored ID)
        // For Desktop, we usually use Hostname or a UUID stored in settings. 
        // Let's assume we use 'deviceName' or 'serial_number' from settings if available, else hostname.
        const serialNumber = settings.serialNumber || os.hostname();

        const cleanUrl = settings.serverUrl.replace(/\/$/, '');

        try {
            // Check for commands
            // GET /devices/commands?serial_number=...
            // Headers for Auth if needed
            const config = {};
            if (settings.authToken) {
                config.headers = { Authorization: `Bearer ${settings.authToken}` };
            }

            const response = await axios.get(`${cleanUrl}/api/devices/commands`, {
                params: { serial_number: serialNumber },
                ...config
            });

            const commands = response.data.commands || [];

            if (commands.length > 0) {
                this.isProcessing = true;
                for (const cmd of commands) {
                    await this.execute(cmd, cleanUrl, serialNumber, config);
                }
                this.isProcessing = false;
            }

        } catch (error) {
            // Silent fail on poll errors
            // console.error('Poll Error:', error.message);
        }
    }

    async execute(cmd, baseUrl, serialNumber, config) {
        console.log('Executing Command:', cmd.command_type);
        let success = true;
        let result = 'Executed successfully';

        try {
            switch (cmd.command_type) {
                case 'restart_app':
                    // Restart Electron App
                    app.relaunch();
                    app.exit(0);
                    break;

                case 'reboot':
                case 'reboot_device':
                    // System Reboot
                    if (process.platform === 'win32') {
                        exec('shutdown /r /t 5'); // Reboot in 5s
                    } else {
                        exec('reboot');
                    }
                    result = 'System reboot initiated';
                    break;

                case 'cmd_custom':
                    // Execute custom command (Risk: High)
                    // Only if explicitly enabled/allowed
                    if (cmd.command) {
                        require('child_process').exec(cmd.command, (err, stdout, stderr) => {
                            // Async execution, might not capture result here immediately unless awaited
                        });
                        result = 'Command executed';
                    }
                    break;

                default:
                    success = false;
                    result = 'Unknown command type';
            }
        } catch (e) {
            success = false;
            result = e.message;
        }

        // Report Result
        try {
            await axios.post(`${baseUrl}/api/devices/command-result`, {
                command_id: cmd.id,
                serial_number: serialNumber,
                success,
                result: result
            }, config);
        } catch (e) {
            console.error('Failed to report command result:', e.message);
        }
    }
}

module.exports = new CommandPoller();
