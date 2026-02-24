/**
 * routes/exportRoutes.js
 * Endpoints para exportar dados (CSV, etc)
 */

const express = require('express');
const { Parser } = require('json2csv');
const { getModelByType } = require('../utils/assetFactory');
const AssetModuleConfig = require('../models/AssetModuleConfig');

module.exports = (logger, getApiLimiter, auth) => {
  const router = express.Router();

  /**
   * GET /api/export/modules/:moduleId/assets
   * Exporta todos os ativos de um módulo em CSV
   */
  router.get('/modules/:moduleId/assets', auth, getApiLimiter, async (req, res) => {
    try {
      // Verificar permissão e encontrar módulo
      const module = await AssetModuleConfig.findById(req.params.moduleId);
      if (!module) {
        return res.status(404).json({ success: false, message: 'Módulo não encontrado' });
      }

      // Obter modelo correto
      const Model = getModelByType(module.type);
      if (!Model) {
        return res.status(400).json({ success: false, message: 'Tipo não suportado' });
      }

      // Buscar ativos
      const assets = await Model.find({ module_id: req.params.moduleId })
        .lean()
        .select('asset_name serial_number asset_type status location assigned_to last_seen created_at');

      if (assets.length === 0) {
        return res.status(204).json({ success: false, message: 'Nenhum ativo para exportar' });
      }

      // Preparar dados para CSV
      const csvFields = [
        'asset_name',
        'serial_number',
        'asset_type',
        'status',
        'location',
        'assigned_to',
        'last_seen',
        'created_at'
      ];

      const csv = new Parser({ fields: csvFields }).parse(assets);

      // Configurar headers para download
      const fileName = `${module.name}_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', Buffer.byteLength(csv));

      logger.info(`📊 CSV exportado: ${fileName} por ${req.user.username}`);
      res.send(csv);
    } catch (error) {
      logger.error(`Erro ao exportar CSV: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao exportar', error: error.message });
    }
  });

  /**
   * GET /api/export/modules/:moduleId/stats
   * Exporta estatísticas e sumários do módulo
   */
  router.get('/modules/:moduleId/stats', auth, getApiLimiter, async (req, res) => {
    try {
      const module = await AssetModuleConfig.findById(req.params.moduleId);
      if (!module) {
        return res.status(404).json({ success: false, message: 'Módulo não encontrado' });
      }

      const Model = getModelByType(module.type);
      if (!Model) {
        return res.status(400).json({ success: false, message: 'Tipo não suportado' });
      }

      // Contar status
      const stats = await Model.aggregate([
        { $match: { module_id: mongoose.Types.ObjectId(req.params.moduleId) } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            online: { $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] } },
            offline: { $sum: { $cond: [{ $eq: ['$status', 'offline'] }, 1, 0] } },
            maintenance: { $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] } }
          }
        }
      ]);

      const data = stats[0] || { total: 0, online: 0, offline: 0, maintenance: 0 };

      const csv = `Módulo,${module.name}
Tipo,${module.type}
Data,${new Date().toISOString()}

Estatísticas de Status
Total de Ativos,${data.total}
Online,${data.online}
Offline,${data.offline}
Em Manutenção,${data.maintenance}
Taxa Online,${data.total > 0 ? ((data.online / data.total) * 100).toFixed(2) + '%' : 'N/A'}`;

      const fileName = `${module.name}_stats_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(csv);

      logger.info(`📊 Stats CSV exportado: ${fileName} por ${req.user.username}`);
    } catch (error) {
      logger.error(`Erro ao exportar stats CSV: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao exportar stats', error: error.message });
    }
  });

  return router;
};
