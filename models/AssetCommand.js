// models/AssetCommand.js
const mongoose = require('mongoose');

const AssetCommandSchema = new mongoose.Schema({
  moduleId: {
    type: String,
    required: true,
    index: true
  },
  assetId: {
    type: String,
    required: true,
    index: true
  },
  serialNumber: {
    type: String,
    required: true,
    index: true
  },
  assetName: {
    type: String,
    required: true
  },
  commandType: {
    type: String,
    required: true,
    enum: [
      'cmd_custom',           // ✅ OBRIGATÓRIO (Era 'custom' antes e dava erro)
      'powershell_custom',
      'map_lpt2',             // ✅ Novo
      'download_file',        // ✅ Novo
      'auto_start_app',       // ✅ Novo
      'restart_computer',
      'flush_dns',
      'restart_print_spooler',
      'restart_automatos',
      'restart_ndd',
      'install_update',
      'clear_temp',
      'check_disk',
      'network_reset',
      'custom_script'
    ]
  },
  command: {
    type: String,
    required: true
  },
  parameters: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  requiresElevation: {
    type: Boolean,
    default: false
  },
  timeout: {
    type: Number,
    default: 60000 // 60 segundos
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'executing', 'completed', 'failed', 'timeout'],
    default: 'pending',
    index: true
  },
  result: {
    stdout: String,
    stderr: String,
    exitCode: Number,
    error: String,
    executionTime: Number
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  sentAt: Date,
  executedAt: Date,
  completedAt: Date,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
  }
});

AssetCommandSchema.index({ serialNumber: 1, status: 1, createdAt: -1 });
AssetCommandSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AssetCommand', AssetCommandSchema);