const errorHandler = (logger) => (err, req, res, next) => {
    logger.error(`Erro não tratado: ${err.message}`, { stack: err.stack, ip: req.ip, url: req.originalUrl });
    res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
  };
  
  module.exports = errorHandler;
