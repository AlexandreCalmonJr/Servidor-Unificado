// File: models/ManagedAsset.js (CORRIGIDO — serial_number único por módulo)
const mongoose = require('mongoose');

const managedAssetSchema = new mongoose.Schema({
  module_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssetModuleConfig',
    required: true,   // ✅ OBRIGATÓRIO — todo ativo pertence a um módulo
    index: true,
  },
  asset_name: {
    type: String,
    required: true,
    trim: true
  },
  asset_type: {
    type: String,
    required: true,
    enum: ['desktop', 'notebook', 'totem', 'panel', 'printer', 'scanner', 'mobile', 'custom'],
  },
  serial_number: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'maintenance', 'retired', 'unknown'],
    default: 'offline'
  },
  last_seen: {
    type: Date,
    default: Date.now
  },
  location: {
    type: String,
    trim: true
  },
  unit: { type: String, trim: true, default: 'N/A' },
  sector: { type: String, trim: true, default: 'Desconhecido' },
  floor: { type: String, trim: true, default: 'Desconhecido' },

  assigned_to: {
    type: String,
    trim: true
  },

  // ─── Campos Desktop / Notebook ────────────────────────────────────
  hostname: String,
  model: String,
  manufacturer: String,
  processor: String,
  processor_cores: Number,
  ram: String,
  storage: String,
  storage_type: String,
  operating_system: String,
  os_version: String,
  ip_address: String,
  mac_address: String,
  mac_address_radio: String,
  installed_software: [String],
  antivirus_status: Boolean,
  antivirus_version: String,
  last_update_check: Date,
  hardware_info: mongoose.Schema.Types.Mixed,

  // ─── Específico Notebook ──────────────────────────────────────────
  battery_level: Number,
  battery_health: String,
  is_encrypted: Boolean,
  is_notebook: Boolean,

  // ─── Específico Totem ─────────────────────────────────────────────
  printer_status: String,
  zebra_status: String,
  bematech_status: String,
  biometric_reader: String,
  totem_type: String,

  // ─── Específico Painel / TV ───────────────────────────────────────
  screen_size: String,
  resolution: String,
  firmware_version: String,
  is_online: Boolean,
  current_content: String,
  content_last_updated: Date,
  display_settings: mongoose.Schema.Types.Mixed,
  brightness: Number,
  volume: Number,
  hdmi_input: String,

  // ─── Específico Mobile ────────────────────────────────────────────
  imei: String,
  android_id: String,
  secure_android_id: String,
  is_mobile: Boolean,

  // ─── Manutenção ───────────────────────────────────────────────────
  maintenance_status: { type: Boolean, default: false },
  maintenance_ticket: String,
  maintenance_reason: String,
  maintenance_history: [mongoose.Schema.Types.Mixed],

  // ─── Histórico de localização ─────────────────────────────────────
  location_history: [mongoose.Schema.Types.Mixed],

  // ─── Dados customizados ──────────────────────────────────────────
  custom_data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // ─── Provisionamento ──────────────────────────────────────────────
  provisioning_status: { type: String, default: null },

  // ─── Soft Delete (para manter histórico) ───────────────────────────
  deleted_at: {
    type: Date,
    default: null,
    index: true  // 🗑️ Para filtros rápidos
  },
  is_deleted: {
    type: Boolean,
    default: false,
    index: true
  },

  // ─── Metadados ────────────────────────────────────────────────────
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deleted_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// ─── Índices ──────────────────────────────────────────────────────────

// ✅ CORREÇÃO PRINCIPAL: serial_number único POR MÓDULO
// Permite o mesmo serial em módulos diferentes, mas não dentro do mesmo módulo
managedAssetSchema.index(
  { module_id: 1, serial_number: 1 },
  { unique: true, name: 'idx_module_serial_unique' }
);

managedAssetSchema.index({ module_id: 1, status: 1 });
managedAssetSchema.index({ module_id: 1, asset_type: 1 });
managedAssetSchema.index({ last_seen: -1 });
managedAssetSchema.index({ location: 1 });
managedAssetSchema.index({ asset_name: 'text', serial_number: 'text' });

// 🗑️ Índices para soft delete
managedAssetSchema.index({ deleted_at: 1 });
managedAssetSchema.index({ is_deleted: 1 });
managedAssetSchema.index({ module_id: 1, is_deleted: 1 });

// ─── Virtual ──────────────────────────────────────────────────────────
managedAssetSchema.virtual('is_currently_online').get(function () {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  return this.last_seen >= fifteenMinutesAgo;
});

// ─── Métodos ──────────────────────────────────────────────────────────

/**
 * Soft delete: marca como deletado
 */
managedAssetSchema.methods.softDelete = function (deletedBy) {
  this.deleted_at = new Date();
  this.is_deleted = true;
  if (deletedBy) this.deleted_by = deletedBy;
  return this.save();
};

/**
 * Restaura um ativo deletado
 */
managedAssetSchema.methods.restore = function () {
  this.deleted_at = null;
  this.is_deleted = false;
  this.deleted_by = null;
  return this.save();
};

/**
 * Verifica se foi deletado
 */
managedAssetSchema.methods.isDeleted = function () {
  return this.is_deleted === true;
};

managedAssetSchema.methods.updateLastSeen = function () {
  this.last_seen = new Date();
  return this.save();
};

// ─── Query Helpers ──────────────────────────────────────────────────

/**
 * Escopo para excluir deletados por padrão
 */
managedAssetSchema.query.active = function () {
  return this.where({ is_deleted: false });
};

/**
 * Escopo para incluir apenas deletados
 */
managedAssetSchema.query.deleted = function () {
  return this.where({ is_deleted: true });
};

/**
 * Escopo para incluir todos (com ou sem deletados)
 */
managedAssetSchema.query.withDeleted = function () {
  return this; // Sem filtro
};

module.exports = mongoose.model('ManagedAsset', managedAssetSchema);