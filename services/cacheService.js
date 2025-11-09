const redis = require('redis');
const logger = require('../utils/logger'); // Importe seu logger

// Pega a URL do Redis do seu .env
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Cria o cliente
const client = redis.createClient({
  url: redisUrl,
  legacyMode: false, // Importante: legacyMode=false para usar Promises
});

// Flag para saber se estamos conectados
let isReady = false;

// Função de conexão imediata
(async () => {
  try {
    // Conecta ao cliente
    await client.connect(); 
  } catch (err) {
    logger.logCriticalError(err, {
      context: 'redis_connect_initial',
      redisUrl,
    });
  }
})();

// --- Gerenciamento de Eventos ---

client.on('connect', () => {
  logger.info('Conectando ao Redis...');
});

client.on('ready', () => {
  isReady = true;
  logger.logSystemEvent('redis_connected', { redisUrl });
});

client.on('error', (err) => {
  isReady = false;
  logger.error('Erro no cliente Redis', {
    message: err.message,
    stack: err.stack,
    context: 'redis_client_error',
  });
});

client.on('end', () => {
  isReady = false;
  logger.warn('Conexão com o Redis fechada.');
});

// --- Funções Exportadas ---

/**
 * Busca um valor no cache.
 * @param {string} key 
 * @returns {Promise<object|null>} O objeto parseado ou nulo.
 */
const get = async (key) => {
  if (!isReady) {
    logger.warn('Tentativa de GET no cache, mas o Redis não está pronto.', { key });
    return null;
  }
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    logger.error('Erro ao buscar (GET) do cache Redis', { key, message: err.message });
    return null;
  }
};

/**
 * Salva um valor no cache.
 * @param {string} key 
 * @param {object} value O objeto a ser salvo (será stringificado)
 * @param {number} ttl Em segundos (Time-to-Live)
 */
const set = async (key, value, ttl = 60) => {
  if (!isReady) {
    logger.warn('Tentativa de SET no cache, mas o Redis não está pronto.', { key });
    return;
  }
  try {
    const stringValue = JSON.stringify(value);
    await client.set(key, stringValue, {
      EX: ttl, // Define o TTL em segundos
    });
  } catch (err) {
    logger.error('Erro ao salvar (SET) no cache Redis', { key, message: err.message });
  }
};

/**
 * Deleta um valor do cache.
 * @param {string} key 
 */
const del = async (key) => {
  if (!isReady) {
    logger.warn('Tentativa de DEL no cache, mas o Redis não está pronto.', { key });
    return;
  }
  try {
    await client.del(key);
  } catch (err) {
    logger.error('Erro ao deletar (DEL) do cache Redis', { key, message: err.message });
  }
};

module.exports = {
  get,
  set,
  del,
  client, // ⭐ Exporta o cliente para o rate-limiter
  isReady: () => isReady,
};