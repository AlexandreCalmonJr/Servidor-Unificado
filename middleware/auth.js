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
      logger.debug(`Tentativa de acesso sem token - IP: ${req.ip} - Path: ${req.path} (tentando fallback)`);
      // ✅ CORREÇÃO: Chamar next(error) para permitir fallback em flexibleAuth
      const error = new Error('Nenhum token fornecido');
      error.name = 'NoTokenError';
      return next(error);
    }

    // Verificação de Token Estático (AUTH_TOKEN do .env)
    // Permite que dispositivos/agentes usem a rota de validação
    if (process.env.AUTH_TOKEN && token === process.env.AUTH_TOKEN) {
      req.user = {
        id: 'system_admin',
        username: 'system',
        role: 'admin',
        sector: 'Global',
        permissions: ['mobile', 'totem', 'admin']
      };
      logger.info('Autenticação bem-sucedida via AUTH_TOKEN estático');
      return next();
    }

    // Verifica e decodifica o token JWT
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
    // Se for um erro de JWT (token inválido ou expirado), não envie a resposta.
    // Em vez disso, passe o erro para o próximo handler (o callback no flexibleAuth).
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {

      // Loga a tentativa, mas permite o fallback
      logger.debug(`Falha na autenticação JWT (tentando fallback): ${error.message}`);

      // Passa o erro para o próximo handler
      return next(error);
    }

    // Se for um erro 500 (ex: falha ao buscar usuário no DB), encerre a requisição.
    logger.error(`Erro na autenticação - IP: ${req.ip} - Erro: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor durante autenticação'
    });
  }
};

module.exports = auth;