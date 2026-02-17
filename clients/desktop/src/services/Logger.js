const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');

class Logger {
    constructor() {
        this.logDir = path.join(app.getPath('userData'), 'logs');
        this.logFile = path.join(this.logDir, 'app.log');
        this.buffer = [];
        this.maxBufferParams = 200; // Keep last 200 logs in memory for UI

        this._init();
    }

    _init() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    _write(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message} ${data ? JSON.stringify(data) : ''}\n`;

        // Console output
        console.log(logEntry.trim());

        // File output
        try {
            fs.appendFileSync(this.logFile, logEntry);
        } catch (e) {
            console.error('Failed to write to log file:', e);
        }

        // Buffer for UI
        this.buffer.unshift({ timestamp, level, message, data });
        if (this.buffer.length > this.maxBufferParams) {
            this.buffer.pop();
        }

        // Rotate if too big (example: 5MB)
        this._checkRotation();
    }

    _checkRotation() {
        try {
            const stats = fs.statSync(this.logFile);
            if (stats.size > 5 * 1024 * 1024) { // 5MB
                const backup = path.join(this.logDir, `app_${Date.now()}.log`);
                fs.renameSync(this.logFile, backup);
            }
        } catch (_) { }
    }

    info(message, data) { this._write('INFO', message, data); }
    warn(message, data) { this._write('WARN', message, data); }
    error(message, data) { this._write('ERROR', message, data); }
    debug(message, data) { this._write('DEBUG', message, data); }

    getLogs() {
        return this.buffer;
    }

    clearLogs() {
        this.buffer = [];
        try {
            fs.writeFileSync(this.logFile, '');
        } catch (_) { }
    }
}

module.exports = new Logger();
