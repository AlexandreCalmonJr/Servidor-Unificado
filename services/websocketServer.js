// services/websocketServer.js
const WebSocket = require('ws');
const ManagedAsset = require('../models/ManagedAsset');
const logger = require('../utils/logger');

class WebSocketServer {
  constructor(server) {
    if (WebSocketServer.instance) {
      return WebSocketServer.instance;
    }
    this.wss = new WebSocket.Server({ server, path: '/ws' });
    this.clients = new Map(); // Mapear userId -> Set de conexões
    WebSocketServer.instance = this;
    this._init();
  }

  _init() {
    logger.info('🔌 WebSocket Server initialized');

    this.wss.on('connection', (ws, req) => {
      const ip = req.socket.remoteAddress;
      const userId = req.url.split('?')[1]?.split('=')[1]; // ?userId=xxx
      
      logger.info(`🔌 New WebSocket connection from ${ip}`);

      ws.isAlive = true;
      ws.userId = userId;
      ws.on('pong', () => { ws.isAlive = true; });

      // Registrar cliente por userId
      if (userId) {
        if (!this.clients.has(userId)) {
          this.clients.set(userId, new Set());
        }
        this.clients.get(userId).add(ws);
      }

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          await this._handleMessage(ws, data);
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        logger.info(`🔌 WebSocket connection closed from ${ip}`);
        if (userId && this.clients.has(userId)) {
          this.clients.get(userId).delete(ws);
          if (this.clients.get(userId).size === 0) {
            this.clients.delete(userId);
          }
        }
        if (ws.assetId) {
          this._updateAssetStatus(ws.assetId, 'offline');
        }
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error from ${ip}:`, error);
      });
    });

    // Heartbeat para detectar conexões mortas
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  async _handleMessage(ws, data) {
    if (!data.assetId && !data.serialNumber && !data.hostname) return;

    // Busca o ativo: por assetId (ObjectId), serialNumber ou hostname
    let asset;
    if (data.assetId) {
      asset = await ManagedAsset.findById(data.assetId);
    } else if (data.serialNumber) {
      asset = await ManagedAsset.findOne({ serial_number: data.serialNumber });
    } else if (data.hostname) {
      asset = await ManagedAsset.findOne({ hostname: data.hostname });
    }

    if (!asset) {
      logger.warn(`Asset not found for WS message: ${JSON.stringify(data)}`);
      return;
    }

    ws.assetId = asset._id;

    switch (data.type) {
      case 'register':
      case 'heartbeat':
        await this._updateAssetStatus(asset._id, 'online');
        break;

      case 'shutdown':
        logger.info(`🛑 Shutdown signal received for ${asset.asset_name}`);
        await this._updateAssetStatus(asset._id, 'offline');
        ws.close();
        break;

      default:
        break;
    }
  }

  async _updateAssetStatus(assetId, status) {
    try {
      const updated = await ManagedAsset.findByIdAndUpdate(
        assetId,
        { status, last_seen: new Date() },
        { new: true }
      );

      if (updated) {
        this.broadcast({
          type: status === 'online' ? 'asset_online' : 'asset_offline',
          assetId: updated._id,
          assetName: updated.asset_name,
          serialNumber: updated.serial_number,
          assetType: updated.asset_type,
          status,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      logger.error(`Error updating asset ${assetId} status:`, error);
    }
  }

  broadcast(data) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  // Enviar notificação para usuário específico
  notifyUser(userId, data) {
    if (this.clients.has(userId)) {
      const userClients = this.clients.get(userId);
      userClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    }
  }

  // Enviar notificação para todos os usuários
  notifyAll(data) {
    this.broadcast(data);
  }

  static getInstance() {
    return WebSocketServer.instance;
  }

  static broadcastToAll(data) {
    if (WebSocketServer.instance) {
      WebSocketServer.instance.broadcast(data);
    }
  }

  static notifyUser(userId, data) {
    if (WebSocketServer.instance) {
      WebSocketServer.instance.notifyUser(userId, data);
    }
  }

  static notifyAll(data) {
    if (WebSocketServer.instance) {
      WebSocketServer.instance.notifyAll(data);
    }
  }
}

WebSocketServer.instance = null;

module.exports = WebSocketServer;
