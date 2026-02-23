// File: models/ManagedAsset.js
const mongoose = require('mongoose');

const managedAssetSchema = new mongoose.Schema({
  module_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssetModule',
    required: false,   // ← CORRIGIDO: agentes não conhecem o ObjectId; auto-injetado pela route
    default: null,
  },
  asset_name: {
    type: String,
    required: true,
    trim: true
  },
  asset_type: {
    type: String,
    required: true,
    // Tipos suportados pelos módulos dos dois clientes:
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
  // Localização resolvida pelo locationService
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
  mac_address_radio: String,   // BSSID do Wi-Fi (notebook/totem)
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

  // ─── Dados customizados (qualquer tipo de ativo) ──────────────────
  custom_data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // ─── Provisionamento ──────────────────────────────────────────────
  provisioning_status: { type: String, default: null },

  // ─── Metadados ────────────────────────────────────────────────────
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// ─── Índices ──────────────────────────────────────────────────────────
managedAssetSchema.index({ module_id: 1, status: 1 });
// ÚNICO globalmente por serial_number — evita duplicatas mesmo em módulos distintos
managedAssetSchema.index({ serial_number: 1 }, { unique: true });
managedAssetSchema.index({ asset_type: 1, serial_number: 1 });  // busca composta rápida
managedAssetSchema.index({ last_seen: -1 });
managedAssetSchema.index({ location: 1 });
managedAssetSchema.index({ asset_name: 'text', serial_number: 'text' });

// ─── Virtual ──────────────────────────────────────────────────────────
managedAssetSchema.virtual('is_currently_online').get(function () {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  return this.last_seen >= fifteenMinutesAgo;
});

managedAssetSchema.methods.updateLastSeen = function () {
  this.last_seen = new Date();
  return this.save();
};

module.exports = mongoose.model('ManagedAsset', managedAssetSchema);
