const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { client: redisClient, isReady } = require('../services/cacheService');

// Rate limit em duas camadas (P1 - Identidade):
// - Requisições autenticadas por token individual usam o ID verificado do dispositivo (dev:<id>)
//   permitindo múltiplos dispositivos sob o mesmo NAT/IP corporativo sem bloqueio mútuo.
// - Requisições legadas ou não autenticadas usam req.ip (proteção anti-DoS).
const deviceKeyGenerator = (req) => {
  if (req.device?.kind === 'individual' && req.device?.id) {
    return `dev:${req.device.id}`;
  }
  return req.ip;
};

const getApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  keyGenerator: deviceKeyGenerator,
  message: 'Muitas requisicoes de leitura, tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

const modifyApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  keyGenerator: deviceKeyGenerator,
  message: 'Muitas tentativas de modificacao, tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

const enrollLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de provisionamento, tente novamente apos 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.username || '').toLowerCase()}`,
  message: 'Muitas tentativas de login, tente novamente apos 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

const createAdvancedLimiter = (logger) => {
  const options = {
    windowMs: 15 * 60 * 1000,
    max: async (req) => (req.user?.role === 'admin' ? 1000 : 100),
    keyGenerator: (req) => req.user?.id || req.ip,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded: ${req.user?.username || req.ip}`);
      res.status(429).json({ message: 'Muitas requisicoes. Tente novamente mais tarde.' });
    },
  };

  if (isReady() && redisClient) {
    options.store = new RedisStore({
      client: redisClient,
      prefix: 'rl:',
    });
  } else {
    logger.warn('Rate Limiter Avancado: Redis nao esta pronto. Usando cache em memoria.');
  }

  return rateLimit(options);
};

module.exports = {
  getApiLimiter,
  modifyApiLimiter,
  enrollLimiter,
  loginLimiter,
  createAdvancedLimiter,
};
