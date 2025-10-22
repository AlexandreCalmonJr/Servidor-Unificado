// models/Printer.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PrinterSchema = new Schema({
  // --- Campos base de ManagedAsset ---
  asset_name: { type: String, required: true, trim: true },
  asset_type: { type: String, required: true, default: 'printer' },
  serial_number: { 
    type: String, 
    required: true, 
    trim: true, 
    sparse: true, 
    default: 'N/A'
    // REMOVIDO: unique: true
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

  // --- Campos específicos de Printer ---
  hostname: { type: String, default: 'N/A', trim: true },
  model: { type: String, default: 'N/A', trim: true },
  manufacturer: { type: String, default: 'N/A', trim: true },

  // Conectividade
  ip_address: { type: String, trim: true },
  mac_address: { type: String, trim: true },
  connection_type: { type: String, default: 'network' },
  usb_port: { type: String },

  // Status operacional
  printer_status: { type: String, default: 'unknown' },
  error_message: { type: String },

  // Contadores
  total_page_count: { type: Number },
  color_page_count: { type: Number },
  black_white_page_count: { type: Number },

  // Consumíveis
  toner_levels: { type: Map, of: Schema.Types.Mixed },
  paper_level: { type: Number },

  // Capacidades
  is_duplex: { type: Boolean },
  is_color: { type: Boolean },
  supported_paper_sizes: [{ type: String }],

  // Computador host (para impressoras USB)
  host_computer_name: { type: String },
  host_computer_ip: { type: String },

  // Firmware e drivers
  firmware_version: { type: String },
  driver_version: { type: String },

  // Manutenção
  last_maintenance_date: { type: Date },
  maintenance_info: { type: Map, of: Schema.Types.Mixed },

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
PrinterSchema.index({ asset_name: 1 });
PrinterSchema.index({ serial_number: 1 }, { unique: true, sparse: true });
PrinterSchema.index({ unit: 1 });
PrinterSchema.index({ ip_address: 1 });
PrinterSchema.index({ mac_address: 1 });
PrinterSchema.index({ host_computer_name: 1 });

const Printer = mongoose.model('Printer', PrinterSchema);

module.exports = Printer;