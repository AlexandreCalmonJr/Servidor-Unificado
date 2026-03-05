// routes/printerSyncRoutes.js
// Rota para sincronizar dados de impressoras USB do agente local

const express = require('express');
const router = express.Router();
const ManagedAsset = require('../models/ManagedAsset');
const AssetModuleConfig = require('../models/AssetModuleConfig');

module.exports = (logger, modifyApiLimiter, deviceAuth) => {
  /**
   * POST /api/printers/sync
   * Sincroniza dados de impressoras USB enviados pelo agente local
   * Requer autenticação de dispositivo
   */
  router.post('/sync', modifyApiLimiter, deviceAuth, async (req, res) => {
    try {
      const { printers = [], device_id, timestamp } = req.body;

      if (!Array.isArray(printers) || printers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhuma impressora para sincronizar',
        });
      }

      // Obtém ou cria módulo de impressoras
      let module = await AssetModuleConfig.findOne({ type: 'printer', is_active: true });
      
      if (!module) {
        module = new AssetModuleConfig({
          name: 'Impressoras',
          type: 'printer',
          description: 'Impressoras gerenciadas automaticamente',
          is_active: true,
        });
        await module.save();
        logger.info('[PrinterSync] Módulo de impressoras criado automaticamente');
      }

      // Processa cada impressora
      const results = [];
      
      for (const printer of printers) {
        try {
          // Valida dados mínimos
          if (!printer.id || !printer.asset_name || !printer.connection_type) {
            logger.warn('[PrinterSync] Dados incompletos de impressora:', printer);
            continue;
          }

          // Cria ou atualiza ativo
          const asset = await ManagedAsset.findOneAndUpdate(
            {
              module_id: module._id,
              serial_number: printer.id,
            },
            {
              module_id: module._id,
              asset_type: 'printer',
              asset_name: printer.asset_name,
              serial_number: printer.id,
              manufacturer: printer.manufacturer || 'Unknown',
              model: printer.model || 'Unknown',
              ip_address: printer.ip_address || null,
              connection_type: printer.connection_type,
              status: printer.status || 'online',
              last_check_time: new Date(printer.last_check) || new Date(),
              custom_data: {
                connection_details: printer.connection_details || {},
                device_agent_id: device_id,
                last_sync: new Date(),
              },
            },
            { upsert: true, new: true }
          );

          results.push({
            id: printer.id,
            success: true,
            asset_id: asset._id,
          });

          logger.debug(`[PrinterSync] Impressora sincronizada: ${printer.asset_name}`);
        } catch (error) {
          logger.error(`[PrinterSync] Erro ao sincronizar impressora ${printer.id}:`, error.message);
          results.push({
            id: printer.id,
            success: false,
            error: error.message,
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      
      logger.info(`[PrinterSync] Sincronização concluída: ${successCount}/${printers.length} impressoras`);

      res.json({
        success: true,
        message: `${successCount} impressoras sincronizadas com sucesso`,
        results,
        synced_count: successCount,
        total_count: printers.length,
      });

    } catch (error) {
      logger.error('[PrinterSync] Erro ao sincronizar:', error.message);
      res.status(500).json({
        success: false,
        message: 'Erro ao sincronizar impressoras',
        error: error.message,
      });
    }
  });

  return router;
};
