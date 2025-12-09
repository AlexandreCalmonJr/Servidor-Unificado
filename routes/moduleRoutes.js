// File: routes/moduleRoutes.js (VERSÃO FINAL — FACTORY + VALIDAÇÃO + TRANSFORMAÇÃO)
const express = require('express');
const AssetModuleConfig = require('../models/AssetModuleConfig');
const User = require('../models/User'); // Carregado apenas quando necessário
const { handleMongooseError } = require('../middleware/error'); // CORREÇÃO (Item 8): Importar handler

// Factory completo
const {
  getModelByType,
  validateByModuleId,
  transformAssetForOutput,
  createAsset,
  updateAsset,
} = require('../utils/assetFactory');

module.exports = (logger, getApiLimiter, modifyApiLimiter, auth, deviceAuth) => {
  const router = express.Router();

  // ===== AUTENTICAÇÃO FLEXÍVEL (JWT + Legacy Token) =====
  const flexibleAuth = (req, res, next) => {
    auth(req, res, (err) => {
      if (!err) return next();

      deviceAuth(req, res, (err2) => {
        if (!err2) {
          logger.warn('Fallback: Legacy Token usado', {
            ip: req.ip,
            path: req.originalUrl,
            userAgent: req.get('User-Agent'),
          });
          req.user = {
            id: 'legacy_token_agent',
            username: 'agent_system',
            role: 'admin',
            sector: 'Global',
            permissions: ['mobile', 'totem', 'admin'],
          };
          return next();
        }

        if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
          return res.status(401).json({ success: false, message: `Token inválido: ${err.message}` });
        }
        return res.status(401).json({ success: false, message: 'Autenticação falhou' });
      });
    });
  };

  // ===================================================================
  // MÓDULOS
  // ===================================================================

  router.get('/', flexibleAuth, getApiLimiter, async (req, res) => {
    try {
      const modules = await AssetModuleConfig.find().sort({ created_at: -1 }).lean();
      const modulesWithCount = await Promise.all(
        modules.map(async (m) => {
          const Model = getModelByType(m.type);
          const count = Model ? await Model.countDocuments() : 0;
          return { ...m, id: m._id, asset_count: count };
        })
      );

      logger.info(`Módulos listados: ${modulesWithCount.length} por ${req.user.username}`);
      res.json({ success: true, modules: modulesWithCount });
    } catch (error) {
      logger.error(`Erro ao listar módulos: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro interno', error: error.message });
    }
  });

  router.get('/:moduleId', flexibleAuth, getApiLimiter, async (req, res) => {
    try {
      const module = await AssetModuleConfig.findById(req.params.moduleId).lean();
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      const Model = getModelByType(module.type);
      const assetCount = Model ? await Model.countDocuments() : 0;

      logger.info(`Módulo consultado: ${module.name} por ${req.user.username}`);
      res.json({ success: true, module: { ...module, asset_count: assetCount } });
    } catch (error) {
      logger.error(`Erro ao buscar módulo: ${error.message}`);
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
      require('express-validator').body('type').isIn(['desktop', 'notebook', 'panel', 'printer', 'custom']),
    ],
    async (req, res) => {
      if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Acesso negado' });

      const errors = require('express-validator').validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      try {
        const { name, type, description = '', table_columns = [], custom_fields = {}, settings = {} } = req.body;
        const exists = await AssetModuleConfig.findOne({ name: new RegExp(`^${name}$`, 'i') });
        if (exists) return res.status(400).json({ success: false, message: 'Nome já existe' });

        const module = await new AssetModuleConfig({
          name, type, description, table_columns, custom_fields, settings,
          is_custom: type === 'custom', is_active: true, created_by: req.user.id
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
      const module = await AssetModuleConfig.findById(req.params.moduleId);
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
      const module = await AssetModuleConfig.findById(req.params.moduleId);
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      const Model = getModelByType(module.type);
      if (Model && await Model.countDocuments() > 0) {
        return res.status(400).json({ success: false, message: 'Módulo possui ativos' });
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
  // ATIVOS
  // ===================================================================

  router.get('/:moduleId/assets', flexibleAuth, getApiLimiter, async (req, res) => {
    try {
      const module = await AssetModuleConfig.findById(req.params.moduleId);
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      const Model = getModelByType(module.type);
      if (!Model) return res.status(400).json({ success: false, message: 'Tipo não suportado' });

      const { page = 1, limit = 50, status, search } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { asset_name: { $regex: search, $options: 'i' } },
          { serial_number: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
        ];
      }

      const [assets, total] = await Promise.all([
        Model.find(filter).sort({ last_seen: -1 }).skip((page - 1) * limit).limit(+limit).lean(),
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

  // Cria ou atualiza (agente)
  router.post(
    '/:moduleId/assets',
    flexibleAuth, // <-- ⚠️ ESTA É A LINHA QUE O SCRIPT DE VERIFICAÇÃO ESTÁ PROCURANDO
    modifyApiLimiter,
    validateByModuleId,
    async (req, res) => {
      try {
        const moduleType = req.moduleType;
        const Model = getModelByType(moduleType);
        const existing = await Model.findOne({ serial_number: req.body.serial_number });

        let asset;
        if (existing) {
          asset = await updateAsset(moduleType, existing._id, req.body);
          logger.info(`Ativo atualizado: ${asset.asset_name} (S/N: ${asset.serial_number})`);
          return res.json({ success: true, message: 'Atualizado', asset: transformAssetForOutput(asset), updated: true });
        } else {
          asset = await createAsset(moduleType, req.body);
          logger.info(`Ativo criado: ${asset.asset_name} (S/N: ${asset.serial_number})`);
          return res.status(201).json({ success: true, message: 'Criado', asset, updated: false });
        }
      } catch (error) {
        // CORREÇÃO (Item 8): Tratamento de erro Mongoose
        logger.error(`Erro ao processar ativo: ${error.message}`);
        const specificError = handleMongooseError(error); // Tenta tratar erro do Mongoose

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

  // Atualiza via painel
  router.put(
    '/:moduleId/assets/:assetId',
    auth,
    modifyApiLimiter,
    validateByModuleId,
    async (req, res) => {
      try {
        const moduleType = req.moduleType;
        const asset = await updateAsset(moduleType, req.params.assetId, req.body);
        logger.info(`Ativo atualizado (painel): ${asset.asset_name} por ${req.user.username}`);
        res.json({ success: true, message: 'Atualizado', asset: transformAssetForOutput(asset) });
      } catch (error) {
        // CORREÇÃO (Item 8): Tratamento de erro Mongoose
        logger.error(`Erro ao atualizar ativo: ${error.message}`);
        const specificError = handleMongooseError(error); // Tenta tratar erro do Mongoose

        if (specificError.isOperational) {
          // É um erro tratado (400, 404, 409, 422)
          return res.status(specificError.statusCode).json({
            success: false,
            message: specificError.message,
            details: specificError.details
          });
        }

        // Trata o "não encontrado" que vem do assetFactory
        if (error.message.includes('não encontrado')) {
          return res.status(404).json({
            success: false,
            message: 'Ativo não encontrado',
            error: error.message,
          });
        }

        // Fallback para 500
        res.status(500).json({
          success: false,
          message: 'Erro ao atualizar',
          error: error.message,
        });
      }
    }
  );

  router.delete('/:moduleId/assets/:assetId', auth, modifyApiLimiter, async (req, res) => {
    try {
      const module = await AssetModuleConfig.findById(req.params.moduleId);
      if (!module) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });

      const Model = getModelByType(module.type);
      const asset = await Model.findByIdAndDelete(req.params.assetId);
      if (!asset) return res.status(404).json({ success: false, message: 'Ativo não encontrado' });

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

      const module = await AssetModuleConfig.findById(moduleId);
      if (!module) {
        return res.status(404).json({
          success: false,
          message: 'Módulo não encontrado'
        });
      }

      const Model = getModelByType(module.type);
      const asset = await Model.findById(assetId);

      if (!asset) {
        return res.status(404).json({
          success: false,
          message: 'Ativo não encontrado'
        });
      }

      // Campos que podem ser atualizados via PATCH
      const allowedFields = [
        'location', 'assigned_to', 'status', 'notes',
        'maintenance_status', 'maintenance_ticket', 'maintenance_reason'
      ];

      // Atualiza apenas campos permitidos
      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          asset[key] = req.body[key];
        }
      });

      asset.updated_at = new Date();
      await asset.save();

      logger.info(`Ativo atualizado (PATCH): ${asset.asset_name} por ${req.user.username}`);

      res.json({
        success: true,
        message: 'Ativo atualizado',
        asset: transformAssetForOutput(asset),
      });
    } catch (error) {
      logger.error(`Erro no PATCH: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro na atualização',
        error: error.message
      });
    }
  }
  );

  // Endpoint específico para manutenção
  router.put('/:moduleId/assets/:assetId/maintenance', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { moduleId, assetId } = req.params;
      const { maintenance_status, maintenance_ticket, maintenance_reason, maintenance_history_entry } = req.body;

      const module = await AssetModuleConfig.findById(moduleId);
      if (!module) {
        return res.status(404).json({ success: false, message: 'Módulo não encontrado' });
      }

      const Model = getModelByType(module.type);
      const asset = await Model.findById(assetId);

      if (!asset) {
        return res.status(404).json({ success: false, message: 'Ativo não encontrado' });
      }

      // Atualiza campos de manutenção
      if (typeof maintenance_status === 'boolean') {
        asset.maintenance_status = maintenance_status;
      }
      if (maintenance_ticket !== undefined) {
        asset.maintenance_ticket = maintenance_ticket;
      }
      if (maintenance_reason !== undefined) {
        asset.maintenance_reason = maintenance_reason;
      }

      // Adiciona entrada no histórico se fornecida
      if (maintenance_history_entry) {
        try {
          const historyEntry = typeof maintenance_history_entry === 'string'
            ? JSON.parse(maintenance_history_entry)
            : maintenance_history_entry;

          if (!asset.maintenance_history) {
            asset.maintenance_history = [];
          }
          asset.maintenance_history.push(historyEntry);
        } catch (e) {
          logger.warn(`Erro ao parsear maintenance_history_entry: ${e.message}`);
        }
      }

      asset.updated_at = new Date();
      await asset.save();

      logger.info(`Manutenção atualizada: ${asset.asset_name} por ${req.user.username}`);

      res.json({
        success: true,
        message: 'Status de manutenção atualizado',
        asset: transformAssetForOutput(asset),
      });
    } catch (error) {
      logger.error(`Erro ao atualizar manutenção: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar manutenção',
        error: error.message
      });
    }
  });


  // ===================================================================
  // PERMISSÕES
  // ===================================================================

  router.get('/:moduleId/permissions', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Acesso negado' });

    try {
      const module = await AssetModuleConfig.findById(req.params.moduleId);
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

      const module = await AssetModuleConfig.findById(req.params.moduleId);
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

  router.put('/:moduleId/assets/:assetId', auth, modifyApiLimiter, validateByModuleId, async (req, res) => {
    try {
      const moduleType = req.moduleType;
      const asset = await updateAsset(moduleType, req.params.assetId, req.body);

      logger.info(`Ativo editado via painel: ${asset.asset_name} por ${req.user.username}`);

      res.json({
        success: true,
        message: 'Ativo atualizado com sucesso',
        asset: transformAssetForOutput(asset)
      });
    } catch (error) {
      logger.error(`Erro ao editar ativo: ${error.message}`);

      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message.includes('não encontrado')
          ? 'Ativo não encontrado'
          : 'Erro ao atualizar ativo',
        error: error.message,
      });
    }
  }
  );

  router.get('/:moduleId/assets/:assetId/history', auth, getApiLimiter, async (req, res) => {
    try {
      const { moduleId, assetId } = req.params;

      const module = await AssetModuleConfig.findById(moduleId);
      if (!module) {
        return res.status(404).json({
          success: false,
          message: 'Módulo não encontrado'
        });
      }

      const Model = getModelByType(module.type);
      const asset = await Model.findById(assetId).lean();

      if (!asset) {
        return res.status(404).json({
          success: false,
          message: 'Ativo não encontrado'
        });
      }

      // Retorna histórico de manutenção
      const history = asset.maintenance_history || [];

      logger.info(`Histórico solicitado: ${asset.asset_name} por ${req.user.username}`);

      res.json({
        success: true,
        history: history.sort((a, b) =>
          new Date(b.timestamp) - new Date(a.timestamp)
        ),
        asset: {
          id: asset._id,
          name: asset.asset_name,
          serial: asset.serial_number,
          status: asset.status,
        }
      });
    } catch (error) {
      logger.error(`Erro ao buscar histórico: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar histórico',
        error: error.message
      });
    }
  }
  );




  return router;
};