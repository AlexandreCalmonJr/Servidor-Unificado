// File: jobs/assetStatusUpdater.js
// CORREÇÃO (Item 15): Removida a lógica de cron daqui
const cron = require('node-cron');
const logger = require('../utils/logger'); // Ajuste o path se o logger estiver em outro lugar (ex: ./utils/logger)

// ✅ CONSOLIDADO - Usar apenas ManagedAsset
const ManagedAsset = require('../models/ManagedAsset');
const models = [ManagedAsset];

/**
 * CORREÇÃO (Item 15): A função agora aceita o logger
 * e apenas executa a lógica de atualização.
 */
async function updateAssetStatuses(logger) {
  const threshold = new Date(Date.now() - 15 * 60 * 1000); // 15 minutos atrás
  
  if (!logger || typeof logger.info !== 'function') {
    console.error('Logger inválido passado para updateAssetStatuses');
    logger = console; // Fallback
  }

  for (const Model of models) {
    try {
      const result = await Model.updateMany(
        {
          last_seen: { $lt: threshold },
          status: { $ne: 'offline' } // Evita atualizar se já offline
        },
        { $set: { status: 'offline' } }
      );
      if (result.modifiedCount > 0) {
        logger.info(`Atualização de status: ${result.modifiedCount} assets atualizados para offline em ${Model.modelName}`);
      }
    } catch (error) {
      logger.error(`Erro ao atualizar statuses em ${Model.modelName}: ${error.message}`);
    }
  }
}

// CORREÇÃO (Item 15): Exporta a função diretamente
module.exports = updateAssetStatuses;