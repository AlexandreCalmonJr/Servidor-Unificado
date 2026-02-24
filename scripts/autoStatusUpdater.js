/**
 * scripts/autoStatusUpdater.js
 * Atualiza status de ativos para offline automaticamente
 * Executado a cada 5 minutos via cron
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ManagedAsset = require('../models/ManagedAsset');
const logger = require('../utils/logger');

async function autoStatusUpdater() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const OFFLINE_THRESHOLD_MINUTES = 15; // Marca offline depois de 15 min
    const MAINTENANCE_THRESHOLD_MINUTES = 30; // Mantém manutenção por 30 min
    
    const cutoffTime = new Date(Date.now() - OFFLINE_THRESHOLD_MINUTES * 60 * 1000);
    
    // 1. Marcar offline ativos que não reportaram
    const updateOfflineResult = await ManagedAsset.updateMany(
      {
        status: 'online',
        last_seen: { $lt: cutoffTime },
        deleted_at: null // Soft delete check
      },
      {
        $set: {
          status: 'offline',
          status_updated_at: new Date(),
          auto_status_update: true
        }
      }
    );
    
    if (updateOfflineResult.modifiedCount > 0) {
      logger.info(`🔄 Auto-status updater: ${updateOfflineResult.modifiedCount} ativo(s) marcado(s) como offline`);
    }
    
    // 2. Limpar manutenção expirada (se passou 30 min)
    const maintenanceCutoff = new Date(Date.now() - MAINTENANCE_THRESHOLD_MINUTES * 60 * 1000);
    const updateMaintenanceResult = await ManagedAsset.updateMany(
      {
        status: 'maintenance',
        maintenance_updated_at: { $lt: maintenanceCutoff },
        deleted_at: null
      },
      {
        $set: {
          status: 'offline',
          status_updated_at: new Date()
        }
      }
    );
    
    if (updateMaintenanceResult.modifiedCount > 0) {
      logger.info(`🔄 Auto-status updater: ${updateMaintenanceResult.modifiedCount} ativo(s) removido(s) da manutenção`);
    }
    
    logger.info('✅ Auto-status updater finalizado');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Erro no auto-status updater:', error);
    process.exit(1);
  }
}

autoStatusUpdater();
