// models/Notebook.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schema Mongoose para Notebooks, baseado em:
 * - lib/models/asset_module_base.dart (ManagedAsset)
 * - lib/models/notebook.dart (Notebook)
 */
const NotebookSchema = new Schema({
  // --- Campos base de ManagedAsset ---
  asset_name: { type: String, required: true, trim: true },
  asset_type: { type: String, required: true, default: 'notebook' },
  serial_number: { type: String, required: true, unique: true, trim: true, sparse: true, default: 'N/A' },
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
  
  // --- Campos específicos de Notebook ---
  hostname: { type: String, default: 'N/A', trim: true },
  model: { type: String, default: 'N/A', trim: true },
  manufacturer: { type: String, default: 'N/A', trim: true },
  
  // Hardware
  processor: { type: String, default: 'N/A' },
  ram: { type: String, default: 'N/A' },
  storage: { type: String, default: 'N/A' },
  
  // Sistema
  operating_system: { type: String, default: 'N/A' },
  os_version: { type: String, default: 'N/A' },
  
  // Rede
  ip_address: { type: String, default: 'N/A', trim: true },
  mac_address: { type: String, default: 'N/A', trim: true },
  
  // Bateria
  battery_level: { type: Number },
  battery_health: { type: String },
  
  // Software e Segurança
  installed_software: [{ type: String }],
  antivirus_status: { type: Boolean, default: false },
  antivirus_version: { type: String },
  last_update_check: { type: Date },
  hardware_info: { type: Map, of: Schema.Types.Mixed },
  is_encrypted: { type: Boolean, default: false },

  // --- Campos de Manutenção (para consistência) ---
  maintenance_status: { type: Boolean, default: false },
  maintenance_ticket: { type: String, default: '' },
  maintenance_reason: { type: String, default: '' },
  maintenance_history: [{
    timestamp: { type: Date, required: true },
    status: { type: String, required: true },
    ticket: { type: String }
  }]
}, {
  timestamps: true // Adiciona createdAt e updatedAt
});

// --- Índices ---
NotebookSchema.index({ asset_name: 1 });
NotebookSchema.index({ serial_number: 1 });
NotebookSchema.index({ unit: 1 });
NotebookSchema.index({ assigned_to: 1 });
NotebookSchema.index({ mac_address: 1 });
NotebookSchema.index({ hostname: 1 });

const Notebook = mongoose.model('Notebook', NotebookSchema);

module.exports = Notebook;