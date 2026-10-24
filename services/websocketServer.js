const crypto = require('crypto');
const WebSocket = require('ws');
const ManagedAsset = require('../models/ManagedAsset');
const logger = require('../utils/logger');
const { getSessionToken, verifyJwt } = require('../utils/authTokens');

function timingSafeTokenEqual(receivedToken, expectedToken) {
  const received = Buffer.from(String(receivedToken || ''), 'utf8');
  const expected = Buffer.from(String(expectedToken || ''), 'utf8');
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(received, expected);
}

function getProtocolTokens(req) {
  const raw = req.headers['sec-websocket-protocol'] || '';
  return String(raw).split(',').map((item) => item.trim()).filter(Boolean);
}

function authenticateHandshake(req) {
  const sessionToken = getSessionToken(req);
  if (sessionToken) {
    const decoded = verifyJwt(sessionToken);
    return {
      kind: 'user',
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };
  }

  for (const protocol of getProtocolTokens(req)) {
    if (protocol.startsWith('mdm.jwt.')) {
      const decoded = verifyJwt(protocol.substring('mdm.jwt.'.length));
      return {
        kind: 'user',
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
      };
    }

    if (protocol.startsWith('mdm.device.')) {
      const token = protocol.substring('mdm.device.'.length);
      if (process.env.AUTH_TOKEN && timingSafeTokenEqual(token, process.env.AUTH_TOKEN)) {
        return { kind: 'device', id: 'device' };
      }
    }
  }

  throw new Error('WebSocket authentication failed');
}

class WebSocketServer {
  constructor(server) {
    if (WebSocketServer.instance) {
      return WebSocketServer.instance;
    }

    this.wss = new WebSocket.Server({
      server,
      path: '/ws',
      verifyClient: (info, done) => {
        try {
          info.req.auth = authenticateHandshake(info.req);
          done(true);
        } catch (error) {
          logger.warn(`WebSocket rejected from ${info.req.socket.remoteAddress}: ${error.message}`);
          done(false, 401, 'Unauthorized');
        }
      },
    });
    this.clients = new Map();
    WebSocketServer.instance = this;
    this._init();
  }

  _init() {
    logger.info('WebSocket Server initialized');

    this.wss.on('connection', (ws, req) => {
      const ip = req.socket.remoteAddress;
      const auth = req.auth || { kind: 'unknown' };
      const userId = auth.kind === 'user' ? String(auth.id || '') : null;

      logger.info(`New WebSocket connection from ${ip} (${auth.kind})`);

      ws.isAlive = true;
      ws.auth = auth;
      ws.userId = userId;
      ws.on('pong', () => { ws.isAlive = true; });

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
        logger.info(`WebSocket connection closed from ${ip}`);
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

    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  async _handleMessage(ws, data) {
    if (!data || typeof data !== 'object') return;

    // Tratamento de conexões administrativas (Painel Web / SPA)
    if (data.role === 'panel' || (typeof data.clientId === 'string' && data.clientId.startsWith('panel')) || ws.auth?.kind === 'user') {
      ws.isPanel = true;
      if (data.type === 'register' || data.type === 'panel_init') {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'registered', role: 'panel', status: 'ok' }));
        }
      }
      return;
    }

    let asset;
    if (data.assetId) {
      asset = await ManagedAsset.findById(data.assetId);
    } else if (data.serialNumber) {
      asset = await ManagedAsset.findOne({ serial_number: data.serialNumber });
    } else if (data.hostname) {
      asset = await ManagedAsset.findOne({ hostname: data.hostname });
    }

    if (!asset && data.clientId !== 'test_script' && ws.auth?.kind !== 'device') {
      logger.warn(`Asset not found for WS message: ${JSON.stringify(data)}`);
      return;
    }

    ws.assetId = asset ? asset._id : null;
    ws.serialNumber = asset ? (asset.serial_number || asset.serialNumber) : (data.serialNumber || null);

    switch (data.type) {
      case 'register':
      case 'heartbeat':
        if (asset) await this._updateAssetStatus(asset._id, 'online');
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
        }
        break;

      case 'shutdown':
        if (asset) {
          logger.info(`Shutdown signal received for ${asset.asset_name}`);
          await this._updateAssetStatus(asset._id, 'offline');
        }
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

  notifyAsset(assetId, data) {
    const targetId = String(assetId || '');
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && String(client.assetId || '') === targetId) {
        client.send(JSON.stringify(data));
      }
    });
  }

  notifySerial(serialNumber, data) {
    const targetSerial = String(serialNumber || '').trim().toLowerCase();
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && String(client.serialNumber || '').trim().toLowerCase() === targetSerial) {
        client.send(JSON.stringify(data));
      }
    });
  }

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
