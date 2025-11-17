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
      'cmd_custom',           // Comando CMD personalizado
      'powershell_custom',    // Comando PowerShell personalizado
      'restart_computer',     // Reiniciar computador
      'flush_dns',           // Limpar cache DNS
      'restart_print_spooler', // Reiniciar serviço de impressão
      'restart_automatos',    // Reiniciar serviços Automatos
      'restart_ndd',         // Reiniciar NDD Print
      'install_update',      // Instalar atualizações
      'clear_temp',          // Limpar arquivos temporários
      'check_disk',          // Verificar disco
      'network_reset',       // Resetar configurações de rede
      'custom_script'        // Script customizado
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
    executionTime: Number // em ms
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  sentAt: Date,
  executedAt: Date,
  completedAt: Date,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
    index: true
  }
});

// Índice composto para buscas eficientes
AssetCommandSchema.index({ serialNumber: 1, status: 1, createdAt: -1 });
AssetCommandSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

module.exports = mongoose.model('AssetCommand', AssetCommandSchema);