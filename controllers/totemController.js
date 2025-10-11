// Ficheiro: controllers/totemController.js

const totemService = require('../services/totemService');
const ipMappingService = require('../services/ipMappingService');

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

exports.handleTotemData = async (req, res) => {
  const logger = req.logger || console;
  try {
    const data = req.body;
    const rawIp = req.ip || req.connection.remoteAddress;
    const cleanIp = cleanIpAddress(rawIp);

    data.ip = cleanIp;
    data.location = await ipMappingService.getLocationFromIp(cleanIp);

    const device = await totemService.createOrUpdate(data);

    res.status(200).json({
      message: 'Dados de monitoramento recebidos!',
      deviceId: device._id,
      location: device.location
    });
  } catch (error) {
    logger.error('Erro em handleTotemData:', error);
    res.status(500).json({ message: 'Erro interno no servidor.', error: error.message });
  }
};

exports.getTotems = async (req, res) => {
  const logger = req.logger || console;
  try {
    const devices = await totemService.getAll();
    res.status(200).json(devices);
  } catch (error) {
    logger.error('Erro em getTotems:', error);
    res.status(500).json({ message: 'Erro ao obter dispositivos.', error: error.message });
  }
};