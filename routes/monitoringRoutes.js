// routes/monitoringRoutes.js
// Rotas do painel de monitoramento (ativos + mapeamentos de IP)

const express = require('express');
const ManagedAsset = require('../models/ManagedAsset');
const ipMappingController = require('../controllers/ipMappingController');

module.exports = (logger, modifyApiLimiter, auth) => {
  const router = express.Router();

  // ── Listar ativos por tipo (painel) ──────────────────────────────
  // GET /api/monitoring/assets?type=totem
  // GET /api/monitoring/assets?type=desktop
  router.get('/assets', auth, async (req, res) => {
    try {
      const { type } = req.query;
      const filter = type ? { asset_type: type } : {};

      const assets = await ManagedAsset.find(filter)
        .sort({ last_seen: -1 })
        .lean();

      res.status(200).json({ success: true, assets, total: assets.length });
    } catch (error) {
      logger.error('Erro ao listar ativos:', error);
      res.status(500).json({ success: false, message: 'Erro ao listar ativos.', error: error.message });
    }
  });

  // ── Mapeamentos de IP (legado — usado pelo painel) ───────────────
  router.get('/ip-mappings', auth, ipMappingController.getAllMappings);
  router.post('/ip-mappings', auth, modifyApiLimiter, ipMappingController.createMapping);
  router.delete('/ip-mappings/:id', auth, modifyApiLimiter, ipMappingController.deleteMapping);

  return router;
};
