// middleware/deviceAuth.js - AUTENTICAÇÃO SIMPLES PARA DISPOSITIVOS
/**
 * Middleware de autenticação para dispositivos (agentes MDM)
 * Valida o AUTH_TOKEN simples (não JWT) definido no .env
 */

const deviceAuth = (req, res, next) => {
    const logger = req.logger || console;
    
    try {
      // Obtém o token esperado do .env
      const expectedToken = process.env.AUTH_TOKEN;
      
      if (!expectedToken) {
        logger.error('AUTH_TOKEN não configurado no .env');
        return res.status(500).json({ 
          success: false, 
          message: 'Configuração de autenticação ausente no servidor' 
        });
      }
  
      // SUPORTA MÚLTIPLOS FORMATOS
      // 1. Header customizado: AUTH_TOKEN: <token>
      // 2. Header padrão: Authorization: Bearer <token>
      // 3. Query parameter: ?token=<token>
      
      let receivedToken = null;
      
      // Prioridade 1: AUTH_TOKEN header (formato usado pelos dispositivos)
      if (req.headers['auth_token']) {
        receivedToken = req.headers['auth_token'];
        logger.debug('Token recebido via AUTH_TOKEN header');
      }
      // Prioridade 2: Authorization Bearer
      else if (req.headers.authorization?.startsWith('Bearer ')) {
        receivedToken = req.headers.authorization.substring(7);
        logger.debug('Token recebido via Authorization Bearer');
      }
      // Prioridade 3: Query parameter
      else if (req.query.token) {
        receivedToken = req.query.token;
        logger.debug('Token recebido via query parameter');
      }
  
      // Valida se o token foi fornecido
      if (!receivedToken) {
        logger.warn(`Dispositivo tentou acessar sem token - IP: ${req.ip} - Path: ${req.path}`);
        return res.status(401).json({ 
          success: false, 
          message: 'Token de autenticação não fornecido' 
        });
      }
  
      // Valida o token (comparação simples de string)
      if (receivedToken !== expectedToken) {
        logger.warn(`Token inválido recebido de ${req.ip} - Token: ${receivedToken.substring(0, 4)}***`);
        return res.status(401).json({ 
          success: false, 
          message: 'Token de autenticação inválido' 
        });
      }
  
      // Token válido - adiciona informações básicas ao req
      req.device = {
        authenticated: true,
        ip: req.ip,
        timestamp: new Date().toISOString()
      };
  
      logger.debug(`Autenticação de dispositivo bem-sucedida - IP: ${req.ip}`);
      next();
  
    } catch (error) {
      logger.error(`Erro na autenticação de dispositivo - IP: ${req.ip} - Erro: ${error.message}`);
      res.status(500).json({ 
        success: false, 
        message: 'Erro no servidor durante autenticação' 
      });
    }
  };
  
  module.exports = deviceAuth;