const WebSocket = require('ws');
const Device = require('../models/Device'); // Adjust path if necessary, assuming models/Device.js exists
const logger = require('../utils/logger');

class WebSocketServer {
    constructor(server) {
        if (WebSocketServer.instance) {
            return WebSocketServer.instance;
        }
        this.wss = new WebSocket.Server({ server, path: '/ws' });
        WebSocketServer.instance = this;
        this.init();
    }

    init() {
        logger.info('🔌 WebSocket Server initialized');

        this.wss.on('connection', (ws, req) => {
            const ip = req.socket.remoteAddress;
            logger.info(`🔌 New WebSocket connection from ${ip}`);

            ws.isAlive = true;
            ws.on('pong', () => {
                ws.isAlive = true;
            });

            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);
                    await this.handleMessage(ws, data, ip);
                } catch (error) {
                    logger.error('Error parsing WebSocket message:', error);
                }
            });

            ws.on('close', () => {
                logger.info(`🔌 WebSocket connection closed from ${ip}`);
                // Optional: Mark as offline on disconnect if desired, 
                // but user specifically requested "offline only if turned off" (via signal).
                // However, if we don't mark offline here, a crash/power cut leaves it online.
                // We will rely on the 'shutdown' message for immediate offline, 
                // and the periodic script for timeout-based offline.
                // OR we can mark offline here too. Let's stick to the 'shutdown' signal for now 
                // as the primary "immediate" trigger, and let the existing cron job handle timeouts 
                // if the socket just drops without a signal.
                // UPDATE: To be safe and responsive, we SHOULD mark offline on disconnect, 
                // because "computer off" usually means socket close.
                if (ws.deviceId) {
                    this.updateDeviceStatus(ws.deviceId, 'offline');
                }
            });

            ws.on('error', (error) => {
                logger.error(`WebSocket error from ${ip}:`, error);
            });
        });

        // Heartbeat interval
        setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if (ws.isAlive === false) return ws.terminate();

                ws.isAlive = false;
                ws.ping();
            });
        }, 30000);
    }

    async handleMessage(ws, data, ip) {
        // data: { type: 'register'|'heartbeat'|'shutdown', deviceId: '...', hostname: '...' }

        if (!data.deviceId && !data.hostname) {
            return;
        }

        // Find device
        let device;
        if (data.deviceId) {
            device = await Device.findById(data.deviceId);
        } else if (data.hostname) {
            device = await Device.findOne({ hostname: data.hostname });
        }

        if (!device) {
            logger.warn(`Device not found for WS message: ${JSON.stringify(data)}`);
            return;
        }

        // Store deviceId on ws object for close handler
        ws.deviceId = device._id;

        switch (data.type) {
            case 'register':
            case 'heartbeat':
                await this.updateDeviceStatus(device._id, 'online');
                break;
            case 'shutdown':
                logger.info(`🛑 Shutdown signal received for ${device.hostname}`);
                await this.updateDeviceStatus(device._id, 'offline');
                ws.close(); // Close connection after handling shutdown
                break;
            default:
                // logger.debug(`Unknown message type: ${data.type}`);
                break;
        }
    }

    async updateDeviceStatus(deviceId, status) {
        try {
            const updatedDevice = await Device.findByIdAndUpdate(deviceId, {
                status: status,
                is_online: status === 'online',
                last_seen: new Date()
            }, { new: true }); // Retorna o documento atualizado

            if (updatedDevice) {
                // Notifica todos os clientes conectados (Painel)
                this.broadcast({
                    type: status === 'online' ? 'device_online' : 'device_offline',
                    deviceId: updatedDevice._id,
                    hostname: updatedDevice.hostname,
                    status: status,
                    timestamp: new Date()
                });
            }

            // logger.debug(`Device ${deviceId} status updated to ${status}`);
        } catch (error) {
            logger.error(`Error updating device ${deviceId} status:`, error);
        }
    }

    broadcast(data) {
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }

    static getInstance() {
        return WebSocketServer.instance;
    }

    static broadcastToAll(data) {
        if (WebSocketServer.instance) {
            WebSocketServer.instance.broadcast(data);
        }
    }
}

WebSocketServer.instance = null;

module.exports = WebSocketServer;
