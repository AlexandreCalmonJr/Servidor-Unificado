// routes/monitoringRoutes.js (CORRIGIDO)
const express = require('express');
const router = express.Router();
const assetModels = require('../models'); // Desktop, Notebook, Panel, Printer, etc.
const locationService = require('../services/locationService');
const asyncHandler = require('../middleware/asyncHandler');

module.exports = (logger, modifyApiLimiter, auth) => {
  
  // ========================================
  // POST /api/modules/:moduleId/assets
  // Recebe dados do Agente Windows
  // ========================================
  router.post('/:moduleId/assets', auth, modifyApiLimiter, asyncHandler(async (req, res) => {
    const { moduleId } = req.params;
    const data = req.body;

    logger.info('📦 Dados recebidos do agente', {
      moduleId,
      hostname: data.hostname,
      serial: data.serial_number,
      ip: data.ip_address,
      bssid: data.mac_address_radio,
    });

    // ✅ VALIDAÇÃO: Campos Obrigatórios
    if (!data.serial_number || !data.hostname) {
      logger.warn('❌ Dados inválidos: serial_number ou hostname ausente');
      return res.status(400).json({
        success: false,
        message: 'serial_number e hostname são obrigatórios'
      });
    }

    // ✅ MAPEAMENTO DE LOCALIZAÇÃO
    const locationData = await locationService.mapDeviceLocation({
      ip_address: data.ip_address || 'N/A',
      mac_address_radio: data.mac_address_radio || 'N/A',
      device_name: data.hostname
    });

    logger.info('📍 Localização mapeada', {
      hostname: data.hostname,
      unit: locationData.unit,
      sector: locationData.sector,
      floor: locationData.floor,
      confidence: locationData.confidence
    });

    // ✅ PAYLOAD COMPLETO (Preserva TODOS os campos)
    const assetData = {
      // Campos Base
      asset_name: data.asset_name || data.hostname,
      serial_number: data.serial_number,
      status: 'online',
      last_seen: new Date(),
      
      // ✅ LOCALIZAÇÃO (Servidor tem prioridade)
      unit: locationData.unit,
      sector: locationData.sector,
      floor: locationData.floor,
      location: locationData.unit, // Campo legado
      
      // ✅ CAMPOS CRÍTICOS (Preservados)
      hostname: data.hostname,
      model: data.model || 'N/A',
      manufacturer: data.manufacturer || 'N/A',
      processor: data.processor || 'N/A',
      ram: data.ram || 'N/A',
      storage: data.storage || 'N/A',
      storage_type: data.storage_type || data.hd_type || 'N/A',
      operating_system: data.operating_system || 'N/A',
      os_version: data.os_version || 'N/A',
      
      // ✅ REDE
      ip_address: data.ip_address || 'N/A',
      mac_address: data.mac_address || 'N/A',
      mac_address_radio: data.mac_address_radio || 'N/A', // BSSID
      wifi_ssid: data.wifi_ssid || 'N/A',
      connection_type: data.connection_type || 'Desconhecido',
      
      // ✅ CAMPOS IMPORTANTES PARA O PAINEL
      current_user: data.current_user || 'N/A',
      uptime: data.uptime || 'N/A',
      updated_at: new Date(), // ✅ Timestamp de atualização
      
      // ✅ SOFTWARE
      java_version: data.java_version || 'N/A',
      browser_version: data.browser_version || 'N/A',
      installed_software: data.installed_software || [],
      
      // ✅ SEGURANÇA
      antivirus_status: data.antivirus_status || false,
      antivirus_version: data.antivirus_version || 'N/A',
      is_encrypted: data.is_encrypted || false,
      
      // ✅ CAMPOS ESPECÍFICOS
      // Notebook
      ...(data.is_notebook && {
        battery_level: data.battery_level || null,
        battery_health: data.battery_health || 'N/A'
      }),
      
      // Desktop
      ...(!data.is_notebook && {
        biometric_reader: data.biometric_reader || data.biometric_reader_status || 'N/A',
        connected_printer: data.connected_printer || 'N/A'
      }),
      
      // Impressora
      ...(moduleId.includes('printer') && {
        printer_status: data.printer_status || 'unknown',
        connection_type: data.connection_type || 'network',
        toner_levels: data.toner_levels || {},
        total_page_count: data.total_page_count || null
      }),
      
      // Painel/TV
      ...(moduleId.includes('panel') && {
        screen_size: data.screen_size || 'N/A',
        resolution: data.resolution || 'N/A',
        firmware_version: data.firmware_version || 'N/A',
        hdmi_input: data.hdmi_input || 'N/A'
      }),
      
      // ✅ Custom Data (Preserva dados extras)
      custom_data: data.custom_data || {}
    };

    // ✅ LOG COMPLETO DO PAYLOAD
    logger.debug('💾 Salvando ativo com payload:', {
      serial: assetData.serial_number,
      hostname: assetData.hostname,
      location: `${assetData.unit} / ${assetData.sector} / ${assetData.floor}`,
      current_user: assetData.current_user,
      uptime: assetData.uptime,
      bssid: assetData.mac_address_radio,
      ip: assetData.ip_address
    });

    // ✅ UPSERT (Atualiza ou Cria)
    const Model = getModelByModuleId(moduleId);
    const asset = await Model.findOneAndUpdate(
      { serial_number: assetData.serial_number },
      { $set: assetData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    logger.info('✅ Ativo salvo com sucesso', {
      id: asset._id,
      hostname: asset.hostname,
      status: asset.status
    });

    res.status(200).json({
      success: true,
      message: 'Ativo atualizado com sucesso',
      asset: {
        id: asset._id,
        hostname: asset.hostname,
        status: asset.status,
        location: {
          unit: asset.unit,
          sector: asset.sector,
          floor: asset.floor
        }
      }
    });
  }));

  // ========================================
  // GET /api/modules/:moduleId/assets
  // Lista todos os ativos do módulo
  // ========================================
  router.get('/:moduleId/assets', auth, asyncHandler(async (req, res) => {
    const { moduleId } = req.params;
    
    const Model = getModelByModuleId(moduleId);
    const assets = await Model.find({}).sort({ last_seen: -1 }).lean();

    logger.info('📋 Ativos retornados', {
      moduleId,
      count: assets.length
    });

    res.status(200).json({
      success: true,
      assets
    });
  }));

  return router;
};

// ========================================
// HELPER: Mapeia moduleId para Model
// ========================================
function getModelByModuleId(moduleId) {
  // Extrai o tipo do ID (ex: "desktop-module-1" -> "desktop")
  const typeMatch = moduleId.match(/^(desktop|notebook|panel|printer)/i);
  
  if (!typeMatch) {
    throw new Error(`Tipo de módulo não identificado: ${moduleId}`);
  }
  
  const type = typeMatch[1].toLowerCase();
  
  const modelMap = {
    desktop: require('../models/Desktop'),
    notebook: require('../models/Notebook'),
    panel: require('../models/Panel'),
    printer: require('../models/Printer')
  };
  
  const Model = modelMap[type];
  
  if (!Model) {
    throw new Error(`Modelo não encontrado para tipo: ${type}`);
  }
  
  return Model;
}
