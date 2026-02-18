const { Totem } = require('../models/Device');
const locationService = require('./locationService');

// --- Helper para calcular status ---
const _calculateStatus = (device) => {
  const now = new Date();
  // Threshold de 2 minutos para offline (ajustável)
  const isOffline = (now - new Date(device.last_seen)) > (2 * 60 * 1000);

  let status = isOffline ? 'Offline' : 'Online';

  if (status === 'Online' && device.printer_status && device.printer_status.toLowerCase().includes('error')) {
    status = 'Com Erro';
  }

  // Mapeamento de campos legados para o frontend (que espera 'hostname', 'unit', etc.)
  return {
    ...device, // Espalha campos do documento (lean)
    status,
    // Campos mapeados para manter compatibilidade com frontend legado
    hostname: device.asset_name, // asset_name é o novo hostname
    location: device.unit || 'Desconhecida',
    printerStatus: device.printer_status,
    serialNumber: device.serial_number,
    lastSeen: device.last_seen
  };
};

// --- Funções Principais ---

exports.createOrUpdate = async (data) => {
  const { serialNumber, ip, mac_address_radio, hostname, printerStatus, paperStatus } = data;

  // 1. Determinar Localização (Unificada)
  const locationResult = await locationService.mapDeviceLocation({
    ip_address: ip,
    mac_address_radio,
    device_name: hostname || serialNumber
  });

  // 2. Montar Objeto Device (Flat)
  const deviceData = {
    // Identificação
    serial_number: serialNumber,
    asset_name: hostname || `Totem-${serialNumber}`,
    device_type: 'totem', // Importante para o discriminador

    // Conectividade
    ip_address: ip,
    mac_address: mac_address_radio,

    // Status
    last_seen: new Date(),

    // Localização
    unit: locationResult.unit,
    sector: locationResult.sector,
    floor: locationResult.floor,

    // Específicos de Totem
    hostname: hostname, // Mantemos redundante no sub-doc se quiser
    printer_status: printerStatus,
    paper_status: paperStatus
  };

  // 3. Upsert na Coleção Unificada
  const updatedDevice = await Totem.findOneAndUpdate(
    { serial_number: serialNumber },
    { $set: deviceData },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return _calculateStatus(updatedDevice);
};

exports.getAll = async () => {
  // Busca apenas dispositivos do tipo 'totem'
  const devices = await Totem.find({ device_type: 'totem' })
    .sort({ last_seen: -1 })
    .lean();

  return devices.map(_calculateStatus);
};

exports.getBySerialNumber = async (serialNumber) => {
  const device = await Totem.findOne({ serial_number: serialNumber }).lean();
  if (!device) return null;
  return _calculateStatus(device);
};

exports.updateBySerialNumber = async (serialNumber, updateData) => {
  // Mapeia atualizações parciais se necessário
  // Por enquanto, assume que updateData já vem com chaves certas ou genéricas

  const updatedDevice = await Totem.findOneAndUpdate(
    { serial_number: serialNumber },
    { $set: updateData },
    { new: true }
  ).lean();

  if (!updatedDevice) return null;
  return _calculateStatus(updatedDevice);
};

exports.deleteBySerialNumber = async (serialNumber) => {
  const deletedDevice = await Totem.findOneAndDelete({ serial_number: serialNumber });
  return deletedDevice;
};