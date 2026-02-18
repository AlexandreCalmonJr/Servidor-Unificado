// models/Device.js
const mongoose = require('mongoose');

// ===================================================================
// OPÇÕES DO SCHEMA
// ===================================================================
const options = {
  discriminatorKey: 'device_type', // O campo que define o tipo (mobile, desktop, etc.)
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'devices', // Nome da coleção unificada
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
};

// ===================================================================
// SCHEMA BASE (Campos Comuns a TODOS os dispositivos)
// ===================================================================
const DeviceSchema = new mongoose.Schema({
  // Identificação
  serial_number: { type: String, required: true, unique: true, trim: true },
  asset_name: { type: String, required: true, trim: true }, // Antigo hostname/device_name
  asset_tag: { type: String, trim: true }, // Etiqueta de patrimônio

  // Conectividade
  ip_address: { type: String, trim: true, default: 'N/A' },
  mac_address: { type: String, trim: true, default: 'N/A' },

  // Status e Monitoramento
  status: {
    type: String,
    enum: ['online', 'offline', 'maintenance', 'retired', 'unknown'],
    default: 'offline'
  },
  last_seen: { type: Date, default: Date.now },

  // Localização (Unificada)
  unit: { type: String, trim: true, default: 'N/A' },
  sector: { type: String, trim: true, default: 'Desconhecido' },
  floor: { type: String, trim: true, default: 'Desconhecido' },
  location_description: { type: String, trim: true }, // Antigo 'location' livre

  // Manutenção
  maintenance_status: { type: Boolean, default: false },
  maintenance_ticket: { type: String, default: '' },
  maintenance_reason: { type: String, default: '' },
  maintenance_history: [{
    timestamp: { type: Date, required: true },
    status: { type: String, required: true },
    ticket: { type: String },
    technician: { type: String }
  }],

  // Metadados do Sistema
  enrolled_at: { type: Date, default: Date.now },
  updated_by: { type: String }, // Usuário/Agente que atualizou

  // Configurações Flexíveis
  custom_data: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }

}, options);

// Índices Globais
DeviceSchema.index({ serial_number: 1 }); // Já é unique, mas reforça
DeviceSchema.index({ asset_name: 1 });
DeviceSchema.index({ ip_address: 1 });
DeviceSchema.index({ unit: 1, sector: 1 });
DeviceSchema.index({ last_seen: -1 });
DeviceSchema.index({ device_type: 1, status: 1 }); // Para filtrar "Todos os Notebooks Offline"

// ===================================================================
// DISCRIMINATORS (Tipos Específicos)
// ===================================================================

const Device = mongoose.model('Device', DeviceSchema);

// --- 1. MOBILE (Android/iOS) ---
const Mobile = Device.discriminator('mobile', new mongoose.Schema({
  imei: { type: String, trim: true, sparse: true }, // Unique apenas se existir
  android_id: { type: String, trim: true },
  battery_level: { type: Number, min: 0, max: 100 },
  is_kiosk_mode: { type: Boolean, default: false },
  app_version: { type: String },
  model: { type: String },
  manufacturer: { type: String },
  os_version: { type: String }
}));

// --- 2. DESKTOP & NOTEBOOK (Computadores) ---
// Campos compartilhados por PCs
const ComputerFields = {
  hostname: { type: String, trim: true }, // Pode ser redundante com asset_name, mas mantemos para compatibilidade
  model: { type: String },
  manufacturer: { type: String },
  processor: { type: String },
  ram: { type: String },
  storage: { type: String },
  operating_system: { type: String },
  os_version: { type: String },
  antivirus_status: { type: Boolean },
  antivirus_version: { type: String },
  current_user: { type: String },
  installed_software: [String]
};

const Desktop = Device.discriminator('desktop', new mongoose.Schema({
  ...ComputerFields,
  monitor_count: { type: Number, default: 1 }
}));

const Notebook = Device.discriminator('notebook', new mongoose.Schema({
  ...ComputerFields,
  battery_level: { type: Number, min: 0, max: 100 },
  battery_health: { type: String }, // Good, Poor, Replace
  is_lid_closed: { type: Boolean }
}));

// --- 3. TOTEM (Autoatendimento) ---
const Totem = Device.discriminator('totem', new mongoose.Schema({
  hostname: { type: String },
  kiosk_software_version: { type: String },
  printer_status: { type: String }, // Status da impressora térmica interna
  paper_status: { type: String },   // OK, Low, Empty
  peripherals_status: {
    scanner: { type: Boolean },
    pinpad: { type: Boolean },
    touchscreen: { type: Boolean }
  }
}));

// --- 4. PRINTER (Impressoras de Rede) ---
const Printer = Device.discriminator('printer', new mongoose.Schema({
  model: { type: String },
  manufacturer: { type: String },
  toner_level: { type: Number, min: 0, max: 100 },
  page_count_total: { type: Number },
  page_count_color: { type: Number },
  page_count_bw: { type: Number },
  is_color: { type: Boolean, default: false },
  supplies: [{
    name: String, // ex: "Cyan Toner"
    level: Number,
    type: String  // toner, drum, fuser
  }]
}));

// --- 5. PANEL (TVs e Dashboards) ---
const Panel = Device.discriminator('panel', new mongoose.Schema({
  screen_size: { type: String },
  resolution: { type: String },
  brightness: { type: Number },
  volume: { type: Number },
  hdmi_input: { type: String },
  current_content: { type: String }, // URL ou nome do dashboard exibido
  is_tv_on: { type: Boolean }
}));

// --- 6. SCANNER (Coletores de Dados) ---
const Scanner = Device.discriminator('scanner', new mongoose.Schema({
  model: { type: String },
  battery_level: { type: Number },
  wlan_ip: { type: String },
  firmware_version: { type: String }
}));

// --- 7. CUSTOM (Outros) ---
const Custom = Device.discriminator('custom', new mongoose.Schema({
  // Usa schema livre via 'custom_data'
  device_category: { type: String } // ex: "Camera", "Sensor"
}));


module.exports = {
  Device,
  Mobile,
  Desktop,
  Notebook,
  Totem,
  Printer,
  Panel,
  Scanner,
  Custom
};