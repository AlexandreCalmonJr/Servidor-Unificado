// models/Notebook.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotebookSchema = new Schema({
  // ===== CAMPOS BASE =====
  asset_name: { type: String, required: true, trim: true },
  serial_number: { type: String, required: true, unique: true, trim: true },
  status: {
    type: String,
    enum: ['online', 'offline', 'maintenance', 'retired'],
    default: 'offline'
  },
  last_seen: { type: Date, default: Date.now },

  // ===== LOCALIZAÇÃO =====
  unit: { type: String, default: 'N/A' },
  sector: { type: String, default: 'Desconhecido' },
  floor: { type: String, default: 'Desconhecido' },
  location: { type: String, default: 'N/A' }, // Campo legado
  assigned_to: { type: String, default: null },

  // ===== IDENTIFICAÇÃO =====
  hostname: { type: String, required: true, trim: true },
  model: { type: String, default: 'N/A' },
  manufacturer: { type: String, default: 'N/A' },

  // ===== HARDWARE =====
  processor: { type: String, default: 'N/A' },
  ram: { type: String, default: 'N/A' },
  storage: { type: String, default: 'N/A' },
  storage_type: { type: String, default: 'N/A' },

  // ===== SISTEMA OPERACIONAL =====
  operating_system: { type: String, default: 'N/A' },
  os_version: { type: String, default: 'N/A' },

  // ===== REDE =====
  ip_address: { type: String, default: 'N/A' },
  mac_address: { type: String, default: 'N/A' },
  mac_address_radio: { type: String, default: 'N/A' }, // BSSID para WiFi
  wifi_ssid: { type: String, default: 'N/A' },
  connection_type: { type: String, default: 'Desconhecido' },

  // ===== USUÁRIO E TEMPO (CRÍTICOS) =====
  current_user: { type: String, default: 'N/A' },
  uptime: { type: String, default: 'N/A' },
  updated_at: { type: Date, default: Date.now },

  // ===== PERIFÉRICOS =====
  biometric_reader: { type: String, default: 'N/A' },
  connected_printer: { type: String, default: 'N/A' },

  // ===== SOFTWARE =====
  java_version: { type: String, default: 'N/A' },
  browser_version: { type: String, default: 'N/A' },
  installed_software: { type: [String], default: [] },

  // ===== SEGURANÇA =====
  antivirus_status: { type: Boolean, default: false },
  antivirus_version: { type: String, default: 'N/A' },
  is_encrypted: { type: Boolean, default: false },
  last_update_check: { type: Date, default: null },
  battery_level: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  battery_health: {
    type: String,
    enum: ['Good', 'Fair', 'Poor', 'Replace', 'N/A'],
    default: 'N/A'
  },
  // ===== DADOS CUSTOMIZADOS =====
  custom_data: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },

  // ===== HARDWARE INFO (Opcional) =====
  hardware_info: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true, // Adiciona createdAt e updatedAt automaticamente
  collection: 'desktops'
});

// --- Índices ---
NotebookSchema.index({ serial_number: 1, asset_type: 1 }, {
  unique: true,
  sparse: true,
  name: 'idx_notebook_serial_type'
});
NotebookSchema.index({ asset_name: 1 });
NotebookSchema.index({ unit: 1 });
NotebookSchema.index({ assigned_to: 1 });
NotebookSchema.index({ mac_address: 1 });
NotebookSchema.index({ hostname: 1 });

const Notebook = mongoose.model('Notebook', NotebookSchema);

module.exports = Notebook;