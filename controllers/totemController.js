// Ficheiro: controllers/totemController.js
// ✅ CONSOLIDADO - Controller leve para receber dados de totems
// Propósito: POST /api/monitor - clientes (agents/desktop) enviam dados
// Dados são salvos em ManagedAsset com asset_type='totem'

const ManagedAsset = require('../models/ManagedAsset');
const locationService = require('../services/locationService');

function cleanIpAddress(rawIp) {
  if (!rawIp) return null;
  if (rawIp.startsWith('::ffff:')) {
    return rawIp.substring(7);
  }
  if (rawIp.includes(',')) {
    return rawIp.split(',')[0].trim();
  }
  return rawIp.replace(/[\\[\\]]/g, '');
}

// Helper para calcular status
const _calculateStatus = (device) => {
  const now = new Date();
  const isOffline = (now - new Date(device.last_seen)) > (2 * 60 * 1000);
  let status = isOffline ? 'offline' : 'online';
  
  if (status === 'online' && device.printer_status && device.printer_status.toLowerCase().includes('error')) {
    status = 'error';
  }
  
  return status;
};

exports.handleTotemData = async (req, res) => {
  const logger = req.logger || console;
  try {
    const data = req.body;
    const rawIp = req.ip || req.connection.remoteAddress;
    const cleanIp = cleanIpAddress(rawIp);

    // Mapear localização
    const locationResult = await locationService.mapDeviceLocation({
      ip_address: cleanIp,
      mac_address_radio: data.mac_address_radio,
      device_name: data.hostname || data.serialNumber
    });

    // Montar dados do ativo
    const assetData = {
      asset_type: 'totem',  // ← Identificar como totem
      serial_number: data.serialNumber,
      asset_name: data.hostname || `Totem-${data.serialNumber}`,
      ip_address: cleanIp,
      mac_address: data.mac_address_radio,
      status: _calculateStatus({ printer_status: data.printerStatus, last_seen: new Date() }),
      last_seen: new Date(),
      unit: locationResult.unit || 'Desconhecida',
      sector: locationResult.sector,
      location: locationResult.location,
      
      // Campos específicos de Totem
      hostname: data.hostname,
      model: data.model || 'N/A',
      printer_status: data.printerStatus,
      installed_programs: data.installedPrograms,
      biometric_status: data.biometricReaderStatus,
      zebra_status: data.zebraStatus,
      bematech_status: data.bematechStatus,
      totem_type: data.totemType,
      ram: data.ram,
      storage_type: data.hdType,
      storage: data.hdStorage,
    };

    // Criar ou atualizar em ManagedAsset
    const device = await ManagedAsset.findOneAndUpdate(
      { serial_number: assetData.serial_number },
      assetData,
      { upsert: true, new: true }
    );

    logger.logDeviceOperation('totem_data_received', {
      serialNumber: data.serialNumber,
      hostname: data.hostname,
      ip: cleanIp,
    });

    res.status(201).json({ success: true, device });
  } catch (error) {
    req.logger?.error('Erro ao processar dados do totem:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};