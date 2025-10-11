// Ficheiro: services/totemService.js

const Totem = require('../models/Totem');
const { getLocationFromIp } = require('./ipMappingService');

exports.createOrUpdate = async (data) => {
  const { serialNumber, ip } = data;
  const existingDevice = await Totem.findOne({ serialNumber });

  // Determinar a localização com base no IP
  const unitRoutes = await getLocationFromIp(ip);

  const deviceData = { ...data, unitRoutes };

  if (existingDevice) {
    Object.assign(existingDevice, deviceData);
    existingDevice.lastSeen = new Date();
    return await existingDevice.save();
  } else {
    const newDevice = new Totem(deviceData);
    return await newDevice.save();
  }
};

exports.getAll = async () => {
  const devices = await Totem.find({}).sort({ lastSeen: -1 }).lean();

  const devicesWithStatus = devices.map(device => {
    const now = new Date();
    const isOffline = (now - new Date(device.lastSeen)) > (2 * 60 * 1000);

    let status = isOffline ? 'Offline' : 'Online';

    if (status === 'Online' && device.printerStatus && device.printerStatus.toLowerCase().includes('error')) {
      status = 'Com Erro';
    }

    return { ...device, status };
  });

  return devicesWithStatus;
};