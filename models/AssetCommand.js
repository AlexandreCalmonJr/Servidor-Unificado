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
      // ── Comandos Desktop / Notebook ──────────────────────────────
      'cmd_custom',
      'powershell_custom',
      'custom_script',
      'map_lpt2',
      'download_file',
      'auto_start_app',
      'restart_computer',
      'flush_dns',
      'restart_print_spooler',
      'restart_automatos',
      'restart_ndd',
      'install_update',
      'clear_temp',
      'check_disk',
      'network_reset',

      // ── Comandos Mobile / Multiplataforma ────────────────────────
      'reboot_device',      // reiniciar dispositivo (mobile + desktop)
      'lock_device',        // bloquear dispositivo
      'wipe_data',          // limpar dados
      'send_message',       // exibir mensagem (alias: show_message)
      'push_message',       // enviar mensagem remota
      'show_message',       // exibir alerta
      'install_apk',        // instalar APK (mobile)
      'install_app',        // instalar aplicativo (alias install_apk)
      'restrict_settings',  // restringir configurações
      'restart_app',        // reiniciar aplicativo mobile
      'reboot',             // reboot (alias: reboot_device)

      // ── Comandos Kiosk / Launcher (mobile) ───────────────────────
      'enable_kiosk',
      'start_kiosk',
      'disable_kiosk',
      'stop_kiosk',
      'set_default_launcher',
      'update_allowed_apps', // atualizar lista de apps permitidos
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
    default: 60000
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
