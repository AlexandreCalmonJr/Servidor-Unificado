// routes/assetModuleRoutes.js
const express = require('express');
const assetModuleController = require('../controllers/assetModuleController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// Exporta uma função que retorna o router configurado
module.exports = (logger, getApiLimiter) => {
  const router = express.Router();

  // --- Rotas de Configuração de Módulo ---

  // GET /api/assets/modules (Lista todas as configurações de módulos)
  router.get('/modules', auth, assetModuleController.getModuleConfigs);

  // PUT /api/assets/modules/:moduleId (Atualiza a configuração de um módulo)
  router.put('/modules/:moduleId', auth, role(['admin']), assetModuleController.updateModuleConfig);

  // --- Rotas de Ativos (Assets) ---

  // GET /api/assets/:moduleId/assets (Lista todos os ativos de um módulo)
  router.get('/:moduleId/assets', auth, assetModuleController.getAssets);

  // POST /api/assets/:moduleId/assets (Cria um novo ativo)
  router.post('/:moduleId/assets', auth, role(['admin']), assetModuleController.createAsset);

  // GET /api/assets/:moduleId/assets/:assetId (Busca um ativo específico)
  router.get('/:moduleId/assets/:assetId', auth, assetModuleController.getAssetById);

  // PUT /api/assets/:moduleId/assets/:assetId (Atualiza um ativo específico)
  router.put('/:moduleId/assets/:assetId', auth, role(['admin']), assetModuleController.updateAsset);

  // DELETE /api/assets/:moduleId/assets/:assetId (Deleta um ativo específico)
  router.delete('/:moduleId/assets/:assetId', auth, role(['admin']), assetModuleController.deleteAsset);

  // --- Rotas de Permissões de Módulo ---

  // GET /api/assets/:moduleId/permissions (Lista IDs de usuários com acesso ao módulo)
  router.get('/:moduleId/permissions', auth, role(['admin']), assetModuleController.getModulePermissions);

  // PUT /api/assets/:moduleId/permissions (Define a lista de usuários com acesso)
  router.put('/:moduleId/permissions', auth, role(['admin']), assetModuleController.updateModulePermissions);

  return router;
};