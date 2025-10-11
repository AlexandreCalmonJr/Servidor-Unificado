const requestLogger = (logger) => (req, res, next) => {
    req.logger = logger;
    logger.info(`Requisição recebida: ${req.method} ${req.url} from ${req.ip}`);
    next();
  };
  
  module.exports = requestLogger;
