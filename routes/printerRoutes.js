const express = require('express');
const ManagedAsset = require('../models/ManagedAsset');
const AssetModuleConfig = require('../models/AssetModuleConfig');
const PrinterInventoryEvent = require('../models/PrinterInventoryEvent');
const PrinterSupplyItem = require('../models/PrinterSupplyItem');
const PrinterSupplyMovement = require('../models/PrinterSupplyMovement');
const locationService = require('../services/locationService');
const NotificationService = require('../services/notificationService');

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

  function cleanMappedValue(value, unknownTokens = []) {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    if (!normalized) return null;
    const lowered = normalized.toLowerCase();
    if (unknownTokens.includes(lowered)) return null;
    return normalized;
  }

  async function resolveMappedLocation(input = {}, fallback = {}) {
    const safeInput = input || {};
    const safeFallback = fallback || {};
    const ipAddress = safeInput.ip_address || safeFallback.ip_address || null;
    const macAddress = safeInput.mac_address || safeInput.mac_address_radio || safeFallback.mac_address || null;
    let mapped = null;

    if (ipAddress || macAddress) {
      try {
        mapped = await locationService.mapDeviceLocation({
          ip_address: ipAddress,
          mac_address_radio: macAddress,
          device_name: safeInput.asset_name || safeFallback.asset_name || 'Printer',
        });
      } catch (error) {
        logger.warn(`[printerRoutes] Falha ao mapear localizacao da impressora: ${error.message}`);
      }
    }

    const unit = cleanMappedValue(safeInput.unit ?? safeFallback.unit) || cleanMappedValue(mapped?.unit, ['n/a']);
    const sector = cleanMappedValue(safeInput.sector ?? safeFallback.sector) || cleanMappedValue(mapped?.sector, ['desconhecido', 'unknown']);
    const floor = cleanMappedValue(safeInput.floor ?? safeFallback.floor ?? safeInput.location ?? safeFallback.location)
      || cleanMappedValue(mapped?.floor, ['desconhecido', 'unknown']);
    const location = cleanMappedValue(safeInput.location ?? safeFallback.location) || floor || null;

    return { unit, sector, floor, location };
  }

  function sortableText(value) {
    const v = String(value || '').trim().toLowerCase();
    if (!v) return '\uffff';
    if (['n/a', 'desconhecido', 'unknown', '-'].includes(v)) return '\uffff';
    return v;
  }

  function normalizeStock(settingsMap) {
    const settings = settingsMap instanceof Map ? Object.fromEntries(settingsMap) : (settingsMap || {});
    const current = settings.printer_inventory_stock || {};
    const rawByModel = current.by_model || {};
    const byModel = {};
    Object.entries(rawByModel).forEach(([key, value]) => {
      if (!key || !value || typeof value !== 'object') return;
      byModel[key] = {
        label: String(value.label || key),
        toner_black: Math.max(0, Number(value.toner_black || 0)),
        imaging_unit: Math.max(0, Number(value.imaging_unit || 0)),
      };
    });
    return {
      toner_black: Number(current.toner_black || 0),
      imaging_unit: Number(current.imaging_unit || 0),
      backup_printer: Number(current.backup_printer || 0),
      by_model: byModel,
    };
  }

  function normalizeSupplyItem(item) {
    if (!item) return null;
    return {
      ...item,
      is_low_stock: Number(item.quantity_on_hand || 0) <= Number(item.min_stock || 0),
    };
  }

  function normalizeSupplyCategory(rawCategory) {
    const value = String(rawCategory || '').trim().toLowerCase();
    const compact = value.replace(/[\s-]+/g, '_');

    if (['toner_black', 'toner', 'black_toner', 'bk_toner'].includes(compact)) return 'toner_black';
    if (['imaging_unit', 'image_unit', 'drum', 'opc', 'unidade_imagem', 'unidade_de_imagem'].includes(compact)) return 'imaging_unit';
    if (['backup_printer', 'printer_backup', 'impressora_backup'].includes(compact)) return 'backup_printer';
    return compact || 'other';
  }

  function calculateMovementResult(movementType, inputQty, currentQty, quantityAfterInput) {
    const quantity = Number(inputQty);
    const current = Number(currentQty || 0);
    if (!Number.isFinite(current) || current < 0) throw new Error('Estoque atual invalido');

    if (movementType === 'adjustment') {
      const target = Number(quantityAfterInput);
      if (!Number.isFinite(target) || target < 0) throw new Error('quantity_after deve ser numerico e >= 0');
      return {
        delta: target - current,
        after: target,
      };
    }

    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('quantity deve ser numerico e > 0');

    if (movementType === 'in' || movementType === 'initial') {
      return { delta: quantity, after: current + quantity };
    }

    if (movementType === 'out' || movementType === 'consumption' || movementType === 'transfer') {
      const after = current - quantity;
      if (after < 0) throw new Error('Estoque insuficiente para esta movimentacao');
      return { delta: -quantity, after };
    }

    throw new Error('movement_type invalido');
  }

  async function notifyLowSupplyIfNeeded(module, supply, previousQty, currentQty) {
    const minStock = Number(supply.min_stock || 0);
    if (minStock <= 0) return;

    const previous = Number(previousQty || 0);
    const current = Number(currentQty || 0);
    const becameLow = previous > minStock && current <= minStock;
    if (!becameLow) return;

    const message = `${supply.name} (${supply.sku}) em estoque baixo: ${current} ${supply.unit_of_measure || 'un'}`;
    NotificationService.notifyError('Estoque de insumo baixo', message, 'warning');

    await PrinterInventoryEvent.create({
      module_id: module._id,
      event_type: 'alert',
      item_type: supply.category || 'other',
      quantity_delta: 0,
      quantity_after: current,
      reason: 'low_stock',
      notes: message,
      severity: 'warning',
      metadata: {
        supply_id: supply._id,
        sku: supply.sku,
        supply_name: supply.name,
        min_stock: minStock,
      },
    });
  }

  function normalizeModelKey(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return null;
    return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  async function saveStock(module, nextStock) {
    const settings = module.settings instanceof Map
      ? Object.fromEntries(module.settings)
      : (module.settings || {});
    const byModel = {};
    Object.entries(nextStock.by_model || {}).forEach(([key, val]) => {
      const modelKey = normalizeModelKey(key);
      if (!modelKey || !val || typeof val !== 'object') return;
      byModel[modelKey] = {
        label: String(val.label || modelKey),
        toner_black: Math.max(0, Number(val.toner_black || 0)),
        imaging_unit: Math.max(0, Number(val.imaging_unit || 0)),
      };
    });
    module.settings = {
      ...settings,
      printer_inventory_stock: {
        toner_black: Math.max(0, Number(nextStock.toner_black || 0)),
        imaging_unit: Math.max(0, Number(nextStock.imaging_unit || 0)),
        backup_printer: Math.max(0, Number(nextStock.backup_printer || 0)),
        by_model: byModel,
      },
    };
    await module.save();
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
          { unit: { $regex: search, $options: 'i' } },
          { sector: { $regex: search, $options: 'i' } },
          { floor: { $regex: search, $options: 'i' } },
        ];
      }

      const printersRaw = await ManagedAsset.find(filter)
        .sort({ status: 1, asset_name: 1 })
        .lean();

      const printers = printersRaw
        .map(normalizePrinter)
        .sort((a, b) => (
          sortableText(a.unit).localeCompare(sortableText(b.unit), 'pt-BR')
          || sortableText(a.sector).localeCompare(sortableText(b.sector), 'pt-BR')
          || sortableText(a.floor || a.location).localeCompare(sortableText(b.floor || b.location), 'pt-BR')
          || sortableText(a.asset_name).localeCompare(sortableText(b.asset_name), 'pt-BR')
        ));
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

  router.get('/inventory/summary', auth, getApiLimiter, validatePrinterModule, async (req, res) => {
    try {
      const stockLegacy = normalizeStock(req.printerModule.settings);
      const supplyItems = await PrinterSupplyItem.find({
        module_id: req.printerModule._id,
        is_active: true,
      }).lean();
      const stockBySupplies = supplyItems.reduce((acc, item) => {
        const category = normalizeSupplyCategory(item.category);
        const qty = Math.max(0, Number(item.quantity_on_hand || 0));
        if (category === 'toner_black') acc.toner_black += qty;
        if (category === 'imaging_unit') acc.imaging_unit += qty;
        if (category === 'backup_printer') acc.backup_printer += qty;
        return acc;
      }, { toner_black: 0, imaging_unit: 0, backup_printer: 0 });
      const stock = {
        ...stockBySupplies,
        by_model: stockLegacy.by_model || {},
      };
      const printers = await ManagedAsset.find({
        module_id: req.printerModule._id,
        asset_type: 'printer',
        is_deleted: { $ne: true },
      }).lean();

      const tonerLow = printers.filter((p) => {
        const levels = p.toner_levels || p.custom_data?.toner_levels || {};
        return levels.black !== undefined && Number(levels.black) <= 15;
      }).length;
      const imagingLow = printers.filter((p) => {
        const levels = p.toner_levels || p.custom_data?.toner_levels || {};
        return levels.imaging_unit !== undefined && Number(levels.imaging_unit) <= 15;
      }).length;
      const modelOptionsMap = new Map();
      printers.forEach((p) => {
        const manufacturer = String(p.manufacturer || '').trim();
        const model = String(p.model || '').trim();
        if (!model || model.toLowerCase() === 'unknown') return;
        const label = manufacturer ? `${manufacturer} ${model}` : model;
        const key = normalizeModelKey(label);
        if (!key) return;
        if (!modelOptionsMap.has(key)) modelOptionsMap.set(key, { key, label });
      });
      Object.entries(stock.by_model || {}).forEach(([key, val]) => {
        if (!modelOptionsMap.has(key)) {
          modelOptionsMap.set(key, { key, label: String(val.label || key) });
        }
      });
      const modelOptions = Array.from(modelOptionsMap.values())
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

      return res.json({
        success: true,
        stock,
        model_options: modelOptions,
        printers: {
          total: printers.length,
          toner_low: tonerLow,
          imaging_low: imagingLow,
        },
      });
    } catch (error) {
      logger.error(`Erro no resumo de inventario: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.get('/inventory/events', auth, getApiLimiter, validatePrinterModule, async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit || 100), 500);
      const filter = { module_id: req.printerModule._id };
      if (req.query.printer_id) filter.printer_id = req.query.printer_id;
      if (req.query.event_type) filter.event_type = req.query.event_type;

      const events = await PrinterInventoryEvent.find(filter)
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();

      return res.json({ success: true, events, total: events.length });
    } catch (error) {
      logger.error(`Erro ao listar eventos de inventario: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.get('/inventory/supplies', auth, getApiLimiter, validatePrinterModule, async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit || 300), 1000);
      const filter = { module_id: req.printerModule._id };

      if (req.query.is_active === 'true') filter.is_active = true;
      if (req.query.is_active === 'false') filter.is_active = false;
      if (req.query.category) filter.category = req.query.category;
      if (req.query.search) {
        filter.$or = [
          { name: { $regex: req.query.search, $options: 'i' } },
          { sku: { $regex: req.query.search, $options: 'i' } },
          { manufacturer: { $regex: req.query.search, $options: 'i' } },
          { model_family: { $regex: req.query.search, $options: 'i' } },
        ];
      }

      let items = await PrinterSupplyItem.find(filter)
        .sort({ category: 1, name: 1 })
        .limit(limit)
        .lean();

      if (req.query.low_only === 'true') {
        items = items.filter((item) => Number(item.quantity_on_hand || 0) <= Number(item.min_stock || 0));
      }

      return res.json({
        success: true,
        total: items.length,
        items: items.map(normalizeSupplyItem),
      });
    } catch (error) {
      logger.error(`Erro ao listar insumos: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post('/inventory/supplies', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Apenas admins podem cadastrar insumos.' });
    }
    try {
      const payload = req.body || {};
      const sku = String(payload.sku || '').trim();
      const name = String(payload.name || '').trim();
      if (!sku || !name) {
        return res.status(400).json({ success: false, message: 'Campos obrigatorios: sku, name' });
      }

      const existing = await PrinterSupplyItem.findOne({
        module_id: req.printerModule._id,
        sku,
      }).lean();
      if (existing) {
        return res.status(409).json({ success: false, message: 'SKU ja cadastrado para impressoras' });
      }

      const quantityOnHand = Math.max(0, Number(payload.quantity_on_hand || 0));
      const minStock = Math.max(0, Number(payload.min_stock || 0));
      const reorderPoint = Math.max(0, Number(payload.reorder_point || minStock));
      const item = await PrinterSupplyItem.create({
        module_id: req.printerModule._id,
        sku,
        name,
        category: payload.category || 'other',
        manufacturer: payload.manufacturer || null,
        model_family: payload.model_family || null,
        compatible_models: Array.isArray(payload.compatible_models) ? payload.compatible_models : [],
        compatible_manufacturers: Array.isArray(payload.compatible_manufacturers) ? payload.compatible_manufacturers : [],
        unit_of_measure: payload.unit_of_measure || 'un',
        quantity_on_hand: quantityOnHand,
        min_stock: minStock,
        reorder_point: reorderPoint,
        storage_location: payload.storage_location || null,
        is_active: payload.is_active !== false,
        notes: payload.notes || '',
      });

      if (quantityOnHand > 0) {
        await PrinterSupplyMovement.create({
          module_id: req.printerModule._id,
          supply_id: item._id,
          movement_type: 'initial',
          quantity: quantityOnHand,
          quantity_before: 0,
          quantity_after: quantityOnHand,
          reason: 'initial_stock',
          notes: 'Cadastro inicial do insumo',
          created_by: req.user.id || null,
        });
      }

      return res.status(201).json({ success: true, item: normalizeSupplyItem(item.toObject()) });
    } catch (error) {
      logger.error(`Erro ao cadastrar insumo: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.put('/inventory/supplies/:supplyId', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Apenas admins podem editar insumos.' });
    }
    try {
      const allowed = [
        'name',
        'category',
        'manufacturer',
        'model_family',
        'compatible_models',
        'compatible_manufacturers',
        'unit_of_measure',
        'min_stock',
        'reorder_point',
        'storage_location',
        'is_active',
        'notes',
      ];
      const setData = {};
      allowed.forEach((key) => {
        if (req.body[key] !== undefined) setData[key] = req.body[key];
      });
      if (setData.min_stock !== undefined) setData.min_stock = Math.max(0, Number(setData.min_stock || 0));
      if (setData.reorder_point !== undefined) setData.reorder_point = Math.max(0, Number(setData.reorder_point || 0));

      const item = await PrinterSupplyItem.findOneAndUpdate(
        { _id: req.params.supplyId, module_id: req.printerModule._id },
        { $set: setData },
        { new: true }
      ).lean();
      if (!item) return res.status(404).json({ success: false, message: 'Insumo nao encontrado' });
      return res.json({ success: true, item: normalizeSupplyItem(item) });
    } catch (error) {
      logger.error(`Erro ao atualizar insumo: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.get('/inventory/movements', auth, getApiLimiter, validatePrinterModule, async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit || 300), 1000);
      const filter = { module_id: req.printerModule._id };
      if (req.query.supply_id) filter.supply_id = req.query.supply_id;
      if (req.query.printer_id) filter.printer_id = req.query.printer_id;
      if (req.query.movement_type) filter.movement_type = req.query.movement_type;

      const rows = await PrinterSupplyMovement.find(filter)
        .sort({ created_at: -1 })
        .limit(limit)
        .populate('supply_id', 'name sku category unit_of_measure')
        .populate('printer_id', 'asset_name serial_number manufacturer model')
        .lean();

      return res.json({ success: true, total: rows.length, movements: rows });
    } catch (error) {
      logger.error(`Erro ao listar movimentacoes: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post('/inventory/supplies/:supplyId/movements', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Apenas admins podem movimentar estoque.' });
    }
    try {
      const supply = await PrinterSupplyItem.findOne({
        _id: req.params.supplyId,
        module_id: req.printerModule._id,
      });
      if (!supply) return res.status(404).json({ success: false, message: 'Insumo nao encontrado' });

      const movementType = String(req.body.movement_type || '').trim();
      const result = calculateMovementResult(
        movementType,
        req.body.quantity,
        supply.quantity_on_hand,
        req.body.quantity_after
      );

      const before = Number(supply.quantity_on_hand || 0);
      supply.quantity_on_hand = result.after;
      await supply.save();

      const movement = await PrinterSupplyMovement.create({
        module_id: req.printerModule._id,
        supply_id: supply._id,
        printer_id: req.body.printer_id || null,
        movement_type: movementType,
        quantity: Math.abs(Number(result.delta)),
        quantity_before: before,
        quantity_after: result.after,
        reason: req.body.reason || '',
        reference: req.body.reference || '',
        notes: req.body.notes || '',
        metadata: req.body.metadata || {},
        created_by: req.user.id || null,
      });

      await notifyLowSupplyIfNeeded(req.printerModule, supply, before, result.after);

      return res.status(201).json({
        success: true,
        movement,
        item: normalizeSupplyItem(supply.toObject()),
      });
    } catch (error) {
      logger.error(`Erro ao registrar movimentacao de insumo: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.get('/inventory/alerts', auth, getApiLimiter, validatePrinterModule, async (req, res) => {
    try {
      const lowSupplies = await PrinterSupplyItem.find({
        module_id: req.printerModule._id,
        is_active: true,
      }).lean();

      const lowItems = lowSupplies
        .map(normalizeSupplyItem)
        .filter((item) => item.is_low_stock);

      const recentAlertEvents = await PrinterInventoryEvent.find({
        module_id: req.printerModule._id,
        event_type: 'alert',
      }).sort({ created_at: -1 }).limit(50).lean();

      return res.json({
        success: true,
        low_stock_count: lowItems.length,
        low_items: lowItems,
        recent_alerts: recentAlertEvents,
      });
    } catch (error) {
      logger.error(`Erro ao listar alertas de inventario: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post('/inventory/stock-adjust', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Apenas admins podem ajustar estoque.' });
    }

    try {
      const itemType = String(req.body.item_type || '').trim();
      const allowedItems = ['toner_black', 'imaging_unit', 'backup_printer'];
      if (!allowedItems.includes(itemType)) {
        return res.status(400).json({ success: false, message: 'item_type invalido' });
      }

      const reason = String(req.body.reason || 'ajuste_manual').trim();
      const notes = String(req.body.notes || '').trim();
      const mode = String(req.body.mode || 'delta').trim().toLowerCase();
      const modelKeyRaw = req.body.model_key;
      const modelLabelRaw = req.body.model_label;
      const modelKey = normalizeModelKey(modelKeyRaw);
      const value = Number(req.body.value);
      if (!Number.isFinite(value)) {
        return res.status(400).json({ success: false, message: 'value deve ser numerico' });
      }

      const stock = normalizeStock(req.printerModule.settings);
      let current = Number(stock[itemType] || 0);
      if (modelKey && ['toner_black', 'imaging_unit'].includes(itemType)) {
        const modelBucket = stock.by_model[modelKey] || { label: String(modelLabelRaw || modelKey), toner_black: 0, imaging_unit: 0 };
        current = Number(modelBucket[itemType] || 0);
        const next = mode === 'set' ? value : current + value;
        const safeNext = Math.max(0, Math.round(next));
        modelBucket[itemType] = safeNext;
        modelBucket.label = String(modelLabelRaw || modelBucket.label || modelKey);
        stock.by_model[modelKey] = modelBucket;
      } else {
        const next = mode === 'set' ? value : current + value;
        const safeNext = Math.max(0, Math.round(next));
        stock[itemType] = safeNext;
      }
      const quantityAfter = modelKey && ['toner_black', 'imaging_unit'].includes(itemType)
        ? Number(stock.by_model[modelKey]?.[itemType] || 0)
        : Number(stock[itemType] || 0);
      await saveStock(req.printerModule, stock);

      await PrinterInventoryEvent.create({
        module_id: req.printerModule._id,
        event_type: 'stock_adjustment',
        item_type: itemType,
        quantity_delta: mode === 'set' ? (quantityAfter - current) : value,
        quantity_after: quantityAfter,
        reason,
        notes,
        metadata: {
          mode,
          model_key: modelKey || null,
          model_label: modelLabelRaw || null,
        },
        created_by: req.user.id || null,
      });

      return res.json({
        success: true,
        stock,
        item_type: itemType,
        quantity_after: quantityAfter,
      });
    } catch (error) {
      logger.error(`Erro ao ajustar estoque: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post('/:printerId/maintenance-event', auth, modifyApiLimiter, validatePrinterModule, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Apenas admins podem registrar manutencao.' });
    }
    try {
      const printer = await ManagedAsset.findOne({
        _id: req.params.printerId,
        module_id: req.printerModule._id,
        asset_type: 'printer',
        is_deleted: { $ne: true },
      });
      if (!printer) return res.status(404).json({ success: false, message: 'Impressora nao encontrada' });

      const eventType = String(req.body.event_type || '').trim();
      const itemType = String(req.body.item_type || 'other').trim();
      const notes = String(req.body.notes || '').trim();
      const reason = String(req.body.reason || '').trim();
      const consumeStock = req.body.consume_stock === true;
      const consumeQty = Number(req.body.consume_quantity || 1);

      const allowedEventTypes = ['toner_replacement', 'imaging_replacement', 'maintenance'];
      if (!allowedEventTypes.includes(eventType)) {
        return res.status(400).json({ success: false, message: 'event_type invalido' });
      }

      let stockAfter = null;
      if (consumeStock && ['toner_black', 'imaging_unit', 'backup_printer'].includes(itemType)) {
        const stock = normalizeStock(req.printerModule.settings);
        const consumeValue = Number.isFinite(consumeQty) ? Math.max(1, Math.round(consumeQty)) : 1;
        const modelLabel = `${printer.manufacturer || ''} ${printer.model || ''}`.trim();
        const modelKey = normalizeModelKey(modelLabel);
        let consumedByModel = false;
        if (modelKey && ['toner_black', 'imaging_unit'].includes(itemType) && stock.by_model?.[modelKey]) {
          const modelCurrent = Number(stock.by_model[modelKey][itemType] || 0);
          const modelNext = Math.max(0, modelCurrent - consumeValue);
          stock.by_model[modelKey][itemType] = modelNext;
          stockAfter = modelNext;
          consumedByModel = true;
        } else {
          const current = Number(stock[itemType] || 0);
          const next = Math.max(0, current - consumeValue);
          stock[itemType] = next;
          stockAfter = next;
        }
        await saveStock(req.printerModule, stock);
        req.body.__inventory_model_key = consumedByModel ? modelKey : null;
        req.body.__inventory_model_label = consumedByModel ? modelLabel : null;
      }

      const maintenanceEntry = {
        type: eventType,
        item_type: itemType,
        reason,
        notes,
        consume_stock: consumeStock,
        consume_quantity: Number.isFinite(consumeQty) ? consumeQty : 1,
        created_by: req.user.username,
        created_at: new Date(),
      };

      const customData = printer.custom_data instanceof Map
        ? Object.fromEntries(printer.custom_data)
        : (printer.custom_data || {});

      printer.custom_data = {
        ...customData,
        last_maintenance_event: maintenanceEntry,
      };
      printer.maintenance_history = [...(printer.maintenance_history || []), maintenanceEntry].slice(-200);
      await printer.save();

      await PrinterInventoryEvent.create({
        module_id: req.printerModule._id,
        printer_id: printer._id,
        event_type: eventType,
        item_type: ['toner_black', 'imaging_unit', 'backup_printer'].includes(itemType) ? itemType : 'other',
        quantity_delta: consumeStock ? -Math.abs(Number.isFinite(consumeQty) ? consumeQty : 1) : 0,
        quantity_after: stockAfter,
        reason,
        notes,
        metadata: {
          printer_name: printer.asset_name,
          printer_serial: printer.serial_number,
          model_key: req.body.__inventory_model_key || null,
          model_label: req.body.__inventory_model_label || null,
        },
        created_by: req.user.id || null,
      });

      return res.json({ success: true, printer: normalizePrinter(printer.toObject ? printer.toObject() : printer) });
    } catch (error) {
      logger.error(`Erro ao registrar evento de manutencao: ${error.message}`);
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
        const mappedLocation = await resolveMappedLocation(data, existing.toObject ? existing.toObject() : existing);
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
        existing.unit = mappedLocation.unit;
        existing.sector = mappedLocation.sector;
        existing.location = mappedLocation.location;
        existing.floor = mappedLocation.floor;
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

      const mappedLocation = await resolveMappedLocation(data);
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
        unit: mappedLocation.unit,
        sector: mappedLocation.sector,
        location: mappedLocation.location,
        floor: mappedLocation.floor,
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
        if (!p || typeof p !== 'object') {
          results.push({
            success: false,
            serial_number: null,
            message: 'Item de impressora invalido na lista',
          });
          // eslint-disable-next-line no-continue
          continue;
        }

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
        const mappedLocation = await resolveMappedLocation(p, existing?.toObject ? existing.toObject() : existing);

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
          existing.unit = mappedLocation.unit;
          existing.sector = mappedLocation.sector;
          existing.location = mappedLocation.location;
          existing.floor = mappedLocation.floor;
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
          unit: mappedLocation.unit,
          sector: mappedLocation.sector,
          location: mappedLocation.location,
          floor: mappedLocation.floor,
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
        'serial_number',
        'manufacturer',
        'model',
        'ip_address',
        'connection_type',
        'usb_path',
        'snmp_community',
        'status',
        'hostname',
        'mac_address',
        'unit',
        'sector',
        'location',
        'floor',
        'custom_data',
      ];
      const update = {};
      allowed.forEach((field) => {
        if (req.body[field] !== undefined) update[field] = req.body[field];
      });
      if (update.connection_type === 'ip') update.connection_type = 'network';
      if (update.serial_number !== undefined) {
        update.serial_number = String(update.serial_number || '').trim();
        if (!update.serial_number) {
          return res.status(400).json({
            success: false,
            message: 'serial_number nao pode ficar vazio',
          });
        }
      }
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

      const existingPrinter = await ManagedAsset.findOne({
        _id: req.params.printerId,
        module_id: req.printerModule._id,
        asset_type: 'printer',
        is_deleted: { $ne: true },
      }).lean();
      if (!existingPrinter) return res.status(404).json({ success: false, message: 'Impressora nao encontrada' });

      if (update.serial_number && update.serial_number !== existingPrinter.serial_number) {
        const serialConflict = await ManagedAsset.findOne({
          _id: { $ne: req.params.printerId },
          module_id: req.printerModule._id,
          asset_type: 'printer',
          serial_number: update.serial_number,
          is_deleted: { $ne: true },
        }).lean();

        if (serialConflict) {
          return res.status(409).json({
            success: false,
            message: 'Ja existe outra impressora com este serial_number',
          });
        }
      }

      const mappedLocation = await resolveMappedLocation(update, existingPrinter);
      if (update.unit === undefined) update.unit = mappedLocation.unit;
      if (update.sector === undefined) update.sector = mappedLocation.sector;
      if (update.floor === undefined) update.floor = mappedLocation.floor;
      if (update.location === undefined) update.location = mappedLocation.location;

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
