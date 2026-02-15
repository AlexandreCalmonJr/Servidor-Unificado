const Totem = require('../models/Totem');
const { getLocationFromIp } = require('./ipMappingService');

// --- Helper para calcular status ---
// (Mova esta lógica para fora de 'getAll' para ser reutilizável)
const _calculateStatus = (device) => {
  const now = new Date();
  // Threshold de 2 minutos para offline
  const isOffline = (now - new Date(device.lastSeen)) > (2 * 60 * 1000);

  let status = isOffline ? 'Offline' : 'Online';

  if (status === 'Online' && device.printerStatus && device.printerStatus.toLowerCase().includes('error')) {
    status = 'Com Erro';
  }

  // ===== INÍCIO DA CORREÇÃO =====

  // 1. Renomeia 'unitRoutes' para 'location' para compatibilidade com o frontend
  const { unit, ...rest } = device;
  const location = unit || 'Desconhecida'; // Garante que não seja nulo

  // 2. Adiciona valores padrão para campos que o frontend espera, mas o modelo não tem
  const mozillaVersion = device.mozillaVersion || 'N/A';
  const javaVersion = device.javaVersion || 'N/A';

  return {
    ...rest,
    status,
    location,         // Campo renomeado
    mozillaVersion, // Campo com valor padrão
    javaVersion       // Campo com valor padrão
  };

  // ===== FIM DA CORREÇÃO =====
};


// --- Funções Existentes (Modificadas) ---

exports.createOrUpdate = async (data) => {
  const { serialNumber, ip } = data;

  // Determinar a localização com base no IP
  const unit = await getLocationFromIp(ip);

  const deviceData = {
    ...data,
    unit, // Adiciona a localização
    lastSeen: new Date() // Garante que 'lastSeen' seja atualizado
  };

  // Use findOneAndUpdate com 'upsert: true' para C/U em uma só operação
  const updatedDevice = await Totem.findOneAndUpdate(
    { serialNumber },
    { $set: deviceData },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return updatedDevice;
};

exports.getAll = async () => {
  const devices = await Totem.find({}).sort({ lastSeen: -1 }).lean();
  // Usa o helper para calcular status
  const devicesWithStatus = devices.map(_calculateStatus);
  return devicesWithStatus;
};


// --- NOVAS FUNÇÕES CRUD ---

/**
 * [R] READ (Single)
 * Busca um totem pelo Serial Number
 */
exports.getBySerialNumber = async (serialNumber) => {
  const device = await Totem.findOne({ serialNumber }).lean();
  if (!device) {
    return null;
  }
  // Retorna o dispositivo com o status calculado
  return _calculateStatus(device);
};

/**
 * [U] UPDATE
 * Atualiza um totem pelo Serial Number (para dados do painel)
 */
exports.updateBySerialNumber = async (serialNumber, updateData) => {
  // O '$set' garante que apenas os campos em 'updateData' sejam atualizados
  const updatedDevice = await Totem.findOneAndUpdate(
    { serialNumber },
    { $set: updateData },
    { new: true } // Retorna o documento modificado
  ).lean();

  if (!updatedDevice) {
    return null;
  }

  return _calculateStatus(updatedDevice);
};

/**
 * [D] DELETE
 * Exclui um totem pelo Serial Number
 */
exports.deleteBySerialNumber = async (serialNumber) => {
  const deletedDevice = await Totem.findOneAndDelete({ serialNumber });
  return deletedDevice; // Retorna o documento que foi excluído
};