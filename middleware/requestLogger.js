// middleware/requestLogger.js - MIDDLEWARE DE LOGGING DE REQUISIÇÕES
const logger = require('../utils/logger');
const onFinished = require('on-finished');

/**
 * Middleware para logar todas as requisições HTTP
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Adiciona o logger ao request para uso nos controllers
  req.logger = logger;

  // Loga quando a resposta for completada
  onFinished(res, (err, res) => {
    const duration = Date.now() - start;
    
    // Não loga requisições de health check (para evitar poluir logs)
    if (req.path === '/health') {
      return;
    }

    logger.logApiRequest(req, res, duration);
  });

  next();
};

/**
 * Middleware para logar apenas erros (mais leve)
 */
const errorOnlyLogger = (req, res, next) => {
  const start = Date.now();
  req.logger = logger;

  onFinished(res, (err, res) => {
    // Só loga se houver erro (4xx ou 5xx)
    if (res.statusCode >= 400) {
      const duration = Date.now() - start;
      logger.logApiRequest(req, res, duration);
    }
  });

  next();
};

module.exports = {
  requestLogger,
  errorOnlyLogger
};