// services/cacheService.js - CACHE COM REDIS OPCIONAL (CORRIGIDO)
const redis = require('redis');
const logger = require('../utils/logger');

// ===== CONFIGURAÇÃO =====
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';
const redisUrl = process.env.REDIS_URL || 'redis://redis:6379'; // 🔧 Use 'redis' no Docker

let client = null;
let isReady = false;

// ===== CACHE EM MEMÓRIA (FALLBACK) =====
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  async get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key);
      this.timers.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key, value, ttl = 60) {
    const expires = Date.now() + (ttl * 1000);
    this.cache.set(key, { value, expires });

    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttl * 1000);

    this.timers.set(key, timer);
  }

  async del(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.cache.delete(key);
  }

  size() {
    return this.cache.size;
  }

  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.cache.clear();
  }
}

const memoryCache = new MemoryCache();

// ===== CONEXÃO REDIS (SE HABILITADO) =====
if (REDIS_ENABLED) {
  logger.info('🔧 Redis habilitado, tentando conectar...', { redisUrl });
  
  client = redis.createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('❌ Redis: Máximo de tentativas atingido, desistindo');
          return new Error('Máximo de reconexões atingido');
        }
        const delay = Math.min(retries * 100, 3000);
        logger.warn(`⏳ Redis: Reconectando em ${delay}ms (tentativa ${retries})`);
        return delay;
      }
    }
  });

  // --- Eventos ---
  client.on('connect', () => {
    logger.info('🔄 Conectando ao Redis...');
  });

  client.on('ready', () => {
    isReady = true;
    logger.info('✅ Redis conectado com sucesso', { redisUrl });
  });

  client.on('error', (err) => {
    isReady = false;
    logger.warn('⚠️ Erro no Redis - usando cache em memória', {
      message: err.message,
      code: err.code
    });
  });

  client.on('end', () => {
    isReady = false;
    logger.warn('⚠️ Conexão com Redis fechada - usando cache em memória');
  });

  // Conecta de forma assíncrona (SEM bloquear a inicialização)
  client.connect().catch(err => {
    logger.error('❌ Falha ao conectar ao Redis - usando cache em memória', {
      error: err.message,
      redisUrl,
    });
    client = null;
  });
} else {
  logger.info('ℹ️ Redis desabilitado - usando cache em memória');
}

// ===== FUNÇÕES EXPORTADAS (ADAPTADAS) =====

/**
 * Busca valor do cache
 * @param {string} key 
 * @returns {Promise<object|null>}
 */
const get = async (key) => {
  // Se Redis está disponível, usa ele
  if (isReady && client) {
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      logger.warn('⚠️ Erro no GET do Redis, usando memória', { 
        key, 
        error: err.message 
      });
      return await memoryCache.get(key);
    }
  }
  
  // Senão, usa cache em memória
  return await memoryCache.get(key);
};

/**
 * Salva valor no cache
 * @param {string} key 
 * @param {object} value 
 * @param {number} ttl Em segundos
 */
const set = async (key, value, ttl = 60) => {
  // Se Redis está disponível, usa ele
  if (isReady && client) {
    try {
      const stringValue = JSON.stringify(value);
      await client.set(key, stringValue, { EX: ttl });
      return;
    } catch (err) {
      logger.warn('⚠️ Erro no SET do Redis, usando memória', { 
        key, 
        error: err.message 
      });
      return await memoryCache.set(key, value, ttl);
    }
  }
  
  // Senão, usa cache em memória
  return await memoryCache.set(key, value, ttl);
};

/**
 * Deleta valor do cache
 * @param {string} key 
 */
const del = async (key) => {
  if (isReady && client) {
    try {
      await client.del(key);
      return;
    } catch (err) {
      logger.warn('⚠️ Erro no DEL do Redis, usando memória', { 
        key, 
        error: err.message 
      });
      return await memoryCache.del(key);
    }
  }
  
  return await memoryCache.del(key);
};

/**
 * Retorna estatísticas do cache
 */
const getStats = () => {
  if (isReady && client) {
    return {
      type: 'redis',
      status: 'connected',
      url: redisUrl,
    };
  } else {
    return {
      type: 'memory',
      status: 'active',
      size: memoryCache.size(),
    };
  }
};

/**
 * Limpa todo o cache
 */
const clear = async () => {
  if (isReady && client) {
    try {
      await client.flushDb();
      logger.info('✅ Cache Redis limpo');
    } catch (err) {
      logger.warn('⚠️ Erro ao limpar Redis, limpando memória', { error: err.message });
      memoryCache.clear();
    }
    return;
  }
  
  memoryCache.clear();
  logger.info('✅ Cache em memória limpo');
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (client && isReady) {
    logger.info('🛑 Fechando conexão com Redis...');
    await client.quit();
  }
});

module.exports = {
  get,
  set,
  del,
  getStats,
  clear,
  client,
  isReady: () => isReady,
};