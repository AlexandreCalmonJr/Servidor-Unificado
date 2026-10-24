// models/AssetModuleConfig.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Sub-schema para as colunas da tabela
const TableColumnConfigSchema = new Schema({
  dataKey: { type: String, required: true },
  label: { type: String, required: true }
}, { _id: false });

/**
 * Schema Mongoose para a configuração de Módulos de Ativos
 */
const AssetModuleConfigSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  type: {
    type: String,
    required: true,
    enum: [
      'mobile',
      'totem',
      'desktop',
      'notebook',
      'panel',
      'printer',
      'scanner',
      'custom'
    ]
    // REMOVIDO: unique: true (será definido via index)
  },
  is_active: { type: Boolean, default: true },
  is_custom: { type: Boolean, default: false },
  custom_fields: { type: Map, of: Schema.Types.Mixed, default: {} },
  settings: { type: Map, of: Schema.Types.Mixed, default: {} },

  // Configurações de UI para Clientes
  client_config: {
    icon: { type: String, default: 'box' },
    color: { type: String, default: '#3b82f6' },
    show_on_dashboard: { type: Boolean, default: true },
    tabs: [{ type: String }] // ['info', 'location', 'apps']
  },

  // Flags de Funcionalidade
  feature_flags: {
    allow_remote_control: { type: Boolean, default: false },
    track_location: { type: Boolean, default: true },
    require_auth: { type: Boolean, default: true }
  },

  table_columns: [TableColumnConfigSchema]
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// --- Índices (definidos UMA ÚNICA VEZ) ---
// CORREÇÃO (Item 1): Índice composto único em nome + tipo
AssetModuleConfigSchema.index({ name: 1, type: 1 }, { unique: true, name: 'idx_name_type' });
AssetModuleConfigSchema.index({ is_active: 1 });

const AssetModuleConfig = mongoose.model('AssetModuleConfig', AssetModuleConfigSchema);

module.exports = AssetModuleConfig;