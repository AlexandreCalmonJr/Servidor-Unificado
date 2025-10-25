// middleware/auth.js - VERSÃO ALINHADA
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  const logger = req.logger || console;
  
  try {
    // SUPORTA MÚLTIPLOS FORMATOS DE TOKEN
    // 1. Header padrão: Authorization: Bearer <token>
    // 2. Header customizado: AUTH_TOKEN: <token>
    // 3. Query parameter: ?token=<token> (para agentes)
    
    let token = null;
    
    // Prioridade 1: AUTH_TOKEN (usado pelos agentes)
    if (req.headers['auth_token']) {
      token = req.headers['auth_token'];
      logger.info('Token recebido via AUTH_TOKEN header');
    }
    // Prioridade 2: Authorization Bearer
    else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
      logger.info('Token recebido via Authorization Bearer');
    }
    // Prioridade 3: Query parameter (para agentes que não podem customizar headers)
    else if (req.query.token) {
      token = req.query.token;
      logger.info('Token recebido via query parameter');
    }

    if (!token) {
      logger.warn(`Tentativa de acesso sem token - IP: ${req.ip} - Path: ${req.path}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Token de autenticação não fornecido' 
      });
    }

    // Verifica e decodifica o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Busca o usuário completo
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      logger.warn(`Token válido mas usuário não encontrado - ID: ${decoded.id}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }

    // Adiciona dados do usuário à requisição
    req.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      sector: user.sector || 'Global',
      permissions: user.role === 'admin' 
        ? ['mobile', 'totem', 'admin'] 
        : (user.permissions || [])
    };

    logger.info(`Autenticação bem-sucedida - User: ${user.username} (${user.role})`);
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.warn(`Token inválido - IP: ${req.ip} - Erro: ${error.message}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      logger.warn(`Token expirado - IP: ${req.ip}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Token expirado. Faça login novamente.' 
      });
    }

    logger.error(`Erro na autenticação - IP: ${req.ip} - Erro: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Erro no servidor durante autenticação' 
    });
  }
};

module.exports = auth;