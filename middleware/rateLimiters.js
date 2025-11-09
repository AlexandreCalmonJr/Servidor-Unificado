const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
// 🔧 AJUSTE: Importa o cliente do seu cacheService
const { client: redisClient } = require('../services/cacheService'); 

// Limitador GERAL para rotas de LEITURA (GET) - Mais permissivo
const getApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500,
  message: 'Muitas requisições de leitura, tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Limitador para rotas de MODIFICAÇÃO (POST, PUT, DELETE) - Mais restritivo
const modifyApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: 'Muitas tentativas de modificação, tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Limitador para PROVISIONAMENTO - Mais rígido
const enrollLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: 'Muitas tentativas de provisionamento, tente novamente após 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ADICIONADO: Função para criar o rate limit AVANÇADO por usuário
const createAdvancedLimiter = (logger) => {
  return rateLimit({
    // 🔧 AJUSTE: Passa o cliente importado para o store
    store: new RedisStore({ 
      client: redisClient,
      // Descomente se o seu Redis tiver prefixo
      // prefix: 'rl:', 
    }),
    windowMs: 15 * 60 * 1000,
    max: async (req) => {
      // Admins têm mais quota
      return req.user?.role === 'admin' ? 1000 : 100; 
    },
    keyGenerator: (req) => req.user?.id || req.ip, // Por usuário, não por IP
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded: ${req.user?.username || req.ip}`);
      res.status(429).json({ message: 'Muitas requisições. Tente novamente mais tarde.' });
    }
  });
};

module.exports = { 
  getApiLimiter, 
  modifyApiLimiter, 
  enrollLimiter,
  createAdvancedLimiter // Exporta a nova função
};