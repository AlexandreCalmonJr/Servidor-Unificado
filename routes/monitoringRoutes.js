// Ficheiro: routes/monitoringRoutes.js
// Descrição: Agrupa as rotas do módulo de monitoramento PARA O PAINEL.
// A rota do cliente (/api/monitor) é definida diretamente em server.js para manter a compatibilidade.

const express = require('express');
// ✅ CONSOLIDADO - Usar ManagedAsset ao invés de totemService
const ManagedAsset = require('../models/ManagedAsset');
const ipMappingController = require('../controllers/ipMappingController');

// Estas rotas serão montadas sob /api/monitoring e são para o seu painel de gestão.
module.exports = (logger, modifyApiLimiter, auth) => {
    const router = express.Router();

    // Rota para o painel obter a lista de totens.
    // Acessível via GET /api/monitoring/totems
    router.get('/totems', auth, async (req, res) => {
      try {
        const totems = await ManagedAsset.find({ asset_type: 'totem' })
          .sort({ last_seen: -1 })
          .lean();
        res.status(200).json(totems);
      } catch (error) {
        logger.error('Erro ao obter totems:', error);
        res.status(500).json({ message: 'Erro ao obter dispositivos.', error: error.message });
      }
    });

    // Rotas para o painel gerir os mapeamentos de IP.
    // Acessível via /api/monitoring/ip-mappings
    router.get('/ip-mappings', auth, ipMappingController.getAllMappings);
    router.post('/ip-mappings', auth, modifyApiLimiter, ipMappingController.createMapping);
    router.delete('/ip-mappings/:id', auth, modifyApiLimiter, ipMappingController.deleteMapping);

    return router;
};