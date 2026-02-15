// File: utils/assetFactory.js
// Sistema unificado de Factory + Validações + Transformações
// ===================================================================

const Desktop = require('../models/Desktop');
const Notebook = require('../models/Notebook');
const Panel = require('../models/Panel');
const Printer = require('../models/Printer');
const Device = require('../models/Device'); // Mobile
const Totem = require('../models/Totem');   // Totem
const { body, validationResult } = require('express-validator');
const locationService = require('../services/locationService'); // Importa o serviço de localização

// ===================================================================
// 1. REGISTRO DE MODELOS
// ===================================================================

const MODEL_REGISTRY = {
  desktop: {
    model: Desktop,
    displayName: 'Desktop',
    icon: 'computer',
    description: 'Computadores desktop fixos',
  },
  notebook: {
    model: Notebook,
    displayName: 'Notebook',
    icon: 'laptop',
    description: 'Notebooks e laptops',
  },
  panel: {
    model: Panel,
    displayName: 'Painel/TV',
    icon: 'tv',
    description: 'Painéis, TVs e monitores',
  },
  printer: {
    model: Printer,
    displayName: 'Impressora',
    icon: 'print',
    description: 'Impressoras e multifuncionais',
  },
  mobile: {
    model: Device,
    displayName: 'Dispositivo Móvel',
    icon: 'smartphone',
    description: 'Smartphones e tablets',
  },
  totem: {
    model: Totem,
    displayName: 'Totem',
    icon: 'touch_app',
    description: 'Totems de autoatendimento',
  },
  scanner: {
    model: Device,
    displayName: 'Coletor',
    icon: 'qr_code_scanner',
    description: 'Coletores de dados',
  },
  custom: {
    model: Device,
    displayName: 'Outros',
    icon: 'devices_other',
    description: 'Outros dispositivos',
  },
};

// ===================================================================
// 2. FACTORY - RETORNA MODELO
// ===================================================================

/**
 * Retorna o modelo Mongoose baseado no tipo
 * @param {string} moduleType - Tipo do módulo
 * @returns {Model} Modelo Mongoose
 * @throws {Error} Se tipo não for suportado
 */
function getModelByType(moduleType) {
  const normalizedType = moduleType.toLowerCase().trim();
  const entry = MODEL_REGISTRY[normalizedType];

  if (!entry) {
    const available = Object.keys(MODEL_REGISTRY).join(', ');
    throw new Error(
      `Tipo de módulo não suportado: "${moduleType}". ` +
      `Tipos disponíveis: ${available}`
    );
  }

  return entry.model;
}

/**
 * Retorna informações sobre um tipo de módulo
 * @param {string} moduleType 
 * @returns {Object|null}
 */
function getModuleInfo(moduleType) {
  const normalizedType = moduleType.toLowerCase().trim();
  return MODEL_REGISTRY[normalizedType] || null;
}

/**
 * Verifica se um tipo é suportado
 * @param {string} moduleType 
 * @returns {boolean}
 */
function isSupported(moduleType) {
  return MODEL_REGISTRY.hasOwnProperty(moduleType.toLowerCase().trim());
}

/**
 * Lista todos os tipos suportados
 * @returns {string[]}
 */
function getSupportedTypes() {
  return Object.keys(MODEL_REGISTRY);
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
    .isIn(['online', 'offline', 'maintenance', 'Sem Monitorar'])
    .withMessage('Status inválido'),

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
    body('hostname').trim().notEmpty().withMessage('Hostname é obrigatório'),
    body('processor').optional().trim(),
    body('ram').optional().trim(),
    body('storage').optional().trim(),
    body('operating_system').optional().trim(),
    body('biometric_reader').optional().trim(),
    body('connected_printer').optional().trim(),
  ],

  notebook: [
    body('hostname').trim().notEmpty().withMessage('Hostname é obrigatório'),
    body('battery_level')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Nível de bateria deve estar entre 0 e 100'),
    body('battery_health').optional().trim(),
    body('is_encrypted').optional().isBoolean(),
  ],

  panel: [
    body('hostname').trim().notEmpty().withMessage('Hostname é obrigatório'),
    body('screen_size').optional().trim(),
    body('resolution').optional().trim(),
    body('brightness')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Brilho deve estar entre 0 e 100'),
    body('volume')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Volume deve estar entre 0 e 100'),
    body('hdmi_input').optional().trim(),
  ],

  printer: [
    body('hostname').trim().notEmpty().withMessage('Hostname é obrigatório'),
    body('connection_type')
      .isIn(['network', 'usb', 'bluetooth'])
      .withMessage('Tipo de conexão inválido (network, usb ou bluetooth)'),
    body('printer_status').optional().trim(),
    body('is_duplex').optional().isBoolean(),
    body('is_color').optional().isBoolean(),
    body('total_page_count').optional().isInt({ min: 0 }),
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
    const module = await AssetModuleConfig.findById(req.params.moduleId);

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
async function sanitizeAssetData(data, moduleType) {
  const sanitized = { ...data };

  // Remove campos vazios ou "N/A" desnecessários
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === 'N/A' || sanitized[key] === '') {
      if (key !== 'asset_name' && key !== 'serial_number') {
        sanitized[key] = null;
      }
    }
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

  // Garante campos base
  if (!sanitized.status) {
    sanitized.status = 'online';
  }

  if (!sanitized.last_seen) {
    sanitized.last_seen = new Date();
  }

  // =================================================================
  // ✅ INÍCIO DA CORREÇÃO
  // =Data
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

  if (unitUnknown || sectorUnknown || floorUnknown) {
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
async function createAsset(moduleType, data) {
  const Model = getModelByType(moduleType);
  const sanitized = await sanitizeAssetData(data, moduleType); // Agora async por causa do locationService

  const asset = new Model(sanitized);
  await asset.save();

  return transformAssetForOutput(asset);
}

/**
 * Atualiza um ativo existente
 * @param {string} moduleType 
 * @param {string} assetId 
 * @param {Object} data 
 * @returns {Promise<Document>}
 */
async function updateAsset(moduleType, assetId, data) {
  const Model = getModelByType(moduleType);
  const sanitized = await sanitizeAssetData(data, moduleType); // Agora async

  const asset = await Model.findByIdAndUpdate(
    assetId,
    { $set: sanitized },
    { new: true, runValidators: true }
  );

  if (!asset) {
    throw new Error('Ativo não encontrado');
  }

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

  // Registry (para testes/debug)
  MODEL_REGISTRY,
};