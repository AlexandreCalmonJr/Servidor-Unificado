const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { client: redisClient, isReady } = require('../services/cacheService');

// Rate limit sempre por IP — nunca usar identificadores enviados pelo cliente
// (S8: serial_number ou prefixo de token são controláveis pelo atacante).
const deviceKeyGenerator = (req) => req.ip;

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
