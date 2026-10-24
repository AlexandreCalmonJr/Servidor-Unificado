const {
  getBearerToken,
  getSessionToken,
  authenticateJwtToken,
} = require('../utils/authTokens');

const auth = async (req, res, next) => {
  const logger = req.logger || console;

  try {
    const token = getBearerToken(req) || getSessionToken(req);

    if (!token) {
      logger.debug(`Tentativa de acesso sem token - IP: ${req.ip} - Path: ${req.path}`);
      const error = new Error('Nenhum token fornecido');
      error.name = 'NoTokenError';
      return next(error);
    }

    req.user = await authenticateJwtToken(token);
    logger.debug(`Autenticacao bem-sucedida - User: ${req.user.username} (${req.user.role})`);
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.debug(`Falha na autenticacao JWT (expirado): ${error.message}`);
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Token expirado. Realize novo login.',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      logger.debug(`Falha na autenticacao JWT (invalido): ${error.message}`);
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Token de autenticacao invalido',
      });
    }

    if (error.name === 'UserNotFoundError') {
      logger.warn(`Token valido mas usuario nao encontrado - IP: ${req.ip}`);
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Usuario nao encontrado',
      });
    }

    logger.error(`Erro na autenticacao - IP: ${req.ip} - Erro: ${error.message}`);
    return res.status(401).json({
      success: false,
      code: 'AUTH_ERROR',
      message: 'Falha na autenticacao',
    });
  }
};

module.exports = auth;
