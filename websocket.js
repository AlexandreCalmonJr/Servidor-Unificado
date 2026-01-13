const WebSocket = require('ws');
const logger = require('./utils/logger');

let wss;

const initializeWebSocket = (server) => {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    logger.info(`Nova conexão WebSocket estabelecida de ${ip}`);

    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        handleMessage(ws, parsedMessage);
      } catch (error) {
        logger.error('Erro ao processar mensagem WebSocket', { error: error.message });
      }
    });

    ws.on('close', () => {
      logger.info(`Conexão WebSocket fechada de ${ip}`);
    });

    ws.on('error', (error) => {
      logger.error(`Erro na conexão WebSocket de ${ip}`, { error: error.message });
    });
  });

  // Heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  logger.info('Servidor WebSocket inicializado em /ws');
};

const handleMessage = (ws, message) => {
  switch (message.type) {
    case 'register':
      logger.info('Cliente registrado via WebSocket', { clientId: message.clientId });
      ws.clientId = message.clientId;
      break;
    case 'heartbeat':
      ws.send(JSON.stringify({ type: 'heartbeat_ack', timestamp: Date.now() }));
      break;
    default:
      logger.debug('Mensagem WebSocket desconhecida recebida', { type: message.type });
  }
};

const broadcast = (event, data) => {
  if (!wss) return;

  const message = JSON.stringify({ type: event, data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

module.exports = {
  initializeWebSocket,
  broadcast
};
