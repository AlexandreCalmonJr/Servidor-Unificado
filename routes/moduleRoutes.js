// File: routes/moduleRoutes.js (VERSÃO FINAL UNIFICADA)
const express = require('express');
const { body, validationResult } = require('express-validator');
const AssetModuleConfig = require('../models/AssetModuleConfig');

// Importar os modelos específicos
const Desktop = require('../models/Desktop');
const Notebook = require('../models/Notebook');
const Panel = require('../models/Panel');
const Printer = require('../models/Printer');

module.exports = (logger, getApiLimiter, modifyApiLimiter, auth, deviceAuth) => {
  const router = express.Router();

  // ===== MIDDLEWARE DE AUTENTICAÇÃO FLEXÍVEL (Versão Robusta do Arq 1) =====
  /**
   * Tenta autenticar com JWT (auth). Se falhar, tenta autenticar
   * com Legacy Token (deviceAuth) e "promove" a sessão para admin.
   */
  const flexibleAuth = (req, res, next) => {
    // 1. Tenta autenticação padrão com JWT (usuário do painel)
    auth(req, res, (err) => {
      if (!err) {
        // Sucesso! É um usuário JWT. req.user está populado.
        return next();
      }

      // 2. Auth JWT falhou. Tenta autenticação com Legacy Token (deviceAuth)
      deviceAuth(req, res, (err2) => {
        if (!err2) {
          // Sucesso! É o Legacy Token.
          logger.warn('Autenticação de fallback: Legacy Token usado em rota de módulos', {
            ip: req.ip,
            path: req.originalUrl,
            userAgent: req.get('User-Agent')
          });

          // "Fabrica" um usuário admin para o Legacy Token
          req.user = {
            id: 'legacy_token_agent',
            username: 'agent_system',
            role: 'admin',
            sector: 'Global',
            permissions: ['mobile', 'totem', 'admin']
          };
          return next();
        }

        // 3. Ambas as autenticações falharam.
        if (err && (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')) {
          return res.status(401).json({ success: false, message: `Token inválido: ${err.message}` });
        }
        
        return res.status(401).json({ success: false, message: 'Autenticação falha' });
      });
    });
  };

  // Helper para obter o modelo correto baseado no tipo
  const getModelByType = (type) => {
    const models = {
      'desktop': Desktop,
      'notebook': Notebook,
      'panel': Panel,
      'printer': Printer,
    };
    return models[type] || null;
  };

  /**
   * GET /api/modules
   * Lista todos os módulos de configuração
   */
  router.get('/', flexibleAuth, getApiLimiter, async (req, res) => {
    try {
      const modules = await AssetModuleConfig.find().sort({ created_at: -1 }).lean();

      const modulesWithCount = await Promise.all(
        modules.map(async (module) => {
          const Model = getModelByType(module.type);
          const count = Model ? await Model.countDocuments() : 0;

          return {
            _id: module._id,
            id: module._id,
            name: module.name,
            description: module.description,
            type: module.type,
            is_active: module.is_active,
            is_custom: module.is_custom,
            created_at: module.created_at,
            updated_at: module.updated_at,
            custom_fields: module.custom_fields,
            settings: module.settings,
            table_columns: module.table_columns || [],
            asset_count: count
          };
        })
      );

      logger.info(`Módulos listados por ${req.user.username}: ${modulesWithCount.length} módulos`);

      res.json({
        success: true,
        modules: modulesWithCount
      });
    } catch (error) {
      logger.error(`Erro ao listar módulos: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao carregar módulos',
        error: error.message
      });
    }
  });

  /**
   * GET /api/modules/:moduleId
   * Obtém um módulo específico
   */
  router.get('/:moduleId', flexibleAuth, getApiLimiter, async (req, res) => {
    try {
      const module = await AssetModuleConfig.findById(req.params.moduleId).lean();

      if (!module) {
        return res.status(404).json({
          success: false,
          message: 'Módulo não encontrado'
        });
      }

      const Model = getModelByType(module.type);
      const assetCount = Model ? await Model.countDocuments() : 0;

      logger.info(`Módulo consultado: ${module.name} por ${req.user.username}`);

      res.json({
        success: true,
        module: {
          ...module,
          asset_count: assetCount
        }
      });
    } catch (error) {
      logger.error(`Erro ao buscar módulo: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao carregar módulo',
        error: error.message
      });
    }
  });

  /**
   * POST /api/modules
   * Cria um novo módulo
   */
  router.post('/',
    auth,
    modifyApiLimiter,
    [
      body('name').trim().notEmpty().withMessage('Nome é obrigatório'),
      body('type').trim().notEmpty().withMessage('Tipo é obrigatório')
        .isIn(['mobile', 'totem', 'desktop', 'notebook', 'panel', 'printer', 'scanner', 'custom'])
        .withMessage('Tipo inválido'),
      body('description').optional().trim(),
      body('table_columns').optional().isArray().withMessage('table_columns deve ser um array'),
    ],
    async (req, res) => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado. Apenas administradores podem criar módulos.'
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        });
      }

      try {
        const { name, description, type, custom_fields, settings, table_columns } = req.body;

        const existingModule = await AssetModuleConfig.findOne({
          name: { $regex: new RegExp(`^${name}$`, 'i') }
        });

        if (existingModule) {
          return res.status(400).json({
            success: false,
            message: 'Já existe um módulo com este nome'
          });
        }

        const newModule = new AssetModuleConfig({
          name,
          description: description || '',
          type,
          is_custom: type === 'custom',
          is_active: true,
          custom_fields: custom_fields || {},
          settings: settings || {},
          table_columns: table_columns || [],
          created_by: req.user.id,
          created_at: new Date(),
        });

        await newModule.save();

        logger.info(`Novo módulo criado: ${name} (${type}) por ${req.user.username}`);

        res.status(201).json({
          success: true,
          message: 'Módulo criado com sucesso',
          module: newModule
        });
      } catch (error) {
        logger.error(`Erro ao criar módulo: ${error.message}`);
        res.status(500).json({
          success: false,
          message: 'Erro ao criar módulo',
          error: error.message
        });
      }
    }
  );

  /**
   * PUT /api/modules/:moduleId
   * Atualiza um módulo existente
   */
  router.put('/:moduleId',
    auth,
    modifyApiLimiter,
    async (req, res) => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado. Apenas administradores podem atualizar módulos.'
        });
      }

      try {
        const { name, description, is_active, custom_fields, settings, table_columns } = req.body;

        const module = await AssetModuleConfig.findById(req.params.moduleId);

        if (!module) {
          return res.status(404).json({
            success: false,
            message: 'Módulo não encontrado'
          });
        }

        if (name !== undefined) module.name = name;
        if (description !== undefined) module.description = description;
        if (is_active !== undefined) module.is_active = is_active;
        if (custom_fields !== undefined) module.custom_fields = custom_fields;
        if (settings !== undefined) module.settings = settings;
        if (table_columns !== undefined) module.table_columns = table_columns;

        module.updated_at = new Date();
        module.updated_by = req.user.id;

        await module.save();

        logger.info(`Módulo atualizado: ${module.name} por ${req.user.username}`);

        res.json({
          success: true,
          message: 'Módulo atualizado com sucesso',
          module: module
        });
      } catch (error) {
        logger.error(`Erro ao atualizar módulo: ${error.message}`);
        res.status(500).json({
          success: false,
          message: 'Erro ao atualizar módulo',
          error: error.message
        });
      }
    }
  );

  /**
   * DELETE /api/modules/:moduleId
   * Deleta um módulo
   */
  router.delete('/:moduleId', auth, modifyApiLimiter, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem deletar módulos.'
      });
    }

    try {
      const module = await AssetModuleConfig.findById(req.params.moduleId);

      if (!module) {
        return res.status(404).json({
          success: false,
          message: 'Módulo não encontrado'
        });
      }

      const Model = getModelByType(module.type);

      if (Model) {
        const assetCount = await Model.countDocuments();

        if (assetCount > 0) {
          return res.status(400).json({
            success: false,
            message: `Não é possível excluir. Existem ${assetCount} ativo(s) associado(s) a este módulo.`,
            asset_count: assetCount
          });
        }
      }

      await AssetModuleConfig.findByIdAndDelete(req.params.moduleId);

      logger.info(`Módulo excluído: ${module.name} (${module.type}) por ${req.user.username}`);

      res.json({
        success: true,
        message: 'Módulo excluído com sucesso'
      });
    } catch (error) {
      logger.error(`Erro ao excluir módulo: ${error.message}`, { stack: error.stack });
      res.status(500).json({
        success: false,
        message: 'Erro ao excluir módulo',
        error: error.message
      });
    }
  });

  /**
   * GET /api/modules/:moduleId/assets
   * Lista ativos de um módulo
   */
  router.get('/:moduleId/assets', flexibleAuth, getApiLimiter, async (req, res) => {
    try {
      const module = await AssetModuleConfig.findById(req.params.moduleId);

      if (!module) {
        return res.status(404).json({
          success: false,
          message: 'Módulo não encontrado'
        });
      }

      const Model = getModelByType(module.type);

      if (!Model) {
        return res.status(400).json({
          success: false,
          message: 'Modelo de dados não encontrado para este tipo de módulo'
        });
      }

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

      const assets = await Model.find(filter)
        .sort({ last_seen: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const count = await Model.countDocuments(filter);

      logger.info(`Ativos listados do módulo ${module.name}: ${assets.length} por ${req.user.username}`);

      res.json({
        success: true,
        assets: assets,
        total_pages: Math.ceil(count / limit),
        current_page: parseInt(page),
        total_count: count
      });
    } catch (error) {
      logger.error(`Erro ao listar ativos: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao carregar ativos',
        error: error.message
      });
    }
  });

  /**
   * POST /api/modules/:moduleId/assets
   * Cria um novo ativo (usado pelos agentes)
   * (UNIFICADO COM LÓGICA DE LOCALIZAÇÃO DO ARQ 2)
   */
  // POST /api/modules/:moduleId/assets
// POST /api/modules/:moduleId/assets
router.post('/:moduleId/assets', flexibleAuth, modifyApiLimiter, async (req, res) => {
  try {
    const module = await AssetModuleConfig.findById(req.params.moduleId);

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Módulo não encontrado'
      });
    }

    // AQUI ESTÁ A CORREÇÃO
    const Model = getModelByType(module.type); 

    if (!Model) {
      return res.status(400).json({
        success: false,
        message: 'Modelo de dados não encontrado para este tipo de módulo'
      });
    }

    const assetData = req.body;
      
    // Define o asset_type baseado no tipo do módulo
    assetData.asset_type = module.type;
      
    // Define status como online quando receber dados
    assetData.status = 'online';
    assetData.last_seen = new Date();

    // Verifica se já existe um ativo com esse serial_number
    const existingAsset = await Model.findOne({ 
      serial_number: assetData.serial_number 
    });

    if (existingAsset) {
      // Atualiza o ativo existente
      Object.keys(assetData).forEach(key => {
        if (key !== '_id' && key !== 'created_at') {
          existingAsset[key] = assetData[key];
        }
      });
        
      existingAsset.updated_at = new Date();
      await existingAsset.save();

      logger.info(`Ativo atualizado: ${existingAsset.asset_name} (${existingAsset.serial_number}) por ${req.user.username}`);

      return res.status(200).json({
        success: true,
        message: 'Ativo atualizado com sucesso',
        asset: existingAsset,
        updated: true
      });
    }

    // Cria novo ativo
    const newAsset = new Model(assetData);
    await newAsset.save();

    logger.info(`Novo ativo criado: ${newAsset.asset_name} (${newAsset.serial_number}) por ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: 'Ativo criado com sucesso',
      asset: newAsset,
      updated: false
    });
  } catch (error) {
    logger.error(`Erro ao criar/atualizar ativo: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar/atualizar ativo',
      error: error.message
    });
  }
});

  /**
   * PUT /api/modules/:moduleId/assets/:assetId
   * Atualiza um ativo
   */
  router.put('/:moduleId/assets/:assetId', auth, modifyApiLimiter, async (req, res) => {
    try {
      const module = await AssetModuleConfig.findById(req.params.moduleId);

      if (!module) {
        return res.status(404).json({
          success: false,
          message: 'Módulo não encontrado'
        });
      }

      const Model = getModelByType(module.type);

      if (!Model) {
        return res.status(400).json({
          success: false,
          message: 'Modelo de dados não encontrado para este tipo de módulo'
        });
      }

      const asset = await Model.findById(req.params.assetId);

      if (!asset) {
        return res.status(404).json({
          success: false,
          message: 'Ativo não encontrado'
        });
      }

      const updateData = req.body;
      Object.keys(updateData).forEach(key => {
        if (key !== '_id' && key !== 'created_at') {
          asset[key] = updateData[key];
        }
      });

      asset.updated_at = new Date();
      await asset.save();

      logger.info(`Ativo atualizado: ${asset.asset_name} por ${req.user.username}`);

      res.json({
        success: true,
        message: 'Ativo atualizado com sucesso',
        asset: asset
      });
    } catch (error) {
      logger.error(`Erro ao atualizar ativo: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar ativo',
        error: error.message
      });
    }
  });

  /**
   * DELETE /api/modules/:moduleId/assets/:assetId
   * Deleta um ativo
   */
  router.delete('/:moduleId/assets/:assetId', auth, modifyApiLimiter, async (req, res) => {
    try {
      const module = await AssetModuleConfig.findById(req.params.moduleId);

      if (!module) {
        return res.status(404).json({
          success: false,
          message: 'Módulo não encontrado'
        });
      }

      const Model = getModelByType(module.type);

      if (!Model) {
        return res.status(400).json({
          success: false,
          message: 'Modelo de dados não encontrado para este tipo de módulo'
        });
      }

      const asset = await Model.findByIdAndDelete(req.params.assetId);

      if (!asset) {
        return res.status(44).json({
          success: false,
          message: 'Ativo não encontrado'
        });
      }

      logger.info(`Ativo excluído: ${asset.asset_name} por ${req.user.username}`);

      res.json({
        success: true,
        message: 'Ativo excluído com sucesso'
      });
    } catch (error) {
      logger.error(`Erro ao excluir ativo: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao excluir ativo',
        error: error.message
      });
    }
  });

  // ========== NOVAS ROTAS DE MANUTENÇÃO (DO ARQUIVO 2) ==========
  
  /**
   * PATCH /api/modules/:moduleId/assets/:assetId/maintenance
   * Marca/desmarca ativo para manutenção
   */
  router.patch('/:moduleId/assets/:assetId/maintenance', 
    auth, 
    modifyApiLimiter, 
    async (req, res) => {
      try {
        const { moduleId, assetId } = req.params;
        const { maintenance_mode, maintenance_reason } = req.body;

        const module = await AssetModuleConfig.findById(moduleId);
        if (!module) {
          return res.status(404).json({ 
            success: false, 
            message: 'Módulo não encontrado' 
          });
        }

        const Model = getModelByType(module.type);
        if (!Model) {
          return res.status(400).json({ 
            success: false, 
            message: 'Modelo não encontrado' 
          });
        }

        const asset = await Model.findById(assetId);
        if (!asset) {
          return res.status(404).json({ 
            success: false, 
            message: 'Ativo não encontrado' 
          });
        }

        // Define o status baseado no modo de manutenção
        if (maintenance_mode === true) {
          asset.status = 'maintenance';
          
          // Salva o motivo se fornecido
          if (maintenance_reason) {
            if (!asset.custom_data) {
              asset.custom_data = {};
            }
            asset.custom_data.maintenance_reason = maintenance_reason;
            asset.custom_data.maintenance_started = new Date();
            asset.custom_data.maintenance_by = req.user.username;
          }
          
          logger.info(`Ativo em manutenção: ${asset.asset_name} por ${req.user.username}`);
        } else {
          asset.status = 'online'; 
          
          // Remove dados de manutenção
          if (asset.custom_data) {
            delete asset.custom_data.maintenance_reason;
            delete asset.custom_data.maintenance_started;
            delete asset.custom_data.maintenance_by;
          }
          
          logger.info(`Ativo retornou à produção: ${asset.asset_name} por ${req.user.username}`);
        }

        asset.updated_at = new Date();
        await asset.save();

        res.json({
          success: true,
          message: maintenance_mode 
            ? 'Ativo marcado para manutenção' 
            : 'Ativo retornou à produção',
          asset: asset
        });

      } catch (error) {
        logger.error(`Erro ao alterar status de manutenção: ${error.message}`);
        res.status(500).json({
          success: false,
          message: 'Erro ao processar manutenção',
          error: error.message
        });
      }
    }
  );

  /**
   * PATCH /api/modules/:moduleId/assets/:assetId/status
   * Atualiza apenas o status de um ativo
   */
  router.patch('/:moduleId/assets/:assetId/status', 
    auth, 
    modifyApiLimiter, 
    async (req, res) => {
      try {
        const { moduleId, assetId } = req.params;
        const { status } = req.body;

        // Valida status
        const validStatuses = ['online', 'offline', 'maintenance', 'sem monitorar'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            success: false,
            message: `Status inválido. Valores aceitos: ${validStatuses.join(', ')}`
          });
        }

        const module = await AssetModuleConfig.findById(moduleId);
        if (!module) {
          return res.status(404).json({ success: false, message: 'Módulo não encontrado' });
        }

        const Model = getModelByType(module.type);
        if (!Model) {
          return res.status(400).json({ success: false, message: 'Modelo não encontrado' });
        }

        const asset = await Model.findById(assetId);
        if (!asset) {
          return res.status(404).json({ success: false, message: 'Ativo não encontrado' });
        }

        asset.status = status;
        asset.updated_at = new Date();
        await asset.save();

        logger.info(`Status do ativo alterado: ${asset.asset_name} -> ${status} por ${req.user.username}`);

        res.json({
          success: true,
          message: 'Status atualizado com sucesso',
          asset: asset
        });

      } catch (error) {
        logger.error(`Erro ao atualizar status: ${error.message}`);
        res.status(500).json({
          success: false,
          message: 'Erro ao atualizar status',
          error: error.message
        });
      }
    }
  );

  // ========== ROTAS DE PERMISSÕES ==========

  /**
   * GET /api/modules/:moduleId/permissions
   * Obtém lista de usuários com permissão
   */
  router.get('/:moduleId/permissions', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    try {
      const User = require('../models/User');
      const module = await AssetModuleConfig.findById(req.params.moduleId);

      if (!module) {
        return res.status(404).json({
          success: false,
          message: 'Módulo não encontrado'
        });
      }

      const permissionKey = `module:${module.type}`;
      const users = await User.find({ permissions: permissionKey }).select('_id');
      const userIds = users.map(u => u._id.toString());

      res.json({ success: true, users: userIds });
    } catch (error) {
      logger.error(`Erro ao obter permissões: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter permissões',
        error: error.message
      });
    }
  });

  /**
   * PUT /api/modules/:moduleId/permissions
   * Atualiza permissões de usuários
   */
  router.put('/:moduleId/permissions', auth, modifyApiLimiter, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    try {
      const User = require('../models/User');
      const { userIds } = req.body;

      if (!Array.isArray(userIds)) {
        return res.status(400).json({
          success: false,
          message: 'userIds deve ser um array'
        });
      }

      const module = await AssetModuleConfig.findById(req.params.moduleId);

      if (!module) {
        return res.status(404).json({
          success: false,
          message: 'Módulo não encontrado'
        });
      }

      const permissionKey = `module:${module.type}`;

      // Adiciona permissão para quem está na lista
      await User.updateMany(
        { _id: { $in: userIds } },
        { $addToSet: { permissions: permissionKey } }
      );

      // Remove permissão de quem não está na lista
      await User.updateMany(
        { _id: { $nin: userIds } },
        { $pull: { permissions: permissionKey } }
      );

      logger.info(`Permissões atualizadas para módulo ${module.name} por ${req.user.username}`);

      res.json({
        success: true,
        message: 'Permissões atualizadas com sucesso'
      });
    } catch (error) {
      logger.error(`Erro ao atualizar permissões: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar permissões',
        error: error.message
      });
    }
  });

  return router;
};