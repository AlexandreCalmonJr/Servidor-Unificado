// routes/printerRoutes.js
// Rotas REST para gerenciamento do módulo de impressoras

const express = require('express');
const ManagedAsset = require('../models/ManagedAsset');
const AssetModuleConfig = require('../models/AssetModuleConfig');
const printerPollerService = require('../services/printerPollerService');

const printerRoutes = (logger, getApiLimiter, modifyApiLimiter, auth) => {
  const router = express.Router();

  // ─── GET /api/printers ────────────────────────────────────────────────────
  router.get('/', auth, getApiLimiter, async (req, res) => {
    try {
      const { status, unit, search } = req.query;
      const filter = { asset_type: 'printer', is_deleted: { $ne: true } };
      if (status && status !== 'all') filter.status = status;
      if (unit) filter.unit = unit;
      if (search) {
        filter.$or = [
          { asset_name: { $regex: search, $options: 'i' } },
          { serial_number: { $regex: search, $options: 'i' } },
          { ip_address: { $regex: search, $options: 'i' } },
          { model: { $regex: search, $options: 'i' } },
        ];
      }

      const printers = await ManagedAsset.find(filter).sort({ status: 1, asset_name: 1 }).lean();

      const normalized = printers.map(p => ({
        ...p,
        custom_data: p.custom_data instanceof Map ? Object.fromEntries(p.custom_data) : (p.custom_data || {}),
        toner_levels: p.toner_levels instanceof Map ? Object.fromEntries(p.toner_levels) : (p.toner_levels || {}),
      }));

      res.json({ success: true, printers: normalized, total: normalized.length });
    } catch (err) {
      logger.error(`[printerRoutes] Erro ao listar impressoras: ${err.message}`);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ─── GET /api/printers/summary ────────────────────────────────────────────
  router.get('/summary', auth, getApiLimiter, async (req, res) => {
    try {
      const summary = await printerPollerService.getSummary();
      res.json({ success: true, summary });
    } catch (err) {
      logger.error(`[printerRoutes] Erro no summary: ${err.message}`);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ─── POST /api/printers/test-snmp ─────────────────────────────────────────
  // IMPORTANTE: deve vir antes de /:id para não ser interceptado
  router.post('/test-snmp', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { ip, community } = req.body;
      if (!ip) return res.status(400).json({ success: false, message: 'ip é obrigatório' });

      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(ip)) return res.status(400).json({ success: false, message: 'Formato de IP inválido' });

      logger.info(`🧪 Teste SNMP: ${ip} por ${req.user.username}`);
      const result = await printerPollerService.testPrinter(ip, community || 'public');
      res.json(result);
    } catch (err) {
      logger.error(`[printerRoutes] Erro no teste SNMP: ${err.message}`);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ─── POST /api/printers/poll-all ─────────────────────────────────────────
  router.post('/poll-all', auth, modifyApiLimiter, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Apenas admins podem forçar poll geral' });
      }
      printerPollerService.pollAll().catch(err =>
        logger.error(`[printerRoutes] Erro no poll-all: ${err.message}`)
      );
      res.json({ success: true, message: 'Poll iniciado em background. Atualize em alguns segundos.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ─── POST /api/printers ───────────────────────────────────────────────────
  router.post('/', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { asset_name, ip_address, model, serial_number, location, unit, sector, floor, snmp_community, connection_type, module_id } = req.body;
      if (!asset_name) return res.status(400).json({ success: false, message: 'asset_name é obrigatório' });

      let resolvedModuleId = module_id;
      if (!resolvedModuleId) {
        const printerModule = await AssetModuleConfig.findOne({ type: 'printer', is_active: true });
        if (!printerModule) {
          return res.status(422).json({ success: false, message: 'Nenhum módulo de impressora ativo. Crie o módulo primeiro.' });
        }
        resolvedModuleId = printerModule._id;
      }

      const printer = new ManagedAsset({
        module_id: resolvedModuleId,
        asset_type: 'printer',
        asset_name,
        serial_number: serial_number || `PRINTER-${Date.now()}`,
        ip_address: ip_address || null,
        model: model || 'N/A',
        location: location || null,
        unit: unit || 'N/A',
        sector: sector || 'Desconhecido',
        floor: floor || 'Desconhecido',
        status: 'offline',
        custom_data: {
          snmp_community: snmp_community || 'public',
          connection_type: connection_type || (ip_address ? 'ip' : 'usb'),
        },
      });

      await printer.save();
      logger.info(`🖨️ Impressora cadastrada: ${asset_name} (${ip_address || 'USB'}) por ${req.user.username}`);
      res.status(201).json({ success: true, printer });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ success: false, message: 'Impressora com este serial já existe neste módulo' });
      logger.error(`[printerRoutes] Erro ao cadastrar: ${err.message}`);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ─── GET /api/printers/:id ────────────────────────────────────────────────
  router.get('/:id', auth, getApiLimiter, async (req, res) => {
    try {
      const printer = await ManagedAsset.findOne({
        _id: req.params.id, asset_type: 'printer', is_deleted: { $ne: true },
      }).lean();

      if (!printer) return res.status(404).json({ success: false, message: 'Impressora não encontrada' });

      const normalized = {
        ...printer,
        custom_data: printer.custom_data instanceof Map ? Object.fromEntries(printer.custom_data) : (printer.custom_data || {}),
        toner_levels: printer.toner_levels instanceof Map ? Object.fromEntries(printer.toner_levels) : (printer.toner_levels || {}),
      };

      res.json({ success: true, printer: normalized });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ─── PUT /api/printers/:id ────────────────────────────────────────────────
  router.put('/:id', auth, modifyApiLimiter, async (req, res) => {
    try {
      const allowed = ['asset_name', 'ip_address', 'model', 'serial_number', 'location', 'unit', 'sector', 'floor', 'status'];
      const update = {};
      allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
      if (req.body.snmp_community) update['custom_data.snmp_community'] = req.body.snmp_community;

      const printer = await ManagedAsset.findOneAndUpdate(
        { _id: req.params.id, asset_type: 'printer' },
        { $set: update }, { new: true }
      );

      if (!printer) return res.status(404).json({ success: false, message: 'Impressora não encontrada' });
      res.json({ success: true, printer });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ─── DELETE /api/printers/:id ─────────────────────────────────────────────
  router.delete('/:id', auth, modifyApiLimiter, async (req, res) => {
    try {
      const printer = await ManagedAsset.findOneAndDelete({ _id: req.params.id, asset_type: 'printer' });
      if (!printer) return res.status(404).json({ success: false, message: 'Impressora não encontrada' });
      logger.info(`🗑️ Impressora removida: ${printer.asset_name} por ${req.user.username}`);
      res.json({ success: true, message: 'Impressora removida' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ─── POST /api/printers/:id/poll ──────────────────────────────────────────
  router.post('/:id/poll', auth, modifyApiLimiter, async (req, res) => {
    try {
      const printer = await ManagedAsset.findOne({
        _id: req.params.id, asset_type: 'printer', is_deleted: { $ne: true },
      }).lean();

      if (!printer) return res.status(404).json({ success: false, message: 'Impressora não encontrada' });
      if (!printer.ip_address || printer.ip_address === 'N/A') {
        return res.status(400).json({ success: false, message: 'Impressora USB — poll SNMP indisponível.' });
      }

      await printerPollerService.pollPrinter(printer);

      const updated = await ManagedAsset.findById(printer._id).lean();
      const normalized = {
        ...updated,
        custom_data: updated.custom_data instanceof Map ? Object.fromEntries(updated.custom_data) : (updated.custom_data || {}),
        toner_levels: updated.toner_levels instanceof Map ? Object.fromEntries(updated.toner_levels) : (updated.toner_levels || {}),
      };

      logger.info(`🔄 Poll manual: ${printer.asset_name} por ${req.user.username}`);
      res.json({ success: true, printer: normalized });
    } catch (err) {
      logger.error(`[printerRoutes] Erro no poll manual: ${err.message}`);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
};

module.exports = printerRoutes;
