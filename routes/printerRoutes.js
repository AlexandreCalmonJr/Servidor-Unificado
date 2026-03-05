const express = require('express');
const ManagedAsset = require('../models/ManagedAsset');
const AssetModuleConfig = require('../models/AssetModuleConfig');

module.exports = (logger, getApiLimiter, modifyApiLimiter, auth, _deviceAuth, printerService) => {
  const router = express.Router();

  const validatePrinterModule = async (req, res, next) => {
    try {
      let module = await AssetModuleConfig.findOne({ type: 'printer', is_active: true });
      if (!module) {
        module = await AssetModuleConfig.create({
          name: 'Impressoras',
          type: 'printer',
          description: 'Modulo de monitoramento de impressoras HP/Samsung',
          is_active: true,
          table_columns: [
            { dataKey: 'asset_name', label: 'Nome' },
            { dataKey: 'model', label: 'Modelo' },
            { dataKey: 'connection_type', label: 'Conexao' },
            { dataKey: 'status', label: 'Status' },
            { dataKey: 'last_check_time', label: 'Ultima Leitura' },
          ],
        });
        logger.info('[printerRoutes] Modulo printer criado automaticamente');
      }

      req.printerModule = module;
      return next();
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  function normalizePrinter(printer) {
    const data = printer?.custom_data instanceof Map
      ? Object.fromEntries(printer.custom_data)
      : (printer?.custom_data || {});

    const toner = printer?.toner_levels instanceof Map
      ? Object.fromEntries(printer.toner_levels)
      : (printer?.toner_levels || data.toner_levels || {});

    return {
      ...printer,
      custom_data: data,
      toner_levels: toner,
      connection_type: printer?.connection_type || data.connection_type || 'unknown',
      snmp_community: printer?.snmp_community || data.snmp_community || 'public',
    };
  }

  function normalizePrinterStatus(rawStatus) {
    if (rawStatus === undefined || rawStatus === null || rawStatus === '') return undefined;
    const value = String(rawStatus).trim().toLowerCase();

    const aliasMap = {
      online: 'online',
      offline: 'offline',
      maintenance: 'maintenance',
      retired: 'retired',
      unknown: 'unknown',
      active: 'online',
      inactive: 'offline',
      ativo: 'online',
      inativo: 'offline',
      manutencao: 'maintenance',
      'manutenção': 'maintenance',
    };

    return aliasMap[value];
  }

  router.get('/', auth, getApiLimiter, validatePrinterModule, async (req, res) => {
    try {
      const { status, manufacturer, connection_type, search } = req.query;
      const filter = {
        module_id: req.printerModule._id,
        asset_type: 'printer',
        is_deleted: { $ne: true },
      };

      if (status) {
        const normalizedStatus = normalizePrinterStatus(status);
        if (normalizedStatus) filter.status = normalizedStatus;
      }
      if (manufacturer) filter.manufacturer = manufacturer;
      if (connection_type) filter.connection_type = connection_type;
      if (search) {
        filter.$or = [
          { asset_name: { $regex: search, $options: 'i' } },
          { serial_number: { $regex: search, $options: 'i' } },
          { model: { $regex: search, $options: 'i' } },
          { ip_address: { $regex: search, $options: 'i' } },
        ];
      }

      const printersRaw = await ManagedAsset.find(filter)
        .sort({ status: 1, asset_name: 1 })
        .lean();

      const printers = printersRaw.map(normalizePrinter);
      const summary = {
        total: printers.length,
        online: printers.filter((p) => p.status === 'online').length,
        offline: printers.filter((p) => p.status === 'offline').length,
        maintenance: printers.filter((p) => p.status === 'maintenance').length,
      };

      return res.json({ success: true, printers, summary });
    } catch (error) {
      logger.error(`Erro ao listar impressoras: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.get('/summary', auth, getApiLimiter, validatePrinterModule, async (req, res) => {
    try {
      let summary;
      if (printerService?.getSummary) {
        summary = await printerService.getSummary();
      } else {
        const total = await ManagedAsset.countDocuments({
          module_id: req.printerModule._id,
          asset_type: 'printer',
          is_deleted: { $ne: true },
        });
        summary = { total, online: 0, offline: 0, maintenance: 0, toner_alerts: 0 };
      }
      return res.json({ success: true, summary });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post('/test-snmp', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { ip, community } = req.body;
      if (!ip) return res.status(400).json({ success: false, message: 'ip e obrigatorio' });
      if (!printerService?.testPrinter) {
        return res.status(503).json({ success: false, message: 'Servico de impressoras indisponivel' });
      }

      const result = await printerService.testPrinter(ip, community || 'public');
      return res.json({ success: true, result });
    } catch (error) {
      logger.error(`Erro no teste SNMP: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.get('/test-snmp/:ip', auth, getApiLimiter, async (req, res) => {
    try {
      const community = req.query.community || 'public';
      if (!printerService?.testPrinter) {
        return res.status(503).json({ success: false, message: 'Servico de impressoras indisponivel' });
      }

      const result = await printerService.testPrinter(req.params.ip, community);
      return res.json({ success: true, result });
    } catch (error) {
      logger.error(`Erro no teste SNMP: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post('/discover', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Apenas admins podem descobrir impressoras.' });
    }

    try {
      if (!printerService?.discoverPrinters) {
        return res.status(503).json({ success: false, message: 'Servico de impressoras indisponivel' });
      }

      const persist = req.body?.persist === true || req.query.persist === 'true';
      const result = await printerService.discoverPrinters({ persist });
      return res.json({
        success: true,
        message: persist ? 'Descoberta e cadastro finalizados' : 'Descoberta finalizada',
        ...result,
      });
    } catch (error) {
      logger.error(`Erro na descoberta: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.get('/usb/detect', auth, getApiLimiter, async (req, res) => {
    try {
      if (!printerService?.detectUsbPrinters) {
        return res.status(503).json({ success: false, message: 'Servico de impressoras indisponivel' });
      }
      const printers = await printerService.detectUsbPrinters();
      return res.json({ success: true, printers, total: printers.length });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post('/poll-all', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Apenas admins podem forcar poll geral.' });
    }
    try {
      if (!printerService?.pollAll) {
        return res.status(503).json({ success: false, message: 'Servico de impressoras indisponivel' });
      }
      const result = await printerService.pollAll();
      return res.json({ success: true, result });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post('/register', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Apenas admins podem registrar impressoras.' });
    }

    try {
      const data = req.body || {};
      if (!data.asset_name || !data.serial_number || !data.connection_type) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatorios: asset_name, serial_number, connection_type',
        });
      }

      const normalizedType = data.connection_type === 'ip' ? 'network' : data.connection_type;
      const normalizedStatus = normalizePrinterStatus(data.status);
      if (!['network', 'usb'].includes(normalizedType)) {
        return res.status(400).json({ success: false, message: 'connection_type deve ser "network" ou "usb"' });
      }

      const existing = await ManagedAsset.findOne({
        module_id: req.printerModule._id,
        serial_number: data.serial_number,
      });
      const customDataInput = data.custom_data || {};
      if (existing) {
        existing.asset_name = data.asset_name;
        existing.manufacturer = data.manufacturer || existing.manufacturer || 'Unknown';
        existing.model = data.model || existing.model || 'Unknown';
        existing.ip_address = data.ip_address || existing.ip_address || null;
        existing.connection_type = normalizedType;
        existing.usb_path = data.usb_path || existing.usb_path || null;
        existing.snmp_community = data.snmp_community || existing.snmp_community || 'public';
        if (normalizedStatus) existing.status = normalizedStatus;
        existing.hostname = data.hostname || existing.hostname || null;
        existing.mac_address = data.mac_address || existing.mac_address || null;
        existing.location = data.location || existing.location || null;
        existing.floor = data.floor || existing.floor || existing.location || existing.floor || null;
        existing.custom_data = {
          ...(existing.custom_data instanceof Map ? Object.fromEntries(existing.custom_data) : (existing.custom_data || {})),
          ...customDataInput,
          print_mode: 'mono',
        };
        if (existing.is_deleted) {
          existing.is_deleted = false;
          existing.deleted_at = null;
          existing.deleted_by = null;
        }
        await existing.save();

        logger.info(`Impressora atualizada no cadastro: ${existing.asset_name} por ${req.user.username}`);
        return res.json({
          success: true,
          updated: true,
          message: 'Impressora ja existia e foi atualizada',
          printer: normalizePrinter(existing.toObject()),
        });
      }

      const printer = await ManagedAsset.create({
        module_id: req.printerModule._id,
        asset_type: 'printer',
        asset_name: data.asset_name,
        serial_number: data.serial_number,
        manufacturer: data.manufacturer || 'Unknown',
        model: data.model || 'Unknown',
        ip_address: data.ip_address || null,
        connection_type: normalizedType,
        usb_path: data.usb_path || null,
        snmp_community: data.snmp_community || 'public',
        hostname: data.hostname || null,
        mac_address: data.mac_address || null,
        location: data.location || null,
        floor: data.floor || data.location || null,
        custom_data: {
          ...customDataInput,
          print_mode: 'mono',
        },
        status: normalizedStatus || 'offline',
      });

      logger.info(`Impressora registrada: ${printer.asset_name} por ${req.user.username}`);
      return res.status(201).json({ success: true, printer: normalizePrinter(printer.toObject()) });
    } catch (error) {
      logger.error(`Erro ao registrar impressora: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post('/register-batch', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Apenas admins podem registrar impressoras.' });
    }

    try {
      const printers = Array.isArray(req.body?.printers) ? req.body.printers : [];
      if (!printers.length) {
        return res.status(400).json({ success: false, message: 'Lista de impressoras vazia' });
      }

      const results = [];
      for (const p of printers) {
        if (!p.asset_name || !p.serial_number || !p.connection_type) {
          results.push({
            success: false,
            serial_number: p.serial_number || null,
            message: 'Campos obrigatorios: asset_name, serial_number, connection_type',
          });
          // eslint-disable-next-line no-continue
          continue;
        }

        const normalizedType = p.connection_type === 'ip' ? 'network' : p.connection_type;
        const normalizedStatus = normalizePrinterStatus(p.status);
        if (!['network', 'usb'].includes(normalizedType)) {
          results.push({
            success: false,
            serial_number: p.serial_number,
            message: 'connection_type invalido',
          });
          // eslint-disable-next-line no-continue
          continue;
        }

        const existing = await ManagedAsset.findOne({
          module_id: req.printerModule._id,
          serial_number: p.serial_number,
        });

        const customData = {
          ...(p.custom_data || {}),
          print_mode: 'mono',
        };

        if (existing) {
          existing.asset_name = p.asset_name;
          existing.manufacturer = p.manufacturer || existing.manufacturer || 'Unknown';
          existing.model = p.model || existing.model || 'Unknown';
          existing.ip_address = p.ip_address || existing.ip_address || null;
          existing.connection_type = normalizedType;
          existing.usb_path = p.usb_path || existing.usb_path || null;
          existing.snmp_community = p.snmp_community || existing.snmp_community || 'public';
          if (normalizedStatus) existing.status = normalizedStatus;
          existing.hostname = p.hostname || existing.hostname || null;
          existing.mac_address = p.mac_address || existing.mac_address || null;
          existing.location = p.location || existing.location || null;
          existing.floor = p.floor || existing.floor || p.location || null;
          existing.custom_data = {
            ...(existing.custom_data instanceof Map ? Object.fromEntries(existing.custom_data) : (existing.custom_data || {})),
            ...customData,
          };
          if (existing.is_deleted) {
            existing.is_deleted = false;
            existing.deleted_at = null;
            existing.deleted_by = null;
          }
          await existing.save();
          results.push({ success: true, updated: true, printer: normalizePrinter(existing.toObject()) });
          // eslint-disable-next-line no-continue
          continue;
        }

        const created = await ManagedAsset.create({
          module_id: req.printerModule._id,
          asset_type: 'printer',
          asset_name: p.asset_name,
          serial_number: p.serial_number,
          manufacturer: p.manufacturer || 'Unknown',
          model: p.model || 'Unknown',
          ip_address: p.ip_address || null,
          connection_type: normalizedType,
          usb_path: p.usb_path || null,
          snmp_community: p.snmp_community || 'public',
          hostname: p.hostname || null,
          mac_address: p.mac_address || null,
          location: p.location || null,
          floor: p.floor || p.location || null,
          custom_data: customData,
          status: normalizedStatus || 'offline',
        });

        results.push({ success: true, updated: false, printer: normalizePrinter(created.toObject()) });
      }

      const successCount = results.filter((r) => r.success).length;
      return res.status(successCount ? 200 : 400).json({
        success: successCount > 0,
        total: printers.length,
        success_count: successCount,
        failed_count: printers.length - successCount,
        results,
      });
    } catch (error) {
      logger.error(`Erro no registro em lote: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.delete('/reset/all', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Apenas admins podem limpar impressoras.' });
    }

    try {
      const result = await ManagedAsset.deleteMany({
        module_id: req.printerModule._id,
        asset_type: 'printer',
      });

      logger.warn(`[printerRoutes] Limpeza total de impressoras executada por ${req.user.username}. Removidas: ${result.deletedCount}`);
      return res.json({
        success: true,
        message: 'Cadastro de impressoras limpo com sucesso',
        deleted_count: result.deletedCount || 0,
      });
    } catch (error) {
      logger.error(`Erro ao limpar impressoras: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.get('/:printerId', auth, getApiLimiter, validatePrinterModule, async (req, res) => {
    try {
      const printer = await ManagedAsset.findOne({
        _id: req.params.printerId,
        module_id: req.printerModule._id,
        asset_type: 'printer',
        is_deleted: { $ne: true },
      }).lean();

      if (!printer) return res.status(404).json({ success: false, message: 'Impressora nao encontrada' });
      return res.json({ success: true, printer: normalizePrinter(printer) });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.get('/:printerId/status', auth, getApiLimiter, validatePrinterModule, async (req, res) => {
    try {
      const printer = await ManagedAsset.findOne({
        _id: req.params.printerId,
        module_id: req.printerModule._id,
        asset_type: 'printer',
        is_deleted: { $ne: true },
      }).lean();

      if (!printer) return res.status(404).json({ success: false, message: 'Impressora nao encontrada' });
      const normalized = normalizePrinter(printer);

      return res.json({
        success: true,
        status: {
          printer_id: normalized._id,
          asset_name: normalized.asset_name,
          status: normalized.status,
          last_check_time: normalized.last_check_time || normalized.updated_at,
          connection_type: normalized.connection_type,
          ip_address: normalized.ip_address,
          toner_levels: normalized.toner_levels || {},
          is_online: normalized.status === 'online',
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.put('/:printerId', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Apenas admins podem atualizar impressoras.' });
    }
    try {
      const allowed = [
        'asset_name',
        'manufacturer',
        'model',
        'ip_address',
        'connection_type',
        'usb_path',
        'snmp_community',
        'status',
        'hostname',
        'mac_address',
        'location',
        'floor',
        'custom_data',
      ];
      const update = {};
      allowed.forEach((field) => {
        if (req.body[field] !== undefined) update[field] = req.body[field];
      });
      if (update.connection_type === 'ip') update.connection_type = 'network';
      if (update.status !== undefined) {
        const normalizedStatus = normalizePrinterStatus(update.status);
        if (!normalizedStatus) {
          return res.status(400).json({
            success: false,
            message: 'status invalido. Use: online, offline, maintenance, retired ou unknown',
          });
        }
        update.status = normalizedStatus;
      }

      const printer = await ManagedAsset.findOneAndUpdate(
        {
          _id: req.params.printerId,
          module_id: req.printerModule._id,
          asset_type: 'printer',
          is_deleted: { $ne: true },
        },
        { $set: update },
        { new: true }
      ).lean();

      if (!printer) return res.status(404).json({ success: false, message: 'Impressora nao encontrada' });
      return res.json({ success: true, printer: normalizePrinter(printer) });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.delete('/:printerId', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Apenas admins podem deletar impressoras.' });
    }
    try {
      const printer = await ManagedAsset.findOne({
        _id: req.params.printerId,
        module_id: req.printerModule._id,
        asset_type: 'printer',
        is_deleted: { $ne: true },
      });
      if (!printer) return res.status(404).json({ success: false, message: 'Impressora nao encontrada' });

      await printer.softDelete(req.user.id);
      return res.json({ success: true, message: 'Impressora deletada com sucesso' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post('/:printerId/refresh-status', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Apenas admins podem atualizar status.' });
    }
    try {
      const printer = await ManagedAsset.findOne({
        _id: req.params.printerId,
        module_id: req.printerModule._id,
        asset_type: 'printer',
        is_deleted: { $ne: true },
      });
      if (!printer) return res.status(404).json({ success: false, message: 'Impressora nao encontrada' });
      if (!printerService?.updatePrinterStatus) {
        return res.status(503).json({ success: false, message: 'Servico de impressoras indisponivel' });
      }

      await printerService.updatePrinterStatus(printer);
      const updated = await ManagedAsset.findById(printer._id).lean();
      return res.json({ success: true, printer: normalizePrinter(updated) });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post('/:printerId/poll', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Apenas admins podem atualizar status.' });
    }
    try {
      const printer = await ManagedAsset.findOne({
        _id: req.params.printerId,
        module_id: req.printerModule._id,
        asset_type: 'printer',
        is_deleted: { $ne: true },
      });
      if (!printer) return res.status(404).json({ success: false, message: 'Impressora nao encontrada' });
      if (!printerService?.updatePrinterStatus) {
        return res.status(503).json({ success: false, message: 'Servico de impressoras indisponivel' });
      }

      await printerService.updatePrinterStatus(printer);
      const updated = await ManagedAsset.findById(printer._id).lean();
      return res.json({ success: true, printer: normalizePrinter(updated) });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
};
