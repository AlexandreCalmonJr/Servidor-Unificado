// controllers/agentController.js
// Recebe dados enviados por agentes (desktop/totem/mobile) via POST /api/monitor
// O asset_type é determinado pelo campo enviado no body (ou padrão 'totem')

const ManagedAsset = require('../models/ManagedAsset');
const AssetModuleConfig = require('../models/AssetModuleConfig');
const locationService = require('../services/locationService');
const { normalizeTelemetry, cleanIpAddress } = require('../utils/telemetryNormalizer');

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
    if (!serialNumber || serialNumber === 'N/A' || serialNumber.toLowerCase() === 'unknown') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_SERIAL_NUMBER',
        error: 'serial_number válido é obrigatório (não pode ser vazio, N/A ou unknown)',
      });
    }

    // asset_type pode vir no body; se não, assume 'totem' para compatibilidade
    const assetType = data.asset_type || 'totem';

    // Resolve o módulo ativo correspondente
    const moduleId = await resolveModuleId(assetType, logger);
    if (!moduleId) {
      return res.status(422).json({
        success: false,
        error: `Nenhum módulo ativo configurado para o tipo "${assetType}". ` +
          'Crie o módulo no painel antes de enviar dados do agente.',
      });
    }

    const existing = await ManagedAsset.findOne({
      module_id: moduleId,
      serial_number: serialNumber,
    }).lean();

    const locationResult = await locationService.mapDeviceLocation({
      ip_address: cleanIp,
      mac_address_radio: data.mac_address_radio,
      device_name: data.hostname || serialNumber,
    });

    // Pipeline Canônico de Telemetria (P2)
    const normalized = normalizeTelemetry(data, {
      reqIp: cleanIp,
      isQuarantined: existing?.token_status === 'quarantine' || req.device?.isQuarantined,
      isMaintenance: existing?.maintenance_status,
    });

    const existingCustom = existing?.custom_data
      ? (existing.custom_data instanceof Map ? Object.fromEntries(existing.custom_data) : existing.custom_data)
      : {};

    const mergedCustomData = {
      ...existingCustom,
      ...normalized.custom_data,
    };

    // Preserva unidade/setor/andar configurados previamente no painel (B1)
    const unitToSet = (existing?.unit && existing.unit !== 'N/A' && existing.unit !== 'Desconhecida')
      ? existing.unit
      : (locationResult.unit || 'Desconhecida');
    const sectorToSet = (existing?.sector && existing.sector !== 'Desconhecido')
      ? existing.sector
      : locationResult.sector;
    const floorToSet = (existing?.floor && existing.floor !== 'Desconhecido')
      ? existing.floor
      : locationResult.floor;

    const assetData = {
      ...normalized,
      module_id: moduleId,
      unit: unitToSet,
      sector: sectorToSet,
      floor: floorToSet,
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