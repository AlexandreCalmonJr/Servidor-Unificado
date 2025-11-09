// middleware/requestLogger.js - MIDDLEWARE DE LOGGING DE REQUISIÇÕES
const logger = require('../utils/logger');
const onFinished = require('on-finished');
const crypto = require('crypto'); // 🔧 Adicionado para gerar UUIDs

/**
 * Middleware para logar todas as requisições HTTP (agora com Trace ID)
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // 🔧 Lógica de Trace ID adicionada
  const traceId = req.headers['x-trace-id'] || crypto.randomUUID();
  req.traceId = traceId; // Adiciona ao objeto request
  res.setHeader('X-Trace-ID', traceId); // ⭐ Retorna para o cliente

  // Adiciona o logger ao request para uso nos controllers
  // (logApiRequest agora pode acessar req.traceId)
  req.logger = logger;

  // Loga quando a resposta for completada
  onFinished(res, (err, res) => {
    const duration = Date.now() - start;
    
    // Não loga requisições de health check (para evitar poluir logs)
    if (req.path === '/health') {
      return;
    }

    // Esta função (logApiRequest) agora deve ser capaz de ler o req.traceId
    logger.logApiRequest(req, res, duration);
  });

  next();
};

/**
 * Middleware para logar apenas erros (agora com Trace ID)
 */
const errorOnlyLogger = (req, res, next) => {
  const start = Date.now();

  // 🔧 Lógica de Trace ID adicionada
  const traceId = req.headers['x-trace-id'] || crypto.randomUUID();
  req.traceId = traceId;
  res.setHeader('X-Trace-ID', traceId);

  req.logger = logger;

  onFinished(res, (err, res) => {
    // Só loga se houver erro (4xx ou 5xx)
    if (res.statusCode >= 400) {
      const duration = Date.now() - start;
      // Esta função (logApiRequest) agora pode ler o req.traceId
      logger.logApiRequest(req, res, duration);
    }
  });

  next();
};

module.exports = {
  requestLogger,
  errorOnlyLogger
};