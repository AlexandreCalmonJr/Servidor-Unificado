// Ficheiro: routes/monitoringRoutes.js
// Descrição: Agrupa as rotas do módulo de monitoramento PARA O PAINEL.
// A rota do cliente (/api/monitor) é definida diretamente em express.js para manter a compatibilidade.

const express = require('express');
const totemController = require('../controllers/totemController');
const ipMappingController = require('../controllers/ipMappingController');

// Estas rotas serão montadas sob /api/monitoring e são para o seu painel de gestão.
module.exports = (logger, modifyApiLimiter, auth) => {
    const router = express.Router();

    // Rota para o painel obter a lista de totens.
    // Acessível via GET /api/monitoring/totems
    router.get('/totems', auth, totemController.getTotems);

    // Rotas para o painel gerir os mapeamentos de IP.
    // Acessível via /api/monitoring/ip-mappings
    router.get('/ip-mappings', auth, ipMappingController.getAllMappings);
    router.post('/ip-mappings', auth, modifyApiLimiter, ipMappingController.createMapping);
    router.delete('/ip-mappings/:id', auth, modifyApiLimiter, ipMappingController.deleteMapping);

    return router;
};