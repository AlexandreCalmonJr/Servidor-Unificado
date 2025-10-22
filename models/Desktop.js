// models/Desktop.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DesktopSchema = new Schema({
  // --- Campos base de ManagedAsset ---
  asset_name: { type: String, required: true, trim: true },
  asset_type: { type: String, required: true, default: 'desktop' },
  serial_number: { 
    type: String, 
    required: true, 
    trim: true, 
    sparse: true, 
    default: 'N/A'
    // REMOVIDO: unique: true (será definido via index abaixo)
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'maintenance', 'Sem Monitorar'],
    default: 'offline'
  },
  last_seen: { type: Date, default: Date.now },
  custom_data: { type: Map, of: Schema.Types.Mixed, default: {} },
  location: { type: String, trim: true },
  assigned_to: { type: String, trim: true },
  unit: { type: String, trim: true, default: 'N/A' },
  sector: { type: String, trim: true, default: 'Desconhecido' },
  floor: { type: String, trim: true, default: 'Desconhecido' },

  // --- Campos específicos de Desktop ---
  hostname: { type: String, default: 'N/A', trim: true },
  model: { type: String, default: 'N/A', trim: true },
  manufacturer: { type: String, default: 'N/A', trim: true },

  // Especificações de Hardware
  processor: { type: String, default: 'N/A' },
  ram: { type: String, default: 'N/A' },
  storage: { type: String, default: 'N/A' },
  storage_type: { type: String, default: 'N/A' },

  // Sistema Operacional
  operating_system: { type: String, default: 'N/A' },
  os_version: { type: String, default: 'N/A' },

  // Rede
  ip_address: { type: String, default: 'N/A', trim: true },
  mac_address: { type: String, default: 'N/A', trim: true },

  // Periféricos
  biometric_reader: { type: String },
  connected_printer: { type: String },

  // Software
  installed_software: [{ type: String }],
  java_version: { type: String },
  browser_version: { type: String },

  // Segurança
  antivirus_status: { type: Boolean, default: false },
  antivirus_version: { type: String },
  last_update_check: { type: Date },

  // Hardware adicional
  hardware_info: { type: Map, of: Schema.Types.Mixed },
  
  // --- Campos de Manutenção ---
  maintenance_status: { type: Boolean, default: false },
  maintenance_ticket: { type: String, default: '' },
  maintenance_reason: { type: String, default: '' },
  maintenance_history: [{
    timestamp: { type: Date, required: true },
    status: { type: String, required: true },
    ticket: { type: String }
  }]
}, {
  timestamps: true
});

// --- Índices (definidos UMA ÚNICA VEZ) ---
DesktopSchema.index({ asset_name: 1 });
DesktopSchema.index({ serial_number: 1 }, { unique: true, sparse: true });
DesktopSchema.index({ unit: 1 });
DesktopSchema.index({ sector: 1, floor: 1 });
DesktopSchema.index({ ip_address: 1 });
DesktopSchema.index({ mac_address: 1 });
DesktopSchema.index({ hostname: 1 });

const Desktop = mongoose.model('Desktop', DesktopSchema);

module.exports = Desktop;