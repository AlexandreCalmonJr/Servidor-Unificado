// routes/assetCommandRoutes.js
const express = require('express');
const router = express.Router();
const assetCommandController = require('../controllers/assetCommandController');

module.exports = (logger, modifyApiLimiter, auth, deviceAuth) => {
  
  // ===== ROTAS DO PAINEL (Protegidas com JWT) =====
  
  // Criar comando para um ativo
  router.post(
    '/modules/:moduleId/assets/:assetId/commands',
    auth,
    modifyApiLimiter,
    assetCommandController.createCommand
  );

  // Buscar histórico de comandos de um ativo
  router.get(
    '/modules/:moduleId/assets/:assetId/commands',
    auth,
    assetCommandController.getCommandHistory
  );

  // ===== ROTAS DO CLIENTE (Protegidas com deviceAuth) =====
  
  // Cliente busca comandos pendentes
  router.get(
    '/modules/:moduleId/assets/commands/pending',
    deviceAuth,
    assetCommandController.getPendingCommands
  );

  // Cliente reporta resultado de comando
  router.post(
    '/modules/:moduleId/assets/commands/:commandId/result',
    deviceAuth,
    modifyApiLimiter,
    assetCommandController.reportCommandResult
  );

  return router;
};