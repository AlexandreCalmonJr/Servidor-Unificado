// middleware/cacheMiddleware.js - CACHE HTTP PARA ROTAS GET

const crypto = require('crypto');

/**
 * Gera ETag baseado no conteúdo da resposta
 * @param {string|object} content - Conteúdo da resposta
 * @returns {string} ETag hash
 */
const generateETag = (content) => {
    const hash = crypto.createHash('md5');
    const data = typeof content === 'string' ? content : JSON.stringify(content);
    hash.update(data);
    return `"${hash.digest('hex')}"`;
};

/**
 * Middleware de cache HTTP com suporte a ETag e Last-Modified
 * @param {number} maxAge - Tempo de cache em segundos (padrão: 300 = 5 minutos)
 * @returns {Function} Middleware Express
 */
const cacheMiddleware = (maxAge = 300) => {
    return (req, res, next) => {
        // Só aplica cache em requisições GET
        if (req.method !== 'GET') {
            return next();
        }

        // Armazena o método send original
        const originalSend = res.send;
        const originalJson = res.json;

        // Sobrescreve res.send para adicionar headers de cache
        res.send = function (data) {
            // Gera ETag
            const etag = generateETag(data);

            // Define headers de cache
            res.set({
                'ETag': etag,
                'Cache-Control': `public, max-age=${maxAge}`,
                'Last-Modified': new Date().toUTCString(),
            });

            // Verifica se o cliente já tem a versão mais recente (304 Not Modified)
            const clientETag = req.headers['if-none-match'];
            if (clientETag === etag) {
                return res.status(304).end();
            }

            // Chama o método original
            return originalSend.call(this, data);
        };

        // Sobrescreve res.json para adicionar headers de cache
        res.json = function (data) {
            // Gera ETag
            const etag = generateETag(data);

            // Define headers de cache
            res.set({
                'ETag': etag,
                'Cache-Control': `public, max-age=${maxAge}`,
                'Last-Modified': new Date().toUTCString(),
            });

            // Verifica se o cliente já tem a versão mais recente (304 Not Modified)
            const clientETag = req.headers['if-none-match'];
            if (clientETag === etag) {
                return res.status(304).end();
            }

            // Chama o método original
            return originalJson.call(this, data);
        };

        next();
    };
};

/**
 * Middleware de cache para rotas estáticas (mais agressivo)
 * @param {number} maxAge - Tempo de cache em segundos (padrão: 86400 = 1 dia)
 */
const staticCacheMiddleware = (maxAge = 86400) => {
    return (req, res, next) => {
        res.set({
            'Cache-Control': `public, max-age=${maxAge}, immutable`,
        });
        next();
    };
};

/**
 * Middleware para desabilitar cache (rotas sensíveis)
 */
const noCacheMiddleware = () => {
    return (req, res, next) => {
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            'Pragma': 'no-cache',
            'Expires': '0',
        });
        next();
    };
};

module.exports = {
    cacheMiddleware,
    staticCacheMiddleware,
    noCacheMiddleware,
};
