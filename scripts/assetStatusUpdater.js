// File: jobs/assetStatusUpdater.js
const cron = require('node-cron');
const logger = require('../utils/logger'); // Ajuste o path se o logger estiver em outro lugar (ex: ./utils/logger)

const models = [
  require('../models/Desktop'),
  require('../models/Notebook'),
  require('../models/Printer'),
  // Adicione mais modelos aqui, ex:
  // require('../models/Panel'),
];

async function updateAssetStatuses() {
  const threshold = new Date(Date.now() - 15 * 60 * 1000); // 15 minutos atrás
  for (const Model of models) {
    try {
      const result = await Model.updateMany(
        {
          last_seen: { $lt: threshold },
          status: { $ne: 'offline' } // Evita atualizar se já offline
        },
        { $set: { status: 'offline' } }
      );
      logger.info(`Atualização de status: ${result.modifiedCount} assets atualizados para offline em ${Model.modelName}`);
    } catch (error) {
      logger.error(`Erro ao atualizar statuses em ${Model.modelName}: ${error.message}`);
    }
  }
}

module.exports = () => {
  cron.schedule('*/5 * * * *', updateAssetStatuses, {
    scheduled: true,
    timezone: 'America/Sao_Paulo' // Ajuste para o seu timezone
  });
  logger.info('Cron job de atualização de status de assets inicializado.');
};