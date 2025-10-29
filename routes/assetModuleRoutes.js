// routes/assetModuleRoutes.js - VERSÃO CORRIGIDA
const express = require('express');
const AssetModuleConfig = require('../models/AssetModuleConfig');
const Desktop = require('../models/Desktop');
const Notebook = require('../models/Notebook');
const Panel = require('../models/Panel');
const Printer = require('../models/Printer');

// ===== HELPER MOVIDO PARA FORA =====
const getModelByType = (type) => {
  const models = {
    'desktop': Desktop,
    'notebook': Notebook,
    'panel': Panel,
    'printer': Printer,
  };
  return models[type] || null;
};

// Exporta uma função que retorna o router configurado
module.exports = (logger, getApiLimiter) => {
  const router = express.Router();

  // ===== ROTAS DE CONFIGURAÇÃO DE MÓDULO =====

  // GET /api/assets/modules
  router.get('/modules', async (req, res) => {
    try {
      const modules = await AssetModuleConfig.find().sort({ created_at: -1 }).lean();
      const modulesWithCount = await Promise.all(
        modules.map(async (module) => {
          const Model = getModelByType(module.type);
          const count = Model ? await Model.countDocuments() : 0;
          return {
            ...module,
            asset_count: count
          };
        })
      );
      res.json({ success: true, modules: modulesWithCount });
    } catch (error) {
      logger.error(`Erro ao listar módulos: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao carregar módulos', error: error.message });
    }
  });

  // ===== ROTAS DE ATIVOS =====

  // GET /api/assets/:moduleId/assets
  router.get('/:moduleId/assets', async (req, res) => {
    try {
      const module = await AssetModuleConfig.findById(req.params.moduleId);
      if (!module) {
        return res.status(404).json({ success: false, message: 'Módulo não encontrado' });
      }

      const Model = getModelByType(module.type);
      if (!Model) {
        return res.status(400).json({ success: false, message: 'Modelo não encontrado para este tipo' });
      }

      const assets = await Model.find().sort({ last_seen: -1 }).lean();
      res.json({ success: true, assets });
    } catch (error) {
      logger.error(`Erro ao listar ativos: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao carregar ativos', error: error.message });
    }
  });

  // POST /api/assets/:moduleId/assets (USADO PELO AGENTE)
  router.post('/:moduleId/assets', async (req, res) => {
    try {
      const module = await AssetModuleConfig.findById(req.params.moduleId);
      if (!module) {
        return res.status(404).json({ success: false, message: 'Módulo não encontrado' });
      }

      const Model = getModelByType(module.type);
      if (!Model) {
        return res.status(400).json({ success: false, message: 'Modelo não encontrado' });
      }

      const assetData = req.body;
      assetData.asset_type = module.type;
      assetData.status = 'online';
      assetData.last_seen = new Date();

      // Verifica se já existe
      const existingAsset = await Model.findOne({ serial_number: assetData.serial_number });

      if (existingAsset) {
        // Atualiza
        Object.keys(assetData).forEach(key => {
          if (key !== '_id' && key !== 'created_at') {
            existingAsset[key] = assetData[key];
          }
        });
        existingAsset.updated_at = new Date();
        await existingAsset.save();

        logger.info(`✅ Ativo atualizado: ${existingAsset.asset_name}`);
        return res.status(200).json({ success: true, message: 'Ativo atualizado', asset: existingAsset, updated: true });
      }

      // Cria novo
      const newAsset = new Model(assetData);
      await newAsset.save();

      logger.info(`✅ Novo ativo criado: ${newAsset.asset_name}`);
      res.status(201).json({ success: true, message: 'Ativo criado', asset: newAsset, updated: false });
    } catch (error) {
      logger.error(`❌ Erro ao criar/atualizar ativo: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erro ao criar/atualizar ativo', error: error.message });
    }
  });

  return router;
};