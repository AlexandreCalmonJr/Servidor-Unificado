// controllers/assetModuleController.js
const AssetModuleConfig = require('../models/AssetModuleConfig');
const ManagedAsset = require('../models/ManagedAsset');
const User = require('../models/User');
const mongoose = require('mongoose');

// ── Ativos ────────────────────────────────────────────────────────

// GET /api/modules/:moduleId/assets
exports.getAssets = async (req, res) => {
  try {
    const assets = await ManagedAsset.find({ asset_type: req.params.moduleId });
    res.json(assets);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/modules/:moduleId/assets/:assetId
exports.getAssetById = async (req, res) => {
  try {
    const asset = await ManagedAsset.findOne({
      _id: req.params.assetId,
      asset_type: req.params.moduleId,
    });
    if (!asset) return res.status(404).json({ success: false, message: 'Ativo não encontrado' });
    res.json(asset);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/modules/:moduleId/assets
exports.createAsset = async (req, res) => {
  try {
    const newAsset = new ManagedAsset({ ...req.body, asset_type: req.params.moduleId });
    await newAsset.save();
    res.status(201).json(newAsset);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/modules/:moduleId/assets/:assetId
exports.updateAsset = async (req, res) => {
  try {
    const updated = await ManagedAsset.findByIdAndUpdate(
      req.params.assetId,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Ativo não encontrado' });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/modules/:moduleId/assets/:assetId
exports.deleteAsset = async (req, res) => {
  try {
    const deleted = await ManagedAsset.findByIdAndDelete(req.params.assetId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Ativo não encontrado' });
    res.json({ success: true, message: 'Ativo deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Configuração do Módulo ────────────────────────────────────────

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
      { type: req.params.moduleId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!config) return res.status(404).json({ success: false, message: 'Configuração não encontrada' });
    res.json(config);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── Permissões do Módulo ──────────────────────────────────────────

// GET /api/modules/:moduleId/permissions
exports.getModulePermissions = async (req, res) => {
  try {
    const permissionKey = `module:${req.params.moduleId}`;
    const users = await User.find({ permissions: permissionKey }).select('_id');
    res.json({ success: true, users: users.map(u => u._id.toString()) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/modules/:moduleId/permissions
exports.updateModulePermissions = async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds)) {
      return res.status(400).json({ success: false, message: 'userIds deve ser um array' });
    }
    const permissionKey = `module:${req.params.moduleId}`;
    await User.updateMany({ _id: { $in: userIds } }, { $addToSet: { permissions: permissionKey } });
    await User.updateMany({ _id: { $nin: userIds } }, { $pull: { permissions: permissionKey } });
    res.json({ success: true, message: 'Permissões atualizadas com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Estatísticas ──────────────────────────────────────────────────

// GET /api/modules/:moduleId/stats
exports.getModuleStats = async (req, res) => {
  try {
    const { moduleId } = req.params;

    // Resolve o tipo: pode ser um ObjectId ou uma string de tipo
    let type = moduleId;
    if (mongoose.isValidObjectId(moduleId)) {
      const config = await AssetModuleConfig.findById(moduleId);
      if (!config) return res.status(404).json({ success: false, message: 'Módulo não encontrado' });
      type = config.type;
    }

    const [total, online, offline] = await Promise.all([
      ManagedAsset.countDocuments({ asset_type: type }),
      ManagedAsset.countDocuments({ asset_type: type, status: { $regex: /online/i } }),
      ManagedAsset.countDocuments({ asset_type: type, status: { $regex: /offline/i } }),
    ]);

    res.json({
      success: true,
      moduleId,
      type,
      stats: {
        total,
        online,
        offline,
        unknown: total - online - offline,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/modules/active
exports.getActiveModules = async (req, res) => {
  try {
    const configs = await AssetModuleConfig.find({ is_active: true });
    res.json({ success: true, modules: configs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
