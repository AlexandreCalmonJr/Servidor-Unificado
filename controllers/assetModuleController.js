// controllers/assetModuleController.js
const AssetModuleConfig = require('../models/AssetModuleConfig');
const Panel = require('../models/Panel');
const Desktop = require('../models/Desktop');
const Notebook = require('../models/Notebook');
const Printer = require('../models/Printer');
const Device = require('../models/Device'); // Mobile
const Totem = require('../models/Totem');   // Totem
const User = require('../models/User'); // Para permissões

// Mapeia o 'moduleId' (identificador) para o Modelo Mongoose
const assetModels = {
  panel: Panel,
  desktop: Desktop,
  notebook: Notebook,
  printer: Printer,
  mobile: Device,
  totem: Totem,
  scanner: Device,
  custom: Device,
};

/**
 * Helper para obter o modelo Mongoose com base no ID do módulo (identificador)
 */
const getModelByIdentifier = (identifier) => {
  const Model = assetModels[identifier];
  if (!Model) {
    throw new Error('Módulo de ativo não encontrado');
  }
  return Model;
};

// --- Funções para Ativos (Assets) ---

// GET /api/modules/:moduleId/assets
exports.getAssets = async (req, res) => {
  try {
    const Model = getModelByIdentifier(req.params.moduleId);
    const assets = await Model.find();
    res.json(assets);
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

// GET /api/modules/:moduleId/assets/:assetId
exports.getAssetById = async (req, res) => {
  try {
    const Model = getModelByIdentifier(req.params.moduleId);
    const asset = await Model.findById(req.params.assetId);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Ativo não encontrado' });
    }
    res.json(asset);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/modules/:moduleId/assets
exports.createAsset = async (req, res) => {
  try {
    const Model = getModelByIdentifier(req.params.moduleId);
    const newAsset = new Model(req.body);
    await newAsset.save();
    res.status(201).json(newAsset);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/modules/:moduleId/assets/:assetId
exports.updateAsset = async (req, res) => {
  try {
    const Model = getModelByIdentifier(req.params.moduleId);
    const updatedAsset = await Model.findByIdAndUpdate(
      req.params.assetId,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedAsset) {
      return res.status(404).json({ success: false, message: 'Ativo não encontrado' });
    }
    res.json(updatedAsset);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/modules/:moduleId/assets/:assetId
//
exports.deleteAsset = async (req, res) => {
  try {
    const Model = getModelByIdentifier(req.params.moduleId);
    const deletedAsset = await Model.findByIdAndDelete(req.params.assetId);
    if (!deletedAsset) {
      return res.status(404).json({ success: false, message: 'Ativo não encontrado' });
    }
    res.json({ success: true, message: 'Ativo deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Funções para Configuração do Módulo ---

// GET /api/modules
exports.getModuleConfigs = async (req, res) => {
  try {
    const configs = await AssetModuleConfig.find();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/modules/:moduleId
exports.updateModuleConfig = async (req, res) => {
  try {
    const config = await AssetModuleConfig.findOneAndUpdate(
      { type: req.params.moduleId }, // O :moduleId é o 'type' (ex: 'panel')
      req.body,
      { new: true, runValidators: true }
    );
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuração de módulo não encontrada' });
    }
    res.json(config);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- Funções para Permissões do Módulo ---
// (Baseado no service module_management_service.dart)

// GET /api/modules/:moduleId/permissions
//
exports.getModulePermissions = async (req, res) => {
  try {
    const { moduleId } = req.params;
    // A permissão será armazenada como 'module:[moduleId]', ex: 'module:panel'
    const permissionKey = `module:${moduleId}`;

    // Encontra todos os usuários que possuem essa permissão
    //
    const users = await User.find({ permissions: permissionKey }).select('_id');

    const userIds = users.map(u => u._id.toString());

    res.json({ success: true, users: userIds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/modules/:moduleId/permissions
//
exports.updateModulePermissions = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { userIds } = req.body; // Espera um array de User IDs

    if (!Array.isArray(userIds)) {
      return res.status(400).json({ success: false, message: 'userIds deve ser um array' });
    }

    const permissionKey = `module:${moduleId}`;

    // 1. Adiciona a permissão para todos os usuários na lista
    await User.updateMany(
      { _id: { $in: userIds } },
      { $addToSet: { permissions: permissionKey } } // $addToSet evita duplicatas
    );

    // 2. Remove a permissão de todos os usuários que NÃO estão na lista
    await User.updateMany(
      { _id: { $nin: userIds } },
      { $pull: { permissions: permissionKey } } // $pull remove o item do array
    );

    res.json({ success: true, message: 'Permissões atualizadas com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};