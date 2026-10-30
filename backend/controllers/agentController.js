// controllers/agentController.js
// Recebe dados enviados por agentes (desktop/totem/mobile) via POST /api/monitor
// O asset_type é determinado pelo campo enviado no body (ou padrão 'totem')

const ManagedAsset = require('../models/ManagedAsset');
const AssetModuleConfig = require('../models/AssetModuleConfig');
const locationService = require('../services/locationService');

function cleanIpAddress(rawIp) {
  if (!rawIp) return null;
  if (rawIp.startsWith('::ffff:')) return rawIp.substring(7);
  if (rawIp.includes(',')) return rawIp.split(',')[0].trim();
  return rawIp.replace(/[[\]]/g, '');
}

const _deriveStatus = (printerStatus) => {
  // Status é sempre decidido pelo servidor; erro de impressora vira 'error'.
  const value = String(printerStatus || '');
  return /error|erro|falha/i.test(value) ? 'error' : 'online';
};

/**
 * Resolve o module_id a partir do asset_type.
 * Busca o AssetModuleConfig ativo correspondente ao tipo.
 * Retorna null se não encontrado — o chamador deve decidir o que fazer.
 */
async function resolveModuleId(assetType, logger) {
  try {
    const config = await AssetModuleConfig.findOne({
      type: assetType,
      is_active: true,
    }).lean();

    if (!config) {
      logger.warn(
        `[agentController] Nenhum módulo ativo encontrado para asset_type="${assetType}". ` +
        'O ativo não será salvo sem um module_id válido.'
      );
      return null;
    }

    return config._id;
  } catch (err) {
    logger.error(`[agentController] Erro ao resolver module_id: ${err.message}`);
    return null;
  }
}

exports.handleAgentData = async (req, res) => {
  const logger = req.logger || console;
  try {
    const data = req.body || {};
    const cleanIp = cleanIpAddress(req.ip || req.connection?.remoteAddress);

    const serialNumber = String(data.serial_number || data.serialNumber || '').trim();
    if (!serialNumber) {
      return res.status(400).json({
        success: false,
        error: 'serial_number/serialNumber é obrigatório',
      });
    }

    // asset_type pode vir no body; se não, assume 'totem' para compatibilidade
    const assetType = data.asset_type || 'totem';

    // ─── CORREÇÃO CRÍTICA ────────────────────────────────────────────
    // O schema ManagedAsset exige module_id obrigatório e possui índice
    // único composto {module_id, serial_number}. Sem module_id o upsert
    // anterior falhava silenciosamente ou criava documentos inválidos.
    const moduleId = await resolveModuleId(assetType, logger);

    if (!moduleId) {
      return res.status(422).json({
        success: false,
        error: `Nenhum módulo ativo configurado para o tipo "${assetType}". ` +
          'Crie o módulo no painel antes de enviar dados do agente.',
      });
    }
    // ────────────────────────────────────────────────────────────────

    const locationResult = await locationService.mapDeviceLocation({
      ip_address: cleanIp,
      mac_address_radio: data.mac_address_radio,
      device_name: data.hostname || serialNumber,
    });

    const printerStatus = data.printer_status ?? data.printerStatus ?? null;
    const existing = await ManagedAsset.findOne({
      module_id: moduleId,
      serial_number: serialNumber,
    }).lean();
    const existingCustom = existing?.custom_data
      ? (existing.custom_data instanceof Map ? Object.fromEntries(existing.custom_data) : existing.custom_data)
      : {};

    const defined = (obj) => Object.fromEntries(
      Object.entries(obj).filter(([, value]) => value !== undefined)
    );

    const mergedCustomData = {
      ...existingCustom,
      ...defined({
        printer_status: printerStatus,
        installed_programs: data.installed_programs ?? data.installedPrograms,
        biometric_status: data.biometric_reader ?? data.biometricReaderStatus,
        zebra_status: data.zebra_status ?? data.zebraStatus,
        bematech_status: data.bematech_status ?? data.bematechStatus,
        totem_type: data.totem_type ?? data.totemType,
      }),
    };

    const assetData = {
      module_id: moduleId,           // ← obrigatório, resolvido acima
      asset_type: assetType,
      serial_number: serialNumber,
      asset_name: data.asset_name || data.hostname || `${assetType}-${serialNumber}`,
      ip_address: cleanIp,
      mac_address: data.mac_address || null,
      mac_address_radio: data.mac_address_radio || null,
      status: _deriveStatus(printerStatus),
      last_seen: new Date(),
      unit: locationResult.unit || 'Desconhecida',
      sector: locationResult.sector,
      floor: locationResult.floor,

      // Campos comuns a agentes desktop/totem
      hostname: data.hostname || null,
      model: data.model || null,
      ram: data.ram || null,
      storage_type: data.storage_type || data.hdType || null,
      storage: data.storage || data.hdStorage || null,

      // Campos de totem no nível superior (contrato único)
      printer_status: printerStatus,
      zebra_status: data.zebra_status ?? data.zebraStatus ?? null,
      bematech_status: data.bematech_status ?? data.bematechStatus ?? null,
      biometric_reader: data.biometric_reader ?? data.biometricReaderStatus ?? null,
      totem_type: data.totem_type ?? data.totemType ?? null,

      // Dados extras preservados em custom_data (merge, não overwrite)
      custom_data: mergedCustomData,
    };

    // Upsert seguro: filtra pelo par {module_id, serial_number} garantindo
    // que o índice único composto seja respeitado.
    const asset = await ManagedAsset.findOneAndUpdate(
      {
        module_id: moduleId,
        serial_number: serialNumber,
      },
      { $set: assetData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    logger.logDeviceOperation('agent_data_received', {
      serialNumber,
      hostname: data.hostname,
      asset_type: assetType,
      module_id: moduleId,
      ip: cleanIp,
    });

    res.status(201).json({ success: true, asset });
  } catch (error) {
    logger.error?.('Erro ao processar dados do agente:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};