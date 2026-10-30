const express = require('express');
const crypto = require('crypto');
const AssetModuleConfig = require('../models/AssetModuleConfig');
const User = require('../models/User');
const WebSocketServer = require('../services/websocketServer');
const { handleMongooseError } = require('../middleware/error');

const {
  getModelByType,
  validateByModuleId,
  transformAssetForOutput,
  createAsset,
  updateAsset,
} = require('../utils/assetFactory');
const { getSupportedTypes } = require('../utils/assetFactory');
const { cursorPaginate, parseCursorParams, formatCursorResponse, ASSET_SUMMARY_PROJECTION } = require('../utils/paginationHelper');
const cacheService = require('../services/cacheService');

const { getModuleStats, getActiveModules } = require('../controllers/assetModuleController');

module.exports = (logger, getApiLimiter, modifyApiLimiter, auth, deviceAuth) => {
  const router = express.Router();

  const mongoose = require('mongoose');

  // ===== HELPER: Busca Módulo por ID ou Tipo =====
  const findModuleParam = (param) => {
    if (mongoose.isValidObjectId(param)) {
      return AssetModuleConfig.findById(param);
    }
    return AssetModuleConfig.findOne({ type: param });
  };

  // ===== HELPER: Invalidação Ativa de Cache (P3) =====
  const invalidateModuleCache = async (moduleId) => {
    try {
      if (moduleId) {
        await cacheService.del(`stats:${moduleId}`);
      }
      await cacheService.del('modules:list');
    } catch (e) {
      logger.warn(`Falha na invalidação de cache: ${e.message}`);
    }
  };

  // ===== AUTENTICAÇÃO FLEXÍVEL =====
  const flexibleAuth = (req, res, next) => {
    auth(req, res, (err) => {
      if (!err) return next();

      deviceAuth(req, res, (err2) => {
        if (!err2) {
          logger.info('Autenticação de dispositivo: Token device usado', {
            ip: req.ip,
            path: req.originalUrl,
            userAgent: req.get('User-Agent'),
          });
          req.user = {
            id: req.deviceId || 'device_unknown',
            username: `device_${req.deviceId || 'unknown'}`,
            role: 'device',
            sector: 'Global',
            permissions: ['read_own_data', 'send_updates'],
          };
          return next();
        }

        if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError' || err?.name === 'NoTokenError') {
          return res.status(401).json({
            success: false,
            message: `Token inválido ou não fornecido: ${err?.message}`
          });
        }
        return res.status(401).json({ success: false, message: 'Autenticação falhou' });
      });
    });
  };

  // ===================================================================
  // MÓDULOS
  // ===================================================================

  router.get('/active', flexibleAuth, getApiLimiter, getActiveModules);

  // GET /api/modules — lista módulos com contagem agregada de ativos (SEM N+1)
  router.get('/', flexibleAuth, getApiLimiter, async (req, res) => {
    try {
      const ManagedAsset = require('../models/ManagedAsset');
      const [modules, counts] = await Promise.all([
        AssetModuleConfig.find().sort({ created_at: -1 }).lean(),
        ManagedAsset.aggregate([
          { $match: { is_deleted: { $ne: true } } },
          { $group: { _id: '$module_id', count: { $sum: 1 } } },
        ]),
      ]);

      const countMap = new Map();
      for (const item of counts) {
        if (item._id) countMap.set(item._id.toString(), item.count);
      }

      const modulesWithCount = modules.map((m) => {
        const count = countMap.get(m._id.toString()) || 0;
        return { ...m, id: m._id, asset_count: count };
      });

      logger.info(`Módulos listados: ${modulesWithCount.length} por ${req.user.username}`);
      res.json({ success: true, modules: modulesWithCount });
    } catch (error) {
      logger.error(`Erro ao listar módulos: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro interno', error: error.message });
    }
  });

  // GET /api/modules/:moduleId
  router.get('/:moduleId', flexibleAuth, getApiLimiter, async (req, res) => {
    try {
      const module = await findModuleParam(req.params.moduleId).lean();
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      const Model = getModelByType(module.type);
      const assetCount = Model ? await Model.countDocuments({
        module_id: module._id,
        is_deleted: { $ne: true }
      }) : 0;

      logger.info(`Módulo consultado: ${module.name} por ${req.user.username}`);
      res.json({ success: true, module: { ...module, asset_count: assetCount }, ...module, asset_count: assetCount });
    } catch (error) {
      logger.error(`Erro ao buscar módulo: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro interno', error: error.message });
    }
  });

  // GET /api/modules/:moduleId/stats — Agregação única via $facet no MongoDB
  router.get('/:moduleId/stats', flexibleAuth, getApiLimiter, async (req, res) => {
    try {
      const module = await findModuleParam(req.params.moduleId);
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      const Model = getModelByType(module.type);
      if (!Model) return res.status(400).json({ success: false, message: 'Tipo não suportado' });

      // 💾 Verificar cache
      const cacheKey = `stats:${module._id}`;
      const cachedStats = await cacheService.get(cacheKey);
      if (cachedStats) {
        logger.info(`📦 Stats retornado do cache para ${module.name}`);
        return res.json({ success: true, ...cachedStats, fromCache: true });
      }

      // ✅ Agregação única no MongoDB em um único roundtrip
      const moduleFilter = {
        module_id: module._id,
        is_deleted: { $ne: true },
      };

      const [aggResult] = await Model.aggregate([
        { $match: moduleFilter },
        {
          $facet: {
            total: [{ $count: 'count' }],
            online: [
              { $match: { status: { $in: ['online', 'active'] } } },
              { $count: 'count' },
            ],
            offline: [
              { $match: { status: { $in: ['offline', 'inactive', 'failed', 'unknown'] } } },
              { $count: 'count' },
            ],
            maintenance: [
              { $match: { status: 'maintenance' } },
              { $count: 'count' },
            ],
            healthy: [
              { $match: { health_status: 'healthy' } },
              { $count: 'count' },
            ],
            degraded: [
              { $match: { health_status: 'degraded' } },
              { $count: 'count' },
            ],
            error: [
              { $match: { health_status: 'error' } },
              { $count: 'count' },
            ],
          },
        },
      ]);

      const total = aggResult?.total?.[0]?.count || 0;
      const online = aggResult?.online?.[0]?.count || 0;
      const offline = aggResult?.offline?.[0]?.count || 0;
      const maintenance = aggResult?.maintenance?.[0]?.count || 0;
      const healthy = aggResult?.healthy?.[0]?.count || 0;
      const degraded = aggResult?.degraded?.[0]?.count || 0;
      const errorCount = aggResult?.error?.[0]?.count || 0;

      const stats = {
        total,
        online,
        offline,
        maintenance,
        healthy,
        degraded,
        error: errorCount,
      };

      // 💾 Cachear por 60 segundos
      await cacheService.set(cacheKey, stats, 60);

      logger.info(`📊 Stats calculados via agregação única para ${module.name}`);
      res.json({ success: true, ...stats, fromCache: false });
    } catch (error) {
      logger.error(`Erro ao buscar stats: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro interno', error: error.message });
    }
  });

  // ===================================================================
  // CRIAÇÃO / ATUALIZAÇÃO DE MÓDULO (ADMIN)
  // ===================================================================

  router.post(
    '/',
    auth,
    modifyApiLimiter,
    [
      require('express-validator').body('name').trim().notEmpty(),
      require('express-validator').body('type').isIn(getSupportedTypes()),
    ],
    async (req, res) => {
      if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Acesso negado' });

      const errors = require('express-validator').validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      try {
        const {
          name, type, description = '',
          table_columns = [], custom_fields = {}, settings = {},
          client_config = {}, feature_flags = {}
        } = req.body;

        const exists = await AssetModuleConfig.findOne({ name: new RegExp(`^${name}$`, 'i') });
        if (exists) return res.status(400).json({ success: false, message: 'Nome já existe' });

        const module = await new AssetModuleConfig({
          name, type, description, table_columns, custom_fields, settings,
          client_config, feature_flags,
          is_custom: type === 'custom',
          is_active: req.body.is_active !== undefined ? req.body.is_active : true,
          created_by: req.user.id
        }).save();

        logger.info(`Módulo criado: ${name} por ${req.user.username}`);
        res.status(201).json({ success: true, module });
      } catch (error) {
        logger.error(`Erro ao criar módulo: ${error.message}`);
        res.status(500).json({ success: false, message: 'Erro ao criar', error: error.message });
      }
    }
  );

  router.put('/:moduleId', auth, modifyApiLimiter, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Acesso negado' });

    try {
      const module = await findModuleParam(req.params.moduleId);
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      Object.assign(module, req.body, { updated_by: req.user.id, updated_at: new Date() });
      await module.save();

      logger.info(`Módulo atualizado: ${module.name} por ${req.user.username}`);
      res.json({ success: true, module });
    } catch (error) {
      logger.error(`Erro ao atualizar módulo: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao atualizar', error: error.message });
    }
  });

  router.delete('/:moduleId', auth, modifyApiLimiter, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Acesso negado' });

    try {
      const module = await findModuleParam(req.params.moduleId);
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      const Model = getModelByType(module.type);
      // ✅ CORREÇÃO: verifica apenas ativos deste módulo específico que não estejam deletados
      if (Model && await Model.countDocuments({ module_id: module._id, is_deleted: { $ne: true } }) > 0) {
        return res.status(400).json({ success: false, message: 'Módulo possui ativos. Exclua os ativos primeiro.' });
      }

      await AssetModuleConfig.findByIdAndDelete(req.params.moduleId);
      logger.info(`Módulo excluído: ${module.name} por ${req.user.username}`);
      res.json({ success: true, message: 'Módulo excluído' });
    } catch (error) {
      logger.error(`Erro ao excluir módulo: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao excluir', error: error.message });
    }
  });

  // ===================================================================
  // ATIVOS — isolados por module_id
  // ===================================================================

  // GET /api/modules/:moduleId/assets — com paginação tradicional
  router.get('/:moduleId/assets', flexibleAuth, getApiLimiter, async (req, res) => {
    try {
      const module = await findModuleParam(req.params.moduleId);
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      const Model = getModelByType(module.type);
      if (!Model) return res.status(400).json({ success: false, message: 'Tipo não suportado' });

      const { page = 1, limit = 50, status, search, includeDeleted = false } = req.query;

      // ✅ CORREÇÃO: filtro base sempre inclui module_id
      const filter = { module_id: module._id };

      // 🗑️ Soft delete: não incluir deletados por padrão
      if (includeDeleted !== 'true') {
        filter.is_deleted = { $ne: true };
      }

      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { asset_name: { $regex: search, $options: 'i' } },
          { serial_number: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
        ];
      }

      const query = Model.find(filter);
      if (req.query.full !== 'true' && req.query.full !== true) {
        query.select(ASSET_SUMMARY_PROJECTION);
      }

      const [assets, total] = await Promise.all([
        query.sort({ last_seen: -1 }).skip((page - 1) * limit).limit(+limit).lean(),
        Model.countDocuments(filter),
      ]);

      const transformed = assets.map(transformAssetForOutput);

      logger.info(`Ativos listados: ${assets.length}/${total} do módulo ${module.name}`);
      res.json({
        success: true,
        assets: transformed,
        total_pages: Math.ceil(total / limit),
        current_page: +page,
        total_count: total,
      });
    } catch (error) {
      logger.error(`Erro ao listar ativos: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao carregar ativos', error: error.message });
    }
  });

  // GET /api/modules/:moduleId/assets/cursor — com cursor pagination (novo)
  router.get('/:moduleId/assets/cursor', flexibleAuth, getApiLimiter, parseCursorParams, async (req, res) => {
    try {
      const module = await findModuleParam(req.params.moduleId);
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      const Model = getModelByType(module.type);
      if (!Model) return res.status(400).json({ success: false, message: 'Tipo não suportado' });

      const { status, search } = req.query;

      // ✅ Filtro base com module_id previnindo soft delete
      let query = Model.find({
        module_id: module._id,
        is_deleted: { $ne: true }
      });

      if (req.query.full !== 'true' && req.query.full !== true) {
        query.select(ASSET_SUMMARY_PROJECTION);
      }

      if (status) query = query.where('status').equals(status);
      if (search) {
        query = query.or([
          { asset_name: { $regex: search, $options: 'i' } },
          { serial_number: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
        ]);
      }

      const { cursor, limit, sortBy, sortOrder } = req.cursorParams;
      const result = await cursorPaginate(query, cursor, limit, sortBy, sortOrder);

      const transformed = result.items.map(transformAssetForOutput);

      logger.info(`Ativos com cursor: ${result.items.length} do módulo ${module.name}`);
      res.json(formatCursorResponse({ ...result, items: transformed }));
    } catch (error) {
      logger.error(`Erro ao listar ativos com cursor: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao carregar ativos', error: error.message });
    }
  });

  // POST /api/modules/:moduleId/assets — cria ou atualiza ativo
  router.post(
    '/:moduleId/assets',
    flexibleAuth,
    modifyApiLimiter,
    validateByModuleId,
    async (req, res) => {
      try {
        logger.info(`📥 POST /api/modules/assets recebido:`, {
          moduleId: req.params.moduleId,
          moduleType: req.moduleType,
          serialNumber: req.body.serial_number,
          assetType: req.body.asset_type,
          assetName: req.body.asset_name,
        });

        // ✅ CORREÇÃO: sempre injeta module_id no payload
        if (req.module && req.module._id) {
          req.body.module_id = req.module._id;
          if (!req.body.asset_type) {
            req.body.asset_type = req.module.type;
          }
        } else if (req.moduleType) {
          if (!req.body.asset_type) {
            req.body.asset_type = req.moduleType;
          }
        }

        const moduleType = req.moduleType;
        const Model = getModelByType(moduleType);
        const moduleId = req.module?._id || req.body.module_id;
        const agentIngest = req.user?.role === 'device';

        // ✅ CORREÇÃO: busca ativo existente DENTRO deste módulo
        // Evita colisão de serial_number entre módulos diferentes
        const existing = await Model.findOne({
          serial_number: req.body.serial_number,
          module_id: moduleId,
        });

        let asset;
        if (existing) {
          asset = await updateAsset(moduleType, existing._id, req.body, { agentIngest });
          await invalidateModuleCache(moduleId);
          logger.info(`✏️ Ativo ATUALIZADO: ${asset.asset_name} (S/N: ${asset.serial_number}) no módulo ${moduleId}`);
          return res.json({
            success: true,
            message: 'Atualizado',
            asset: transformAssetForOutput(asset),
            updated: true
          });
        } else {
          asset = await createAsset(moduleType, req.body, { agentIngest });
          await invalidateModuleCache(moduleId);
          logger.info(`✨ Ativo CRIADO: ${asset.asset_name} (S/N: ${asset.serial_number}) no módulo ${moduleId}`);
          return res.status(201).json({
            success: true,
            message: 'Criado',
            asset: transformAssetForOutput(asset),
            updated: false
          });
        }
      } catch (error) {
        logger.error(`Erro ao processar ativo: ${error.message}`);
        const specificError = handleMongooseError(error);

        if (specificError.isOperational) {
          return res.status(specificError.statusCode).json({
            success: false,
            message: specificError.message,
            details: specificError.details
          });
        }

        res.status(500).json({
          success: false,
          message: 'Erro ao processar ativo',
          error: error.message
        });
      }
    }
  );

  // PUT /api/modules/:moduleId/assets/:assetId
  // Validação leniente: campos são opcionais numa atualização parcial
  const validatePartialUpdate = async (req, res, next) => {
    try {
      const module = await findModuleParam(req.params.moduleId);
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });
      req.moduleType = module.type;
      req.module = module;
      next();
    } catch (e) {
      res.status(500).json({ success: false, message: 'Erro na validação', error: e.message });
    }
  };

  router.put(
    '/:moduleId/assets/:assetId',
    auth,
    modifyApiLimiter,
    validatePartialUpdate,
    async (req, res) => {
      try {
        const moduleType = req.moduleType;
        const asset = await updateAsset(moduleType, req.params.assetId, req.body, { resolveLocation: false });
        await invalidateModuleCache(req.params.moduleId);
        logger.info(`Ativo atualizado (painel): ${asset.asset_name} por ${req.user.username}`);
        res.json({ success: true, message: 'Atualizado', asset: transformAssetForOutput(asset) });
      } catch (error) {
        logger.error(`Erro ao atualizar ativo: ${error.message}`);
        const specificError = handleMongooseError(error);

        if (specificError.isOperational) {
          return res.status(specificError.statusCode).json({
            success: false,
            message: specificError.message,
            details: specificError.details
          });
        }

        if (error.message.includes('não encontrado')) {
          return res.status(404).json({
            success: false,
            message: 'Ativo não encontrado',
            error: error.message,
          });
        }

        res.status(500).json({
          success: false,
          message: 'Erro ao atualizar',
          error: error.message,
        });
      }
    }
  );

  // DELETE /api/modules/:moduleId/assets/:assetId
  router.delete('/:moduleId/assets/:assetId', auth, modifyApiLimiter, async (req, res) => {
    try {
      const module = await findModuleParam(req.params.moduleId);
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      const Model = getModelByType(module.type);
      // ✅ CORREÇÃO: garante que o ativo pertence a este módulo
      const asset = await Model.findOneAndDelete({
        _id: req.params.assetId,
        module_id: module._id,
      });
      if (!asset) return res.status(404).json({ success: false, message: 'Ativo não encontrado neste módulo' });

      await invalidateModuleCache(module._id);
      logger.info(`Ativo excluído: ${asset.asset_name} por ${req.user.username}`);
      res.json({ success: true, message: 'Excluído' });
    } catch (error) {
      logger.error(`Erro ao excluir ativo: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao excluir', error: error.message });
    }
  });

  // ===================================================================
  // MANUTENÇÃO
  // ===================================================================

  router.patch('/:moduleId/assets/:assetId', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { moduleId, assetId } = req.params;

      const module = await findModuleParam(moduleId);
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      const Model = getModelByType(module.type);
      // ✅ CORREÇÃO: garante pertencimento ao módulo
      const asset = await Model.findOne({ _id: assetId, module_id: module._id });
      if (!asset) return res.status(404).json({ success: false, message: 'Ativo não encontrado neste módulo' });

      const allowedFields = [
        'location', 'assigned_to', 'status', 'notes',
        'maintenance_status', 'maintenance_ticket', 'maintenance_reason'
      ];

      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) asset[key] = req.body[key];
      });

      asset.updated_at = new Date();
      await asset.save();

      logger.info(`Ativo atualizado (PATCH): ${asset.asset_name} por ${req.user.username}`);
      res.json({ success: true, message: 'Ativo atualizado', asset: transformAssetForOutput(asset) });
    } catch (error) {
      logger.error(`Erro no PATCH: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro na atualização', error: error.message });
    }
  });

  router.put('/:moduleId/assets/:assetId/maintenance', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { moduleId, assetId } = req.params;
      const { maintenance_status, maintenance_ticket, maintenance_reason, maintenance_history_entry } = req.body;

      const module = await findModuleParam(moduleId);
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      const Model = getModelByType(module.type);
      // ✅ CORREÇÃO: garante pertencimento ao módulo
      const asset = await Model.findOne({ _id: assetId, module_id: module._id });
      if (!asset) return res.status(404).json({ success: false, message: 'Ativo não encontrado neste módulo' });

      if (typeof maintenance_status === 'boolean') asset.maintenance_status = maintenance_status;
      if (maintenance_ticket !== undefined) asset.maintenance_ticket = maintenance_ticket;
      if (maintenance_reason !== undefined) asset.maintenance_reason = maintenance_reason;

      if (maintenance_history_entry) {
        try {
          const historyEntry = typeof maintenance_history_entry === 'string'
            ? JSON.parse(maintenance_history_entry)
            : maintenance_history_entry;
          if (!asset.maintenance_history) asset.maintenance_history = [];
          asset.maintenance_history.push(historyEntry);
        } catch (e) {
          logger.warn(`Erro ao parsear maintenance_history_entry: ${e.message}`);
        }
      }

      asset.updated_at = new Date();
      await asset.save();

      logger.info(`Manutenção atualizada: ${asset.asset_name} por ${req.user.username}`);
      res.json({ success: true, message: 'Status de manutenção atualizado', asset: transformAssetForOutput(asset) });
    } catch (error) {
      logger.error(`Erro ao atualizar manutenção: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao atualizar manutenção', error: error.message });
    }
  });

  // ===================================================================
  // GESTÃO DE CREDENCIAIS & QUARENTENA (P1 - ADMIN)
  // ===================================================================

  // PUT /api/modules/:moduleId/assets/:assetId/quarantine
  router.put('/:moduleId/assets/:assetId/quarantine', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { moduleId, assetId } = req.params;
      const { quarantine, reason } = req.body;

      const module = await findModuleParam(moduleId);
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      const Model = getModelByType(module.type);
      const asset = await Model.findOne({ _id: assetId, module_id: module._id });
      if (!asset) return res.status(404).json({ success: false, message: 'Ativo não encontrado neste módulo' });

      const isQuarantine = Boolean(quarantine);
      asset.token_status = isQuarantine ? 'quarantine' : 'active';
      asset.status = isQuarantine ? 'quarantine' : 'online';
      asset.quarantine_reason = isQuarantine ? (reason || 'Quarentena administrativa') : null;
      asset.quarantine_at = isQuarantine ? new Date() : null;
      asset.updated_at = new Date();
      await asset.save();

      logger.warn(`Ativo ${isQuarantine ? 'colocado em QUARENTENA' : 'REMOVIDO da quarentena'}: ${asset.asset_name} (${asset.serial_number}) por ${req.user.username}`);

      // Notifica o painel
      WebSocketServer.broadcastToPanel({
        type: 'notification',
        category: 'security',
        event: 'device_quarantine_changed',
        title: isQuarantine ? '🛡️ Dispositivo em Quarentena' : '✅ Dispositivo Liberado da Quarentena',
        message: `${asset.asset_name} (${asset.serial_number}) - ${asset.quarantine_reason || 'Operação normal'}`,
        data: { assetId: asset._id, isQuarantine, reason: asset.quarantine_reason },
        timestamp: new Date(),
      });

      await invalidateModuleCache(module._id);

      res.json({
        success: true,
        message: isQuarantine ? 'Dispositivo colocado em quarentena' : 'Dispositivo removido da quarentena',
        asset: transformAssetForOutput(asset),
      });
    } catch (error) {
      logger.error(`Erro ao atualizar quarentena: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao atualizar quarentena', error: error.message });
    }
  });

  // POST /api/modules/:moduleId/assets/:assetId/revoke-token
  router.post('/:moduleId/assets/:assetId/revoke-token', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { moduleId, assetId } = req.params;

      const module = await findModuleParam(moduleId);
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      const Model = getModelByType(module.type);
      const asset = await Model.findOne({ _id: assetId, module_id: module._id });
      if (!asset) return res.status(404).json({ success: false, message: 'Ativo não encontrado neste módulo' });

      asset.token_status = 'revoked';
      asset.status = 'revoked';
      asset.token_revoked_at = new Date();
      asset.updated_at = new Date();
      await asset.save();

      // Desconecta qualquer sessão WebSocket ativa do dispositivo imediatamente
      WebSocketServer.disconnectAsset(assetId, 4001, 'Credencial revogada pelo administrador');

      await invalidateModuleCache(module._id);
      logger.warn(`Credencial do ativo REVOGADA: ${asset.asset_name} (${asset.serial_number}) por ${req.user.username}`);

      res.json({
        success: true,
        message: 'Token de dispositivo revogado com sucesso',
        asset: transformAssetForOutput(asset),
      });
    } catch (error) {
      logger.error(`Erro ao revogar token de dispositivo: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao revogar token', error: error.message });
    }
  });

  // POST /api/modules/:moduleId/assets/:assetId/rotate-token
  router.post('/:moduleId/assets/:assetId/rotate-token', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { moduleId, assetId } = req.params;

      const module = await findModuleParam(moduleId);
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      const Model = getModelByType(module.type);
      const asset = await Model.findOne({ _id: assetId, module_id: module._id });
      if (!asset) return res.status(404).json({ success: false, message: 'Ativo não encontrado neste módulo' });

      const rawDeviceToken = `dev_${crypto.randomBytes(32).toString('hex')}`;
      const deviceTokenHash = crypto.createHash('sha256').update(rawDeviceToken).digest('hex');
      const deviceTokenPrefix = rawDeviceToken.substring(0, 12);

      asset.device_token_hash = deviceTokenHash;
      asset.device_token_prefix = deviceTokenPrefix;
      asset.token_status = 'active';
      asset.status = 'online';
      asset.token_created_at = new Date();
      asset.token_revoked_at = null;
      asset.quarantine_reason = null;
      asset.quarantine_at = null;
      asset.updated_at = new Date();
      await asset.save();

      // Desconecta conexões antigas
      WebSocketServer.disconnectAsset(assetId, 4002, 'Credencial rotacionada');

      await invalidateModuleCache(module._id);
      logger.info(`Credencial do ativo ROTACIONADA: ${asset.asset_name} (${asset.serial_number}) por ${req.user.username}`);

      res.json({
        success: true,
        message: 'Token gerado com sucesso',
        device_token: rawDeviceToken,
        asset: transformAssetForOutput(asset),
      });
    } catch (error) {
      logger.error(`Erro ao rotacionar token de dispositivo: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao rotacionar token', error: error.message });
    }
  });

  // ===================================================================
  // HISTÓRICO
  // ===================================================================

  router.get('/:moduleId/assets/:assetId/history', auth, getApiLimiter, async (req, res) => {
    try {
      const { moduleId, assetId } = req.params;

      const module = await findModuleParam(moduleId);
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      const Model = getModelByType(module.type);
      // ✅ CORREÇÃO: garante pertencimento ao módulo
      const asset = await Model.findOne({ _id: assetId, module_id: module._id }).lean();
      if (!asset) return res.status(404).json({ success: false, message: 'Ativo não encontrado neste módulo' });

      const locHistory = asset.location_history || [];
      const maintHistory = asset.maintenance_history || [];

      const history = [...locHistory, ...maintHistory]
        .filter(h => h.timestamp)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      logger.info(`Histórico solicitado: ${asset.asset_name} por ${req.user.username}`);
      res.json({
        success: true,
        history,
        asset: { id: asset._id, name: asset.asset_name, serial: asset.serial_number, status: asset.status }
      });
    } catch (error) {
      logger.error(`Erro ao buscar histórico: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao buscar histórico', error: error.message });
    }
  });

  // ===================================================================
  // PERMISSÕES
  // ===================================================================

  router.get('/:moduleId/permissions', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Acesso negado' });

    try {
      const module = await findModuleParam(req.params.moduleId);
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      const key = `module:${module.type}`;
      const users = await User.find({ permissions: key }).select('_id');
      res.json({ success: true, users: users.map(u => u._id.toString()) });
    } catch (error) {
      logger.error(`Erro ao obter permissões: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro', error: error.message });
    }
  });

  router.put('/:moduleId/permissions', auth, modifyApiLimiter, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Acesso negado' });

    try {
      const { userIds } = req.body;
      if (!Array.isArray(userIds)) return res.status(400).json({ success: false, message: 'userIds deve ser array' });

      const module = await findModuleParam(req.params.moduleId);
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      const key = `module:${module.type}`;
      await User.updateMany({ _id: { $in: userIds } }, { $addToSet: { permissions: key } });
      await User.updateMany({ _id: { $nin: userIds } }, { $pull: { permissions: key } });

      logger.info(`Permissões atualizadas: ${module.name} por ${req.user.username}`);
      res.json({ success: true, message: 'Permissões atualizadas' });
    } catch (error) {
      logger.error(`Erro ao atualizar permissões: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro', error: error.message });
    }
  });

  return router;
};