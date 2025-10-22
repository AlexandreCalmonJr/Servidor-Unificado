// File: routes/moduleRoutes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const AssetModule = require('../models/AssetModule');
const ManagedAsset = require('../models/ManagedAsset');

module.exports = (logger, getApiLimiter, modifyApiLimiter, auth) => {
  const router = express.Router();

  // Helper para log seguro
  const safeLog = (req, level, message) => {
    if (req.logger && typeof req.logger[level] === 'function') {
      req.logger[level](message);
    } else if (logger && typeof logger[level] === 'function') {
      logger[level](message);
    } else {
      console.log(`[${level.toUpperCase()}]: ${message}`);
    }
  };

  // ==================== ROTAS DE MÓDULOS ====================

  /**
   * GET /api/modules
   * Lista todos os módulos
   */
  router.get('/', auth, getApiLimiter, async (req, res) => {
    try {
      const modules = await AssetModule.find()
        .sort({ created_at: -1 })
        .lean();
      
      safeLog(req, 'info', `Módulos listados: ${modules.length} - Usuário: ${req.user.username}`);
      
      res.json({
        success: true,
        modules: modules,
        count: modules.length
      });
    } catch (error) {
      safeLog(req, 'error', `Erro ao listar módulos: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao carregar módulos',
        error: error.message
      });
    }
  });

  /**
   * GET /api/modules/:id
   * Obtém detalhes de um módulo específico
   */
  router.get('/:id', auth, getApiLimiter, async (req, res) => {
    try {
      const module = await AssetModule.findById(req.params.id).lean();
      
      if (!module) {
        return res.status(404).json({
          success: false,
          message: 'Módulo não encontrado'
        });
      }
      
      // Conta quantos ativos existem neste módulo
      const assetCount = await ManagedAsset.countDocuments({ 
        module_id: req.params.id 
      });
      
      safeLog(req, 'info', `Módulo consultado: ${module.name} - Usuário: ${req.user.username}`);
      
      res.json({
        success: true,
        module: {
          ...module,
          asset_count: assetCount
        }
      });
    } catch (error) {
      safeLog(req, 'error', `Erro ao buscar módulo: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao carregar módulo',
        error: error.message
      });
    }
  });

  /**
   * POST /api/modules
   * Cria um novo módulo (apenas admin)
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
    ],
    async (req, res) => {
      // Verifica se é admin
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
        const { name, description, type, custom_fields, settings } = req.body;
        
        // Verifica se já existe um módulo com este nome
        const existingModule = await AssetModule.findOne({ 
          name: { $regex: new RegExp(`^${name}$`, 'i') } 
        });
        
        if (existingModule) {
          return res.status(400).json({
            success: false,
            message: 'Já existe um módulo com este nome'
          });
        }
        
        // Cria o novo módulo
        const newModule = new AssetModule({
          name,
          description: description || '',
          type,
          is_custom: type === 'custom',
          is_active: true,
          custom_fields: custom_fields || {},
          settings: settings || {},
          created_by: req.user.id,
          created_at: new Date(),
        });
        
        await newModule.save();
        
        safeLog(req, 'info', `Novo módulo criado: ${name} (${type}) - Admin: ${req.user.username}`);
        
        res.status(201).json({
          success: true,
          message: 'Módulo criado com sucesso',
          module: newModule
        });
      } catch (error) {
        safeLog(req, 'error', `Erro ao criar módulo: ${error.message}`);
        res.status(500).json({
          success: false,
          message: 'Erro ao criar módulo',
          error: error.message
        });
      }
    }
  );

  /**
   * PUT /api/modules/:id
   * Atualiza um módulo existente (apenas admin)
   */
  router.put('/:id', 
    auth, 
    modifyApiLimiter,
    async (req, res) => {
      // Verifica se é admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado. Apenas administradores podem atualizar módulos.'
        });
      }

      try {
        const { name, description, is_active, custom_fields, settings } = req.body;
        
        const module = await AssetModule.findById(req.params.id);
        
        if (!module) {
          return res.status(404).json({
            success: false,
            message: 'Módulo não encontrado'
          });
        }
        
        // Atualiza os campos permitidos
        if (name !== undefined) module.name = name;
        if (description !== undefined) module.description = description;
        if (is_active !== undefined) module.is_active = is_active;
        if (custom_fields !== undefined) module.custom_fields = custom_fields;
        if (settings !== undefined) module.settings = settings;
        
        module.updated_at = new Date();
        module.updated_by = req.user.id;
        
        await module.save();
        
        safeLog(req, 'info', `Módulo atualizado: ${module.name} - Admin: ${req.user.username}`);
        
        res.json({
          success: true,
          message: 'Módulo atualizado com sucesso',
          module: module
        });
      } catch (error) {
        safeLog(req, 'error', `Erro ao atualizar módulo: ${error.message}`);
        res.status(500).json({
          success: false,
          message: 'Erro ao atualizar módulo',
          error: error.message
        });
      }
    }
  );

  /**
   * DELETE /api/modules/:id
   * Deleta um módulo (apenas admin)
   */
  router.delete('/:id', auth, modifyApiLimiter, async (req, res) => {
    // Verifica se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem deletar módulos.'
      });
    }

    try {
      const module = await AssetModule.findById(req.params.id);
      
      if (!module) {
        return res.status(404).json({
          success: false,
          message: 'Módulo não encontrado'
        });
      }
      
      // Verifica se existem ativos associados
      const assetCount = await ManagedAsset.countDocuments({ 
        module_id: req.params.id 
      });
      
      if (assetCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Não é possível excluir. Existem ${assetCount} ativo(s) associado(s) a este módulo.`
        });
      }
      
      await AssetModule.findByIdAndDelete(req.params.id);
      
      safeLog(req, 'info', `Módulo excluído: ${module.name} - Admin: ${req.user.username}`);
      
      res.json({
        success: true,
        message: 'Módulo excluído com sucesso'
      });
    } catch (error) {
      safeLog(req, 'error', `Erro ao excluir módulo: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao excluir módulo',
        error: error.message
      });
    }
  });

  // ==================== ROTAS DE ATIVOS DOS MÓDULOS ====================

  /**
   * GET /api/modules/:moduleId/assets
   * Lista todos os ativos de um módulo
   */
  router.get('/:moduleId/assets', auth, getApiLimiter, async (req, res) => {
    try {
      const { moduleId } = req.params;
      const { page = 1, limit = 50, status, search } = req.query;
      
      // Verifica se o módulo existe
      const module = await AssetModule.findById(moduleId);
      if (!module) {
        return res.status(404).json({
          success: false,
          message: 'Módulo não encontrado'
        });
      }
      
      // Constrói o filtro de busca
      const filter = { module_id: moduleId };
      
      if (status) {
        filter.status = status;
      }
      
      if (search) {
        filter.$or = [
          { asset_name: { $regex: search, $options: 'i' } },
          { serial_number: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
        ];
      }
      
      // Busca os ativos com paginação
      const assets = await ManagedAsset.find(filter)
        .sort({ last_seen: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();
      
      const count = await ManagedAsset.countDocuments(filter);
      
      safeLog(req, 'info', `Ativos listados do módulo ${module.name}: ${assets.length} - Usuário: ${req.user.username}`);
      
      res.json({
        success: true,
        assets: assets,
        total_pages: Math.ceil(count / limit),
        current_page: parseInt(page),
        total_count: count
      });
    } catch (error) {
      safeLog(req, 'error', `Erro ao listar ativos: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao carregar ativos',
        error: error.message
      });
    }
  });

  /**
   * POST /api/modules/:moduleId/assets
   * Adiciona um novo ativo ao módulo
   */
  router.post('/:moduleId/assets', 
    auth, 
    modifyApiLimiter,
    [
      body('asset_name').trim().notEmpty().withMessage('Nome do ativo é obrigatório'),
      body('serial_number').trim().notEmpty().withMessage('Número de série é obrigatório'),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        });
      }

      try {
        const { moduleId } = req.params;
        const assetData = req.body;
        
        // Verifica se o módulo existe
        const module = await AssetModule.findById(moduleId);
        if (!module) {
          return res.status(404).json({
            success: false,
            message: 'Módulo não encontrado'
          });
        }
        
        if (!module.is_active) {
          return res.status(400).json({
            success: false,
            message: 'Não é possível adicionar ativos a um módulo inativo'
          });
        }
        
        // Verifica se já existe um ativo com este serial number
        const existingAsset = await ManagedAsset.findOne({
          serial_number: assetData.serial_number,
          module_id: moduleId
        });
        
        if (existingAsset) {
          return res.status(400).json({
            success: false,
            message: 'Já existe um ativo com este número de série neste módulo'
          });
        }
        
        // Cria o novo ativo
        const newAsset = new ManagedAsset({
          ...assetData,
          module_id: moduleId,
          asset_type: module.type,
          status: assetData.status || 'offline',
          last_seen: new Date(),
          created_by: req.user.id,
          created_at: new Date(),
        });
        
        await newAsset.save();
        
        safeLog(req, 'info', `Novo ativo adicionado: ${newAsset.asset_name} - Módulo: ${module.name} - Usuário: ${req.user.username}`);
        
        res.status(201).json({
          success: true,
          message: 'Ativo adicionado com sucesso',
          asset: newAsset
        });
      } catch (error) {
        safeLog(req, 'error', `Erro ao adicionar ativo: ${error.message}`);
        res.status(500).json({
          success: false,
          message: 'Erro ao adicionar ativo',
          error: error.message
        });
      }
    }
  );

  /**
   * PUT /api/modules/:moduleId/assets/:assetId
   * Atualiza um ativo
   */
  router.put('/:moduleId/assets/:assetId', auth, modifyApiLimiter, async (req, res) => {
    try {
      const { moduleId, assetId } = req.params;
      const updateData = req.body;
      
      const asset = await ManagedAsset.findOne({
        _id: assetId,
        module_id: moduleId
      });
      
      if (!asset) {
        return res.status(404).json({
          success: false,
          message: 'Ativo não encontrado'
        });
      }
      
      // Atualiza os campos
      Object.keys(updateData).forEach(key => {
        if (key !== '_id' && key !== 'module_id' && key !== 'created_at') {
          asset[key] = updateData[key];
        }
      });
      
      asset.updated_at = new Date();
      asset.updated_by = req.user.id;
      
      await asset.save();
      
      safeLog(req, 'info', `Ativo atualizado: ${asset.asset_name} - Usuário: ${req.user.username}`);
      
      res.json({
        success: true,
        message: 'Ativo atualizado com sucesso',
        asset: asset
      });
    } catch (error) {
      safeLog(req, 'error', `Erro ao atualizar ativo: ${error.message}`);
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
      const { moduleId, assetId } = req.params;
      
      const asset = await ManagedAsset.findOneAndDelete({
        _id: assetId,
        module_id: moduleId
      });
      
      if (!asset) {
        return res.status(404).json({
          success: false,
          message: 'Ativo não encontrado'
        });
      }
      
      safeLog(req, 'info', `Ativo excluído: ${asset.asset_name} - Usuário: ${req.user.username}`);
      
      res.json({
        success: true,
        message: 'Ativo excluído com sucesso'
      });
    } catch (error) {
      safeLog(req, 'error', `Erro ao excluir ativo: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao excluir ativo',
        error: error.message
      });
    }
  });

  return router;
};