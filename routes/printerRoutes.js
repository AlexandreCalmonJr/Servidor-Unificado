// routes/printerRoutes.js
// Rotas para gerenciar impressoras HP e Samsung

const express = require('express');
const router = express.Router();
const ManagedAsset = require('../models/ManagedAsset');
const AssetModuleConfig = require('../models/AssetModuleConfig');

/**
 * Middleware para validar se o módulo de impressoras existe
 */
const validatePrinterModule = async (req, res, next) => {
  try {
    const module = await AssetModuleConfig.findOne({ type: 'printer', is_active: true });
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Módulo de impressoras não configurado. Crie um módulo do tipo "printer" primeiro.',
      });
    }
    req.printerModule = module;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao validar módulo', error: error.message });
  }
};

module.exports = (logger, getApiLimiter, modifyApiLimiter, auth, deviceAuth, printerService) => {
  /**
   * GET /api/printers
   * Lista todas as impressoras gerenciadas com resumo de status
   */
  router.get('/', auth, getApiLimiter, validatePrinterModule, async (req, res) => {
    try {
      const printers = await ManagedAsset.find({
        module_id: req.printerModule._id,
        asset_type: 'printer',
        is_deleted: { $ne: true },
      })
        .select('asset_name manufacturer model ip_address connection_type status last_check_time custom_data')
        .lean();

      const summary = {
        total: printers.length,
        online: printers.filter(p => p.status === 'online').length,
        offline: printers.filter(p => p.status === 'offline').length,
        maintenance: printers.filter(p => p.status === 'maintenance').length,
      };

      logger.info(`Impressoras listadas: ${printers.length} por ${req.user.username}`);
      res.json({ success: true, printers, summary });
    } catch (error) {
      logger.error(`Erro ao listar impressoras: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao listar impressoras', error: error.message });
    }
  });

  /**
   * GET /api/printers/:printerId
   * Obtém detalhes completos de uma impressora específica
   */
  router.get('/:printerId', auth, getApiLimiter, validatePrinterModule, async (req, res) => {
    try {
      const printer = await ManagedAsset.findOne({
        _id: req.params.printerId,
        module_id: req.printerModule._id,
        asset_type: 'printer',
        is_deleted: { $ne: true },
      }).lean();

      if (!printer) {
        return res.status(404).json({ success: false, message: 'Impressora não encontrada' });
      }

      logger.info(`Impressora consultada: ${printer.asset_name} por ${req.user.username}`);
      res.json({ success: true, printer });
    } catch (error) {
      logger.error(`Erro ao obter impressora: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao obter impressora', error: error.message });
    }
  });

  /**
   * GET /api/printers/:printerId/status
   * Obtém status detalhado de uma impressora (online/offline, nível de toner, etc)
   */
  router.get('/:printerId/status', auth, getApiLimiter, validatePrinterModule, async (req, res) => {
    try {
      const printer = await ManagedAsset.findOne({
        _id: req.params.printerId,
        module_id: req.printerModule._id,
        asset_type: 'printer',
        is_deleted: { $ne: true },
      }).lean();

      if (!printer) {
        return res.status(404).json({ success: false, message: 'Impressora não encontrada' });
      }

      const status = {
        printer_id: printer._id,
        asset_name: printer.asset_name,
        status: printer.status,
        last_check_time: printer.last_check_time || printer.updated_at,
        connection_type: printer.connection_type,
        ip_address: printer.ip_address,
        manufacturer: printer.manufacturer,
        model: printer.model,
        toner_levels: printer.custom_data?.toner_levels || null,
        is_online: printer.status === 'online',
        last_seen: printer.last_seen,
      };

      logger.info(`Status de impressora consultado: ${printer.asset_name} por ${req.user.username}`);
      res.json({ success: true, status });
    } catch (error) {
      logger.error(`Erro ao obter status: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao obter status', error: error.message });
    }
  });

  /**
   * POST /api/printers/discover
   * Inicia processo de descoberta de impressoras na rede e USB
   * Requer autenticação de admin
   */
  router.post('/discover', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acesso negado. Apenas admins podem descobrir impressoras.' });
    }

    try {
      logger.info(`Iniciando descoberta de impressoras por ${req.user.username}`);

      // Inicia descoberta de forma assíncrona (não bloqueia a resposta)
      if (printerService) {
        printerService.discoverPrinters().catch(err => {
          logger.error(`Erro na descoberta de impressoras: ${err.message}`);
        });

        res.json({
          success: true,
          message: 'Descoberta de impressoras iniciada. Verifique o status em alguns momentos.',
        });
      } else {
        res.status(503).json({
          success: false,
          message: 'Serviço de impressoras não disponível',
        });
      }
    } catch (error) {
      logger.error(`Erro ao iniciar descoberta: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao iniciar descoberta', error: error.message });
    }
  });

  /**
   * POST /api/printers/register
   * Registra manualmente uma impressora
   * Requer autenticação de admin
   */
  router.post('/register', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acesso negado. Apenas admins podem registrar impressoras.' });
    }

    try {
      const {
        asset_name,
        serial_number,
        manufacturer,
        model,
        ip_address,
        connection_type, // 'network' ou 'usb'
      } = req.body;

      // Validações
      if (!asset_name || !serial_number || !connection_type) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: asset_name, serial_number, connection_type',
        });
      }

      if (!['network', 'usb'].includes(connection_type)) {
        return res.status(400).json({
          success: false,
          message: 'connection_type deve ser "network" ou "usb"',
        });
      }

      // Verifica se já existe
      const existing = await ManagedAsset.findOne({
        module_id: req.printerModule._id,
        serial_number,
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Uma impressora com este serial já está registrada',
        });
      }

      // Cria novo ativo
      const printer = new ManagedAsset({
        module_id: req.printerModule._id,
        asset_type: 'printer',
        asset_name,
        serial_number,
        manufacturer: manufacturer || 'Unknown',
        model: model || 'Unknown',
        ip_address: ip_address || null,
        connection_type,
        status: 'online',
        last_check_time: new Date(),
        created_by: req.user.id,
      });

      await printer.save();

      logger.info(`Impressora registrada: ${asset_name} por ${req.user.username}`);
      res.status(201).json({ success: true, printer, message: 'Impressora registrada com sucesso' });
    } catch (error) {
      logger.error(`Erro ao registrar impressora: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao registrar impressora', error: error.message });
    }
  });

  /**
   * PUT /api/printers/:printerId
   * Atualiza informações de uma impressora
   * Requer autenticação de admin
   */
  router.put('/:printerId', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acesso negado. Apenas admins podem atualizar impressoras.' });
    }

    try {
      const printer = await ManagedAsset.findOne({
        _id: req.params.printerId,
        module_id: req.printerModule._id,
        asset_type: 'printer',
        is_deleted: { $ne: true },
      });

      if (!printer) {
        return res.status(404).json({ success: false, message: 'Impressora não encontrada' });
      }

      // Atualiza campos permitidos
      const allowedFields = ['asset_name', 'manufacturer', 'model', 'ip_address', 'connection_type', 'status'];
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          printer[field] = req.body[field];
        }
      }

      printer.updated_by = req.user.id;
      printer.updated_at = new Date();

      await printer.save();

      logger.info(`Impressora atualizada: ${printer.asset_name} por ${req.user.username}`);
      res.json({ success: true, printer, message: 'Impressora atualizada com sucesso' });
    } catch (error) {
      logger.error(`Erro ao atualizar impressora: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao atualizar impressora', error: error.message });
    }
  });

  /**
   * DELETE /api/printers/:printerId
   * Deleta uma impressora (soft delete)
   * Requer autenticação de admin
   */
  router.delete('/:printerId', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acesso negado. Apenas admins podem deletar impressoras.' });
    }

    try {
      const printer = await ManagedAsset.findOne({
        _id: req.params.printerId,
        module_id: req.printerModule._id,
        asset_type: 'printer',
        is_deleted: { $ne: true },
      });

      if (!printer) {
        return res.status(404).json({ success: false, message: 'Impressora não encontrada' });
      }

      await printer.softDelete(req.user.id);

      logger.info(`Impressora deletada: ${printer.asset_name} por ${req.user.username}`);
      res.json({ success: true, message: 'Impressora deletada com sucesso' });
    } catch (error) {
      logger.error(`Erro ao deletar impressora: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao deletar impressora', error: error.message });
    }
  });

  /**
   * POST /api/printers/:printerId/refresh-status
   * Força atualização imediata do status de uma impressora
   * Requer autenticação de admin
   */
  router.post('/:printerId/refresh-status', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acesso negado. Apenas admins podem atualizar status.' });
    }

    try {
      const printer = await ManagedAsset.findOne({
        _id: req.params.printerId,
        module_id: req.printerModule._id,
        asset_type: 'printer',
        is_deleted: { $ne: true },
      });

      if (!printer) {
        return res.status(404).json({ success: false, message: 'Impressora não encontrada' });
      }

      if (printerService) {
        // Atualiza status de forma assíncrona
        printerService.updatePrinterStatus(printer).catch(err => {
          logger.error(`Erro ao atualizar status: ${err.message}`);
        });

        res.json({
          success: true,
          message: 'Atualização de status iniciada',
        });
      } else {
        res.status(503).json({
          success: false,
          message: 'Serviço de impressoras não disponível',
        });
      }
    } catch (error) {
      logger.error(`Erro ao atualizar status: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao atualizar status', error: error.message });
    }
  });

  return router;
};
