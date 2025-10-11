const Device = require('../models/Device');

// Define os limites de tempo
const OFFLINE_THRESHOLD_MINUTES = 60;
const UNMONITORED_THRESHOLD_DAYS = 5;

/**
 * Atualiza o status dos dispositivos com base na inatividade.
 * @param {object} logger - A instância do logger (winston).
 */
const updateDeviceStatus = async (logger) => {
  try {
    // --- ETAPA 1: Marcar dispositivos 'online' como 'offline' ---
    const offlineThreshold = new Date(Date.now() - OFFLINE_THRESHOLD_MINUTES * 60 * 1000);
    
    const offlineResult = await Device.updateMany(
      {
        last_seen: { $lt: offlineThreshold },
        status: 'online', // Apenas muda quem está 'online'
        maintenance_status: { $ne: true } // Ignora quem está em manutenção
      },
      { 
        $set: { 
          status: 'offline',
          is_online: false
        } 
      }
    );

    if (offlineResult.modifiedCount > 0) {
      logger.info(`${offlineResult.modifiedCount} dispositivos foram marcados como 'offline'.`);
    }

    // --- ETAPA 2: Marcar dispositivos 'offline' como 'Sem Monitorar' ---
    const unmonitoredThreshold = new Date(Date.now() - UNMONITORED_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    const unmonitoredResult = await Device.updateMany(
      {
        last_seen: { $lt: unmonitoredThreshold },
        status: 'offline', // Apenas muda quem já está 'offline'
        maintenance_status: { $ne: true }
      },
      { 
        $set: { 
          status: 'Sem Monitorar'
        } 
      }
    );

    if (unmonitoredResult.modifiedCount > 0) {
      logger.info(`${unmonitoredResult.modifiedCount} dispositivos foram marcados como 'Sem Monitorar'.`);
    }

    if (offlineResult.modifiedCount === 0 && unmonitoredResult.modifiedCount === 0) {
      logger.info('Nenhum dispositivo precisou de atualização de status nesta execução.');
    }

  } catch (error) {
    logger.error('Erro durante a tarefa de atualização de status dos dispositivos:', { message: error.message });
  }
}

module.exports = updateDeviceStatus;