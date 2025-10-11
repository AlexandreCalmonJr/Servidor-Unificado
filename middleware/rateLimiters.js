const rateLimit = require('express-rate-limit');

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

module.exports = { getApiLimiter, modifyApiLimiter, enrollLimiter };
