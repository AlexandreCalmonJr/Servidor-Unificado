const express = require('express');
const ManagedAsset = require('../models/ManagedAsset');
const ipMappingController = require('../controllers/ipMappingController');
const { ASSET_SUMMARY_PROJECTION, hybridPaginate } = require('../utils/paginationHelper');

module.exports = (logger, modifyApiLimiter, auth) => {
  const router = express.Router();

  // ── Listar ativos por tipo (painel) ──────────────────────────────
  // GET /api/monitoring/assets?type=totem&page=1&limit=50&full=false
  router.get('/assets', auth, async (req, res) => {
    try {
      const { type, status, unit, full } = req.query;

      // Filtra por tipo e ignora soft-deleted por padrão
      const filter = { is_deleted: { $ne: true } };
      if (type) filter.asset_type = type;
      if (status) filter.status = status;
      if (unit) filter.unit = unit;

      const query = ManagedAsset.find(filter);

      // Projeção enxuta para economia drástica de banda (< 50 KB vs ~1 MB)
      if (full !== 'true' && full !== true) {
        query.select(ASSET_SUMMARY_PROJECTION);
      }

      const isPaginated = req.query.page !== undefined || req.query.cursor !== undefined || req.query.limit !== undefined;

      if (isPaginated) {
        const result = await hybridPaginate(query, {
          cursor: req.query.cursor,
          page: req.query.page,
          limit: req.query.limit || 50,
          sortBy: req.query.sortBy || 'last_seen',
          sortOrder: req.query.sortOrder === 'asc' ? 1 : -1,
        });

        return res.status(200).json({
          success: true,
          assets: result.items,
          total: result.total,
          pagination: {
            type: result.type,
            count: result.count,
            total: result.total,
            page: result.page,
            pages: result.pages,
            limit: result.limit,
            hasMore: result.hasMore,
            nextCursor: result.nextCursor,
          },
        });
      }

      // Modo padrão (limite de segurança de 100 itens para chamadas sem parâmetros)
      const assets = await query.limit(100).sort({ last_seen: -1 }).lean().exec();
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
