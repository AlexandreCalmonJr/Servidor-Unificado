const crypto = require('crypto');

function timingSafeTokenEqual(receivedToken, expectedToken) {
  const received = Buffer.from(String(receivedToken || ''), 'utf8');
  const expected = Buffer.from(String(expectedToken || ''), 'utf8');
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(received, expected);
}

const deviceAuth = (req, res, next) => {
  const logger = req.logger || console;

  try {
    const expectedToken = process.env.AUTH_TOKEN;

    if (!expectedToken) {
      logger.error('AUTH_TOKEN nao configurado no ambiente');
      return res.status(500).json({
        success: false,
        message: 'Configuracao de autenticacao ausente no servidor',
      });
    }

    let receivedToken = null;

    if (req.headers.auth_token) {
      receivedToken = String(req.headers.auth_token).trim();
      logger.debug('Token de dispositivo recebido via AUTH_TOKEN header');
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      receivedToken = req.headers.authorization.substring(7).trim();
      logger.debug('Token de dispositivo recebido via Authorization Bearer');
    }

    if (!receivedToken) {
      logger.warn(`Dispositivo tentou acessar sem token - IP: ${req.ip} - Path: ${req.path}`);
      return res.status(401).json({
        success: false,
        message: 'Token de autenticacao nao fornecido',
      });
    }

    if (!timingSafeTokenEqual(receivedToken, expectedToken)) {
      logger.warn(`Token invalido recebido de ${req.ip} - Token: ${receivedToken.substring(0, 4)}***`);
      return res.status(401).json({
        success: false,
        message: 'Token de autenticacao invalido',
      });
    }

    req.device = {
      authenticated: true,
      id: 'device',
      ip: req.ip,
      timestamp: new Date().toISOString(),
    };

    logger.debug(`Autenticacao de dispositivo bem-sucedida - IP: ${req.ip}`);
    return next();
  } catch (error) {
    logger.error(`Erro na autenticacao de dispositivo - IP: ${req.ip} - Erro: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro no servidor durante autenticacao',
    });
  }
};

module.exports = deviceAuth;
