// middleware/logging.js

const requestLogger = (req, res, next) => {
  // Assume que o logger será injetado no app e estará disponível via req.app.locals
  const logger = req.app.locals.logger || console;
  req.logger = logger;
  logger.info(`Requisição recebida: ${req.method} ${req.url} from ${req.ip}`);
  next();
};

module.exports = { requestLogger };