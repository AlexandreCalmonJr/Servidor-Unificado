// utils/logger.js - SISTEMA DE LOGS ESTRUTURADO
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Garantir que o diretório de logs existe
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Formato customizado para logs
const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  // Adiciona metadados se existirem
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Configuração do logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'mdm-server',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Logs de erro
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Logs combinados
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 7,
      tailable: true
    }),
    
    // Logs de acesso (HTTP)
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'http',
      maxsize: 10485760,
      maxFiles: 3,
    })
  ],
  
  // Não sair do processo em caso de erro no logger
  exitOnError: false
});

// Console em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      customFormat
    ),
    level: 'debug'
  }));
}

// ===== MÉTODOS HELPER =====

/**
 * Loga requisições HTTP de forma estruturada
 */
logger.logApiRequest = (req, res, duration) => {
  const logData = {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };

  // Adiciona informações do usuário se autenticado
  if (req.user) {
    logData.userId = req.user.id;
    logData.username = req.user.username;
    logData.role = req.user.role;
  }

  // Determina o nível do log baseado no status code
  const level = res.statusCode >= 500 ? 'error' 
               : res.statusCode >= 400 ? 'warn'
               : 'http';

  logger.log(level, 'HTTP Request', logData);
};

/**
 * Loga operações de banco de dados
 */
logger.logDbOperation = (operation, collection, details = {}) => {
  logger.debug('DB Operation', {
    operation,
    collection,
    ...details
  });
};

/**
 * Loga autenticação e autorização
 */
logger.logAuth = (event, username, details = {}) => {
  const level = event.includes('failed') || event.includes('denied') ? 'warn' : 'info';
  
  logger.log(level, `Auth: ${event}`, {
    username,
    ip: details.ip,
    ...details
  });
};

/**
 * Loga operações de dispositivos
 */
logger.logDeviceOperation = (operation, deviceInfo, details = {}) => {
  logger.info(`Device: ${operation}`, {
    serialNumber: deviceInfo.serial_number || deviceInfo.serialNumber,
    deviceName: deviceInfo.device_name || deviceInfo.deviceName,
    ...details
  });
};

/**
 * Loga erros críticos com contexto completo
 */
logger.logCriticalError = (error, context = {}) => {
  logger.error('CRITICAL ERROR', {
    message: error.message,
    stack: error.stack,
    code: error.code,
    ...context
  });
};

/**
 * Loga eventos de sistema
 */
logger.logSystemEvent = (event, details = {}) => {
  logger.info(`System: ${event}`, details);
};

// ===== STREAM PARA MORGAN (HTTP LOGGER) =====
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

module.exports = logger;