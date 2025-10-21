// models/Panel.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schema Mongoose para Painéis/TVs/Monitores, baseado em:
 * - lib/models/asset_module_base.dart (ManagedAsset)
 * - lib/models/painel.dart (Panel)
 */
const PanelSchema = new Schema({
  // --- Campos base de ManagedAsset ---
  asset_name: { type: String, required: true, trim: true },
  asset_type: { type: String, required: true, default: 'panel' },
  serial_number: { type: String, required: true, unique: true, trim: true, sparse: true, default: 'N/A' },
  status: {
    type: String,
    enum: ['online', 'offline', 'maintenance', 'Sem Monitorar'], // Consistente com Device.js
    default: 'offline'
  },
  last_seen: { type: Date, default: Date.now },
  custom_data: { type: Map, of: Schema.Types.Mixed, default: {} },
  location: { type: String, trim: true }, // O cliente deve preencher com o nome mapeado
  assigned_to: { type: String, trim: true },
  unit: { type: String, trim: true, default: 'N/A' },
  sector: { type: String, trim: true, default: 'Desconhecido' },
  floor: { type: String, trim: true, default: 'Desconhecido' },

  // --- Campos específicos de Panel ---
  hostname: { type: String, default: 'N/A', trim: true },
  model: { type: String, default: 'N/A', trim: true },
  manufacturer: { type: String, default: 'N/A', trim: true },
  
  // Especificações de Display
  screen_size: { type: String, default: 'N/A' },
  resolution: { type: String, default: 'N/A' },
  
  // Rede
  ip_address: { type: String, default: 'N/A', trim: true },
  mac_address: { type: String, default: 'N/A', trim: true },
  
  // Sistema
  firmware_version: { type: String, default: 'N/A' },
  is_online: { type: Boolean, default: false },
  
  // Conteúdo
  current_content: { type: String },
  content_last_updated: { type: Date },
  
  // Configurações de Display
  display_settings: { type: Map, of: Schema.Types.Mixed },
  brightness: { type: Number },
  volume: { type: Number },
  
  // Conectividade
  hdmi_input: { type: String },
  
  // Periféricos
  connected_devices: [{ type: String }],

  // --- Campos de Manutenção (para consistência com Device.js) ---
  maintenance_status: { type: Boolean, default: false },
  maintenance_ticket: { type: String, default: '' },
  maintenance_reason: { type: String, default: '' },
  maintenance_history: [{
    timestamp: { type: Date, required: true },
    status: { type: String, required: true },
    ticket: { type: String }
  }]
}, {
  // Adiciona timestamps (createdAt, updatedAt)
  timestamps: true
});

// --- Índices para otimização de busca ---
PanelSchema.index({ asset_name: 1 });
PanelSchema.index({ serial_number: 1 });
PanelSchema.index({ unit: 1 });
PanelSchema.index({ sector: 1, floor: 1 });
PanelSchema.index({ ip_address: 1 });
PanelSchema.index({ mac_address: 1 });
PanelSchema.index({ status: 1 });


const Panel = mongoose.model('Panel', PanelSchema);

module.exports = Panel;