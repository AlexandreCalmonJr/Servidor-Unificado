// ===================================================================

// File: models/ManagedAsset.js
const mongoose = require('mongoose');

const managedAssetSchema = new mongoose.Schema({
  module_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssetModule',
    required: true
  },
  asset_name: {
    type: String,
    required: true,
    trim: true
  },
  asset_type: {
    type: String,
    required: true
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
  assigned_to: {
    type: String,
    trim: true
  },
  
  // Campos específicos para diferentes tipos de ativos
  // Desktop/Notebook
  hostname: String,
  model: String,
  manufacturer: String,
  processor: String,
  ram: String,
  storage: String,
  operating_system: String,
  os_version: String,
  ip_address: String,
  mac_address: String,
  installed_software: [String],
  antivirus_status: Boolean,
  antivirus_version: String,
  last_update_check: Date,
  hardware_info: mongoose.Schema.Types.Mixed,
  
  // Específico para Notebook
  battery_level: Number,
  battery_health: String,
  is_encrypted: Boolean,
  
  // Específico para Painéis/TVs
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
  
  // Campos customizados (flexível para qualquer tipo de ativo)
  custom_data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Metadados
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Índices compostos para melhorar performance
managedAssetSchema.index({ module_id: 1, status: 1 });
managedAssetSchema.index({ module_id: 1, serial_number: 1 }, { unique: true });
managedAssetSchema.index({ last_seen: -1 });
managedAssetSchema.index({ location: 1 });
managedAssetSchema.index({ asset_name: 'text', serial_number: 'text' });

// Virtual para verificar se o ativo está online (última conexão nas últimas 15 minutos)
managedAssetSchema.virtual('is_currently_online').get(function() {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  return this.last_seen >= fifteenMinutesAgo;
});

// Método para atualizar o last_seen automaticamente
managedAssetSchema.methods.updateLastSeen = function() {
  this.last_seen = new Date();
  return this.save();
};

module.exports = mongoose.model('ManagedAsset', managedAssetSchema);