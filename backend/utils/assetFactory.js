// File: utils/assetFactory.js
// ✅ CONSOLIDADO - Sistema unificado usando ManagedAsset
// ===================================================================

const ManagedAsset = require('../models/ManagedAsset');

const { body, validationResult } = require('express-validator');
const locationService = require('../services/locationService');

// ===================================================================
// 1. REGISTRO DE TIPOS DE ASSETS (Consolidado em ManagedAsset)
// ===================================================================

const ASSET_TYPES = {
  desktop: {
    displayName: 'Desktop',
    icon: 'computer',
    description: 'Computadores desktop fixos',
  },
  notebook: {
    displayName: 'Notebook',
    icon: 'laptop',
    description: 'Notebooks e laptops',
  },
  panel: {
    displayName: 'Painel/TV',
    icon: 'tv',
    description: 'Painéis, TVs e monitores',
  },
  printer: {
    displayName: 'Impressora',
    icon: 'print',
    description: 'Impressoras e multifuncionais',
  },
  mobile: {
    displayName: 'Dispositivo Móvel',
    icon: 'smartphone',
    description: 'Smartphones e tablets',
  },
  totem: {
    displayName: 'Totem',
    icon: 'touch_app',
    description: 'Totems de autoatendimento',
  },
  scanner: {
    displayName: 'Scanner',
    icon: 'qr_code_scanner',
    description: 'Coletores de dados',
  },
  custom: {
    displayName: 'Outros',
    icon: 'devices_other',
    description: 'Outros dispositivos',
  },
};

// ===================================================================
// 2. FACTORY - RETORNA MODELO
// ===================================================================

/**
 * Retorna o modelo ManagedAsset para todos os tipos
 * ✅ CONSOLIDADO - Todos os tipos agora usam ManagedAsset com asset_type
 * @param {string} moduleType - Tipo do módulo
 * @returns {Model} ManagedAsset Model
 * @throws {Error} Se tipo não for suportado
 */
function getModelByType(moduleType) {
  const normalizedType = moduleType.toLowerCase().trim();
  const entry = ASSET_TYPES[normalizedType];

  if (!entry) {
    const available = Object.keys(ASSET_TYPES).join(', ');
    throw new Error(
      `Tipo de módulo não suportado: "${moduleType}". ` +
      `Tipos disponíveis: ${available}`
    );
  }

  return ManagedAsset;  // ← Sempre retorna ManagedAsset
}

/**
 * Retorna informações sobre um tipo de módulo
 * @param {string} moduleType 
 * @returns {Object|null}
 */
function getModuleInfo(moduleType) {
  const normalizedType = moduleType.toLowerCase().trim();
  return ASSET_TYPES[normalizedType] || null;
}

/**
 * Verifica se um tipo é suportado
 * @param {string} moduleType 
 * @returns {boolean}
 */
function isSupported(moduleType) {
  return Object.prototype.hasOwnProperty.call(ASSET_TYPES, moduleType.toLowerCase().trim());
}

/**
 * Lista todos os tipos suportados
 * @returns {string[]}
 */
function getSupportedTypes() {
  return Object.keys(ASSET_TYPES);
}

// ===================================================================
// 3. VALIDAÇÕES ESPECÍFICAS POR TIPO
// ===================================================================

// Validações base (todos os ativos)
const baseValidation = [
  body('asset_name')
    .trim()
    .notEmpty().withMessage('Nome do ativo é obrigatório')
    .isLength({ max: 100 }).withMessage('Nome muito longo (max 100 caracteres)'),

  body('serial_number')
    .trim()
    .notEmpty().withMessage('Serial é obrigatório')
    .isLength({ max: 100 }).withMessage('Serial muito longo'),

  body('status')
    .optional()
    .trim(),

  body('ip_address')
    .optional()
    .custom((value) => {
      if (value && value !== 'N/A') {
        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(value)) {
          throw new Error('IP inválido');
        }
      }
      return true;
    }),

  body('mac_address')
    .optional()
    .custom((value) => {
      if (value && value !== 'N/A') {
        const macRegex = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i;
        if (!macRegex.test(value)) {
          throw new Error('MAC Address inválido (formato: AA:BB:CC:DD:EE:FF)');
        }
      }
      return true;
    }),
];

// Validações específicas por tipo
const TYPE_SPECIFIC_VALIDATIONS = {
  desktop: [
    body('hostname').optional().trim(),
    body('processor').optional().trim(),
    body('ram').optional().trim(),
    body('storage').optional().trim(),
    body('operating_system').optional().trim(),
    body('biometric_reader').optional().trim(),
    body('connected_printer').optional().trim(),
  ],

  notebook: [
    body('hostname').optional().trim(),
    body('battery_level')
      .optional({ checkFalsy: true })
      .isInt({ min: 0, max: 100 })
      .withMessage('Nível de bateria deve estar entre 0 e 100'),
    body('battery_health').optional().trim(),
    body('is_encrypted').optional({ checkFalsy: true }).isBoolean(),
  ],

  panel: [
    body('hostname').optional().trim(),
    body('screen_size').optional().trim(),
    body('resolution').optional().trim(),
    body('brightness')
      .optional({ checkFalsy: true })
      .isInt({ min: 0, max: 100 })
      .withMessage('Brilho deve estar entre 0 e 100'),
    body('volume')
      .optional({ checkFalsy: true })
      .isInt({ min: 0, max: 100 })
      .withMessage('Volume deve estar entre 0 e 100'),
    body('hdmi_input').optional().trim(),
  ],

  printer: [
    body('hostname').optional().trim(),
    body('connection_type')
      .optional({ checkFalsy: true })
      .isIn(['network', 'usb', 'bluetooth'])
      .withMessage('Tipo de conexão inválido (network, usb ou bluetooth)'),
    body('printer_status').optional().trim(),
    body('is_duplex').optional({ checkFalsy: true }).isBoolean(),
    body('is_color').optional({ checkFalsy: true }).isBoolean(),
    body('total_page_count').optional({ checkFalsy: true }).isInt({ min: 0 }),
  ],

  mobile: [
    body('model').optional().trim(),
    body('manufacturer').optional().trim(),
    body('android_id').optional().trim(),
    body('battery_level').optional().toInt(),
    body('os_version').optional().trim(),
    body('app_version').optional().trim(),
    body('is_kiosk_mode').optional().isBoolean(),
  ],
};

/**
 * Retorna validações específicas para um tipo de módulo
 * @param {string} moduleType 
 * @returns {Array} Array de validações do express-validator
 */
function getValidationsByType(moduleType) {
  const normalizedType = moduleType.toLowerCase().trim();
  const typeValidations = TYPE_SPECIFIC_VALIDATIONS[normalizedType] || [];

  return [
    ...baseValidation,
    ...typeValidations,
  ];
}

/**
 * Middleware para validar requisição baseado no tipo do módulo
 * Uso: router.post('/:moduleId/assets', validateByModuleId, async (req, res) => {...})
 */
const validateByModuleId = async (req, res, next) => {
  try {
    const AssetModuleConfig = require('../models/AssetModuleConfig');
    const mongoose = require('mongoose');
    const param = req.params.moduleId;
    let module = null;

    if (mongoose.isValidObjectId(param)) {
      module = await AssetModuleConfig.findById(param);
    } else if (isSupported(param)) {
      // Se for uma string de tipo conhecido (ex: 'mobile', 'desktop')
      // Tenta achar uma config, ou usa um objeto virtual
      module = await AssetModuleConfig.findOne({ type: param });
      if (!module) {
        module = { type: param, name: param, is_active: true };
      }
    }

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Módulo não encontrado',
      });
    }

    // Obtém validações específicas
    const validations = getValidationsByType(module.type);

    // Executa validações
    await Promise.all(
      validations.map(validation => validation.run(req))
    );

    // Verifica erros
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors.array().map(err => ({
          field: err.path || err.param,
          message: err.msg,
          value: err.value,
        })),
      });
    }

    // Adiciona tipo ao request para uso posterior
    req.moduleType = module.type;
    req.module = module;

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro na validação',
      error: error.message,
    });
  }
};

// ===================================================================
// 4. TRANSFORMAÇÕES DE DADOS (Sanitização)
// ===================================================================

/**
 * Sanitiza dados de entrada antes de salvar
 * @param {Object} data - Dados do ativo
 * @param {string} moduleType - Tipo do módulo
 * @returns {Object} Dados sanitizados
 */
// Campos controlados exclusivamente pelo servidor/painel.
// Nunca aceitar do payload de agente (proteção contra mass assignment).
const PROTECTED_FIELDS = [
  '_id', '__v', 'module_id',
  'status', 'last_seen',
  'is_deleted', 'deleted_at', 'deleted_by',
  'created_at', 'updated_at', 'created_by', 'updated_by',
  'provisioning_status',
  'device_token_hash', 'device_token_prefix', 'token_status',
  'quarantine_reason', 'quarantine_at',
  'token_created_at', 'token_revoked_at',
  'location_history', 'maintenance_history',
  'schema_version',
];

// Campos que o agente pode enviar. Tudo fora desta lista é descartado
// quando a requisição vem de um dispositivo (agentIngest).
const AGENT_ALLOWED_FIELDS = new Set([
  'asset_name', 'serial_number', 'hostname', 'model', 'manufacturer',
  'processor', 'processor_cores', 'ram', 'storage', 'storage_type',
  'operating_system', 'os_version', 'ip_address', 'mac_address',
  'mac_address_radio', 'connection_type', 'battery_level', 'battery_health',
  'is_notebook', 'is_encrypted', 'is_mobile',
  'printer_status', 'zebra_status', 'bematech_status', 'biometric_reader',
  'totem_type', 'screen_size', 'resolution', 'firmware_version',
  'imei', 'android_id', 'secure_android_id',
  'custom_data', 'asset_type',
  'total_pages', 'toner_levels',
]);

async function sanitizeAssetData(data, moduleType, options = {}) {
  let sanitized = { ...data };

  // Remove campos que o cliente não pode controlar.
  for (const field of PROTECTED_FIELDS) delete sanitized[field];

  // Se a requisição vem de um agente/dispositivo, aplica allowlist rígida.
  if (options.agentIngest) {
    const filtered = {};
    for (const key of Object.keys(sanitized)) {
      if (AGENT_ALLOWED_FIELDS.has(key)) filtered[key] = sanitized[key];
    }
    sanitized = filtered;
  }

  // Remove campos vazios ou "N/A" desnecessários.
  // Em updates parciais (painel), remove a chave completamente para
  // não sobrescrever dados existentes com null.
  const isPartialUpdate = !options.isNew && !options.agentIngest;
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === 'N/A' || sanitized[key] === '') {
      if (key !== 'asset_name' && key !== 'serial_number') {
        if (isPartialUpdate) {
          delete sanitized[key]; // Não sobrescrever com nulo
        } else {
          sanitized[key] = null;
        }
      }
    }
  });

  // Não sobrescrever com undefined em atualizações parciais.
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) delete sanitized[key];
  });

  // Normaliza MAC Address
  if (sanitized.mac_address && sanitized.mac_address !== 'N/A') {
    sanitized.mac_address = sanitized.mac_address
      .toUpperCase()
      .replace(/-/g, ':')
      .replace(/\./g, ':');
  }

  // Define tipo do ativo
  sanitized.asset_type = moduleType;

  if (options.agentIngest) {
    // Status é decisão do servidor, nunca do agente.
    const printerStatus = sanitized.custom_data?.printer_status || sanitized.printer_status || '';
    sanitized.status = /error|erro|falha/i.test(String(printerStatus)) ? 'error' : 'online';
    sanitized.last_seen = new Date();
  } else if (options.isNew) {
    if (!sanitized.status) sanitized.status = 'online';
    if (!sanitized.last_seen) sanitized.last_seen = new Date();
  }
  // Em update administrativo não tocamos em status/last_seen.

  // =================================================================
  // Data
  // 1. Prioriza dados de 'sector' e 'floor' vindos do custom_data (enviados pelo agente)
  if (sanitized.custom_data) {
    if (sanitized.custom_data.sector && (sanitized.sector === 'Desconhecido' || !sanitized.sector)) {
      sanitized.sector = sanitized.custom_data.sector;
    }
    if (sanitized.custom_data.floor && (sanitized.floor === 'Desconhecido' || !sanitized.floor)) {
      sanitized.floor = sanitized.custom_data.floor;
    }
  }

  // 2. Integração com locationService:
  //    Tenta mapear APENAS se os campos AINDA estiverem como "Desconhecido" ou "N/A"
  // =================================================================

  let locationMapped = false;
  const unitUnknown = (!sanitized.unit || sanitized.unit === 'N/A' || sanitized.unit === 'Desconhecido');
  const sectorUnknown = (!sanitized.sector || sanitized.sector === 'Desconhecido');
  const floorUnknown = (!sanitized.floor || sanitized.floor === 'Desconhecido');
  const hasLocationHint = Boolean(sanitized.ip_address || sanitized.mac_address || sanitized.mac_address_radio);

  if (options.resolveLocation !== false && hasLocationHint && (unitUnknown || sectorUnknown || floorUnknown)) {
    const deviceData = {
      ip_address: sanitized.ip_address || sanitized.host_computer_ip || 'N/A', // Para printers USB
      mac_address_radio: sanitized.mac_address || sanitized.macAddress || 'N/A',
      device_name: sanitized.asset_name || sanitized.hostname || 'N/A',
    };

    // O locationService (mappings.js) será chamado
    const location = await locationService.mapDeviceLocation(deviceData);

    // Aplica apenas campos que AINDA estão ausentes
    if (unitUnknown) {
      sanitized.unit = location.unit;
    }
    if (sectorUnknown) {
      sanitized.sector = location.sector;
    }
    if (floorUnknown) {
      sanitized.floor = location.floor;
    }

    locationMapped = true;
  }

  return sanitized;
}

/**
 * Transforma dados de saída para o frontend
 * @param {Object} asset - Documento Mongoose
 * @returns {Object} Dados transformados
 */
function transformAssetForOutput(asset) {
  const plain = asset.toObject ? asset.toObject() : asset;

  return {
    ...plain,
    // Garante que sector_floor está disponível
    sector_floor: (plain.sector || plain.floor)
      ? `${plain.sector || 'N/D'} / ${plain.floor || 'N/D'}`
      : (plain.location || 'N/D'),
  };
}

// ===================================================================
// 5. UTILITÁRIOS
// ===================================================================

/**
 * Cria um novo ativo com validação e sanitização
 * @param {string} moduleType 
 * @param {Object} data 
 * @returns {Promise<Document>}
 */
/**
 * Cria um novo ativo com validação e sanitização e histórico inicial
 * @param {string} moduleType 
 * @param {Object} data 
 * @returns {Promise<Document>}
 */
async function createAsset(moduleType, data, options = {}) {
  const Model = getModelByType(moduleType);
  const targetModuleId = data.module_id || options.moduleId;
  const sanitized = await sanitizeAssetData(data, moduleType, { ...options, isNew: true });
  if (targetModuleId) {
    sanitized.module_id = targetModuleId;
  }

  const asset = new Model(sanitized);

  // Registro inicial de histórico de localização se houver dados
  if ((asset.unit && asset.unit !== 'N/A') || (asset.sector && asset.sector !== 'Desconhecido')) {
    if (!asset.location_history) asset.location_history = [];
    asset.location_history.push({
      timestamp: new Date(),
      ip: asset.ip_address,
      unit: asset.unit,
      sector: asset.sector,
      floor: asset.floor,
      source: 'enrollment'
    });
  }

  await asset.save();

  return transformAssetForOutput(asset);
}

/**
 * Atualiza um ativo existente com tracking de histórico de localização
 * @param {string} moduleType 
 * @param {string} assetId 
 * @param {Object} data 
 * @returns {Promise<Document>}
 */
async function updateAsset(moduleType, assetId, data, options = {}) {
  const Model = getModelByType(moduleType);
  const sanitized = await sanitizeAssetData(data, moduleType, options);

  const asset = await Model.findById(assetId);
  if (!asset) {
    throw new Error('Ativo não encontrado');
  }

  // Detecta mudança de localização para histórico BEFORE update
  const oldLoc = { u: asset.unit, s: asset.sector, f: asset.floor };

  // Aplica apenas chaves PRESENTES e DEFINIDAS no payload sanitizado.
  // Chaves ausentes no body original não devem sobrescrever dados existentes.
  Object.keys(sanitized).forEach((key) => {
    if (sanitized[key] !== undefined && sanitized[key] !== null) {
      asset[key] = sanitized[key];
    } else if (sanitized[key] === null && options.agentIngest) {
      // Agentes podem enviar null para limpar campos que eles controlam
      asset[key] = sanitized[key];
    }
    // Em updates do painel, null é ignorado (preserva valor existente)
  });

  const newLoc = { u: asset.unit, s: asset.sector, f: asset.floor };

  // Se mudou algo relevante na localização
  if (oldLoc.u !== newLoc.u || oldLoc.s !== newLoc.s || oldLoc.f !== newLoc.f) {
    if (!asset.location_history) asset.location_history = [];
    asset.location_history.push({
      timestamp: new Date(),
      ip: asset.ip_address,
      unit: asset.unit,
      sector: asset.sector,
      floor: asset.floor,
      source: 'update_tracking'
    });
  }

  asset.updated_at = new Date();
  await asset.save();

  return transformAssetForOutput(asset);
}

// ===================================================================
// EXPORTAÇÕES
// ===================================================================

module.exports = {
  // Factory
  getModelByType,
  getModuleInfo,
  isSupported,
  getSupportedTypes,

  // Validações
  getValidationsByType,
  validateByModuleId,
  baseValidation,

  // Transformações
  sanitizeAssetData,
  transformAssetForOutput,

  // Utilitários de alto nível
  createAsset,
  updateAsset,
};