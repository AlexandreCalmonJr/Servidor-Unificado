const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
// 🔧 AJUSTE (Fix 13): Importa o cliente e o status do cacheService
const { client: redisClient, isReady } = require('../services/cacheService'); 

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

  // CORREÇÃO (Item 13): Opções base
  const options = {
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
  };

  // CORREÇÃO (Item 13): Adiciona store Redis apenas se estiver pronto
  if (isReady() && redisClient) {
    options.store = new RedisStore({ 
      client: redisClient,
      prefix: 'rl:', // Boa prática adicionar prefixo
    });
  } else {
    logger.warn('Rate Limiter Avançado: Redis não está pronto. Usando cache em memória.');
    // Se não, usa o padrão (em memória) não definindo options.store
  }

  return rateLimit(options);
};

module.exports = { 
  getApiLimiter, 
  modifyApiLimiter, 
  enrollLimiter,
  createAdvancedLimiter // Exporta a nova função
};