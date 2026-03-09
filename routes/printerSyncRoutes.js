// routes/printerSyncRoutes.js
// Rota para sincronizar dados de impressoras USB do agente local/desktop

const express = require('express');
const router = express.Router();
const ManagedAsset = require('../models/ManagedAsset');
const AssetModuleConfig = require('../models/AssetModuleConfig');
const locationService = require('../services/locationService');

module.exports = (logger, modifyApiLimiter, deviceAuth) => {
  const cleanMappedValue = (value, unknownTokens = []) => {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    if (!normalized) return null;
    const lowered = normalized.toLowerCase();
    if (unknownTokens.includes(lowered)) return null;
    return normalized;
  };

  const resolveMappedLocation = async (input = {}, fallback = {}) => {
    const safeInput = input || {};
    const safeFallback = fallback || {};
    const ipAddress = safeInput.ip_address || safeFallback.ip_address || null;
    const macAddress = safeInput.mac_address || safeInput.mac_address_radio || safeFallback.mac_address || null;
    let mapped = null;

    if (ipAddress || macAddress) {
      try {
        mapped = await locationService.mapDeviceLocation({
          ip_address: ipAddress,
          mac_address_radio: macAddress,
          device_name: safeInput.asset_name || safeFallback.asset_name || 'Printer',
        });
      } catch (error) {
        logger.warn(`[PrinterSync] Falha no mapeamento de localizacao: ${error.message}`);
      }
    }

    const unit = cleanMappedValue(safeInput.unit ?? safeFallback.unit) || cleanMappedValue(mapped?.unit, ['n/a']);
    const sector = cleanMappedValue(safeInput.sector ?? safeFallback.sector) || cleanMappedValue(mapped?.sector, ['desconhecido', 'unknown']);
    const floor = cleanMappedValue(safeInput.floor ?? safeFallback.floor ?? safeInput.location ?? safeFallback.location)
      || cleanMappedValue(mapped?.floor, ['desconhecido', 'unknown']);
    const location = cleanMappedValue(safeInput.location ?? safeFallback.location) || floor || null;

    return { unit, sector, floor, location };
  };

  const normalizeStatus = (rawStatus) => {
    if (rawStatus === undefined || rawStatus === null || rawStatus === '') return 'online';
    const value = String(rawStatus).trim().toLowerCase();
    const map = {
      online: 'online',
      offline: 'offline',
      maintenance: 'maintenance',
      retired: 'retired',
      unknown: 'unknown',
      active: 'online',
      inactive: 'offline',
      ativo: 'online',
      inativo: 'offline',
      manutencao: 'maintenance',
      'manuten��o': 'maintenance',
    };
    return map[value] || 'unknown';
  };

  /**
   * POST /api/printers/sync
   * Sincroniza dados de impressoras USB enviados por agentes locais
   */
  router.post('/sync', modifyApiLimiter, deviceAuth, async (req, res) => {
    try {
      const {
        printers = [],
        device_id,
        timestamp,
        source = 'unknown-agent',
        agent_hostname = null,
      } = req.body;

      if (!Array.isArray(printers) || printers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhuma impressora para sincronizar',
        });
      }

      let module = await AssetModuleConfig.findOne({ type: 'printer', is_active: true });
      if (!module) {
        module = new AssetModuleConfig({
          name: 'Impressoras',
          type: 'printer',
          description: 'Impressoras gerenciadas automaticamente',
          is_active: true,
        });
        await module.save();
        logger.info('[PrinterSync] Modulo de impressoras criado automaticamente');
      }

      const results = [];

      for (const printer of printers) {
        try {
          const printerSerial = printer.serial_number || printer.id;
          if (!printerSerial || !printer.asset_name || !printer.connection_type) {
            logger.warn('[PrinterSync] Dados incompletos de impressora', printer);
            continue;
          }

          const connectionType = printer.connection_type === 'ip' ? 'network' : printer.connection_type;
          if (!['network', 'usb'].includes(connectionType)) {
            logger.warn(`[PrinterSync] Tipo de conexao invalido (${printer.connection_type}) para ${printerSerial}`);
            continue;
          }

          const existing = await ManagedAsset.findOne({
            module_id: module._id,
            serial_number: printerSerial,
          });

          const customData = {
            connection_details: printer.connection_details || {},
            device_agent_id: device_id || null,
            source,
            agent_hostname: agent_hostname || null,
            sync_timestamp: timestamp || null,
            last_sync: new Date(),
            toner_levels: printer.toner_levels || {},
            usb_toner_supported: Boolean(printer.custom_data?.usb_toner_supported || printer.toner_levels),
            toner_source: printer.custom_data?.toner_source || null,
            imaging_source: printer.custom_data?.imaging_source || null,
            imaging_web_source_url: printer.custom_data?.imaging_web_source_url || null,
            toner_message: printer.custom_data?.toner_message || null,
            ...(printer.custom_data || {}),
          };

          let asset;
          if (existing) {
            const mappedLocation = await resolveMappedLocation(printer, existing.toObject ? existing.toObject() : existing);
            existing.asset_name = printer.asset_name;
            if (!existing.manufacturer || existing.manufacturer === 'Unknown') {
              existing.manufacturer = printer.manufacturer || existing.manufacturer || 'Unknown';
            }
            if (!existing.model || existing.model === 'Unknown') {
              existing.model = printer.model || existing.model || 'Unknown';
            }
            existing.ip_address = printer.ip_address || existing.ip_address || null;
            existing.connection_type = connectionType;
            existing.usb_path = printer.usb_path || existing.usb_path || null;
            existing.hostname = printer.hostname || existing.hostname || agent_hostname || null;
            existing.unit = mappedLocation.unit;
            existing.sector = mappedLocation.sector;
            existing.location = mappedLocation.location;
            existing.floor = mappedLocation.floor;
            existing.status = normalizeStatus(printer.status);
            existing.last_check_time = printer.last_check ? new Date(printer.last_check) : new Date();
            existing.last_seen = new Date();
            if (printer.toner_levels && typeof printer.toner_levels === 'object') {
              existing.toner_levels = printer.toner_levels;
            }
            existing.custom_data = {
              ...(existing.custom_data instanceof Map ? Object.fromEntries(existing.custom_data) : (existing.custom_data || {})),
              ...customData,
            };
            if (existing.is_deleted) {
              existing.is_deleted = false;
              existing.deleted_at = null;
              existing.deleted_by = null;
            }
            await existing.save();
            asset = existing;
          } else {
            const mappedLocation = await resolveMappedLocation(printer);
            asset = await ManagedAsset.create({
              module_id: module._id,
              asset_type: 'printer',
              asset_name: printer.asset_name,
              serial_number: printerSerial,
              manufacturer: printer.manufacturer || 'Unknown',
              model: printer.model || 'Unknown',
              ip_address: printer.ip_address || null,
              connection_type: connectionType,
              usb_path: printer.usb_path || null,
              hostname: printer.hostname || agent_hostname || null,
              unit: mappedLocation.unit,
              sector: mappedLocation.sector,
              location: mappedLocation.location,
              floor: mappedLocation.floor,
              status: normalizeStatus(printer.status),
              last_check_time: printer.last_check ? new Date(printer.last_check) : new Date(),
              toner_levels: (printer.toner_levels && typeof printer.toner_levels === 'object') ? printer.toner_levels : {},
              custom_data: customData,
            });
          }

          results.push({
            id: printerSerial,
            success: true,
            asset_id: asset._id,
          });

          logger.debug(`[PrinterSync] Impressora sincronizada: ${printer.asset_name}`);
        } catch (error) {
          const printerSerial = printer.serial_number || printer.id || 'unknown';
          logger.error(`[PrinterSync] Erro ao sincronizar impressora ${printerSerial}: ${error.message}`);
          results.push({
            id: printerSerial,
            success: false,
            error: error.message,
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      logger.info(`[PrinterSync] Sincronizacao concluida: ${successCount}/${printers.length} impressoras (source=${source})`);

      return res.json({
        success: true,
        message: `${successCount} impressoras sincronizadas com sucesso`,
        source,
        results,
        synced_count: successCount,
        total_count: printers.length,
      });
    } catch (error) {
      logger.error(`[PrinterSync] Erro ao sincronizar: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao sincronizar impressoras',
        error: error.message,
      });
    }
  });

  return router;
};
