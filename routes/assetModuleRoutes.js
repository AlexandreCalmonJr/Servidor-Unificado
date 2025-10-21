// routes/assetModuleRoutes.js
const express = require('express');
const router = express.Router();
const assetModuleController = require('../controllers/assetModuleController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// --- Rotas de Configuração de Módulo ---

// GET /api/modules (Lista todas as configurações de módulos)
router.get('/', auth, assetModuleController.getModuleConfigs);

// PUT /api/modules/:moduleId (Atualiza a configuração de um módulo, ex: colunas)
router.put('/:moduleId', auth, role(['admin']), assetModuleController.updateModuleConfig);

// --- Rotas de Ativos (Assets) ---

// GET /api/modules/:moduleId/assets (Lista todos os ativos de um módulo, ex: /api/modules/panel/assets)
router.get('/:moduleId/assets', auth, assetModuleController.getAssets);

// POST /api/modules/:moduleId/assets (Cria um novo ativo)
router.post('/:moduleId/assets', auth, role(['admin']), assetModuleController.createAsset);

// GET /api/modules/:moduleId/assets/:assetId (Busca um ativo específico)
router.get('/:moduleId/assets/:assetId', auth, assetModuleController.getAssetById);

// PUT /api/modules/:moduleId/assets/:assetId (Atualiza um ativo específico)
router.put('/:moduleId/assets/:assetId', auth, role(['admin']), assetModuleController.updateAsset);

// DELETE /api/modules/:moduleId/assets/:assetId (Deleta um ativo específico)
//
router.delete('/:moduleId/assets/:assetId', auth, role(['admin']), assetModuleController.deleteAsset);


// --- Rotas de Permissões de Módulo ---

// GET /api/modules/:moduleId/permissions (Lista IDs de usuários com acesso ao módulo)
//
router.get('/:moduleId/permissions', auth, role(['admin']), assetModuleController.getModulePermissions);

// PUT /api/modules/:moduleId/permissions (Define a lista de usuários com acesso)
//
router.put('/:moduleId/permissions', auth, role(['admin']), assetModuleController.updateModulePermissions);


module.exports = router;