// controllers/agentController.js
// Recebe dados enviados por agentes (desktop/totem/mobile) via POST /api/monitor
// O asset_type é determinado pelo campo enviado no body (ou padrão 'totem')

const ManagedAsset = require('../models/ManagedAsset');
const locationService = require('../services/locationService');

function cleanIpAddress(rawIp) {
  if (!rawIp) return null;
  if (rawIp.startsWith('::ffff:')) return rawIp.substring(7);
  if (rawIp.includes(',')) return rawIp.split(',')[0].trim();
  return rawIp.replace(/[\[\]]/g, '');
}

const _calculateStatus = ({ printer_status, last_seen }) => {
  const isOffline = (Date.now() - new Date(last_seen)) > 2 * 60 * 1000;
  if (isOffline) return 'offline';
  if (printer_status && printer_status.toLowerCase().includes('error')) return 'error';
  return 'online';
};

exports.handleAgentData = async (req, res) => {
  const logger = req.logger || console;
  try {
    const data = req.body;
    const cleanIp = cleanIpAddress(req.ip || req.connection.remoteAddress);

    const locationResult = await locationService.mapDeviceLocation({
      ip_address: cleanIp,
      mac_address_radio: data.mac_address_radio,
      device_name: data.hostname || data.serialNumber,
    });

    // asset_type pode vir no body; se não, assume 'totem' para compatibilidade
    const assetType = data.asset_type || 'totem';

    const assetData = {
      asset_type: assetType,
      serial_number: data.serialNumber,
      asset_name: data.hostname || `${assetType}-${data.serialNumber}`,
      ip_address: cleanIp,
      mac_address: data.mac_address_radio,
      status: _calculateStatus({ printer_status: data.printerStatus, last_seen: new Date() }),
      last_seen: new Date(),
      unit: locationResult.unit || 'Desconhecida',
      sector: locationResult.sector,
      floor: locationResult.floor,

      // Campos comuns a agentes desktop/totem
      hostname: data.hostname,
      model: data.model || 'N/A',
      ram: data.ram,
      storage_type: data.hdType,
      storage: data.hdStorage,

      // Dados extras preservados em custom_data
      custom_data: {
        printer_status: data.printerStatus,
        installed_programs: data.installedPrograms,
        biometric_status: data.biometricReaderStatus,
        zebra_status: data.zebraStatus,
        bematech_status: data.bematechStatus,
        totem_type: data.totemType,
      },
    };

    const asset = await ManagedAsset.findOneAndUpdate(
      { serial_number: assetData.serial_number },
      assetData,
      { upsert: true, new: true }
    );

    logger.logDeviceOperation('agent_data_received', {
      serialNumber: data.serialNumber,
      hostname: data.hostname,
      asset_type: assetType,
      ip: cleanIp,
    });

    res.status(201).json({ success: true, asset });
  } catch (error) {
    logger.error?.('Erro ao processar dados do agente:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
