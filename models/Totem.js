// Ficheiro: models/Totem.js
// Descrição: Modelo para os dispositivos de monitoramento (totens, PCs).
// Antigo Device.js do servidor de monitoramento.

const mongoose = require('mongoose');
const unitRoutes = require('../routes/unitRoutes');

const totemSchema = new mongoose.Schema({
  hostname: { type: String, required: true },
  serialNumber: { type: String, required: true, unique: true },
  model: { type: String, default: 'N/A' },
  serviceTag: { type: String, default: 'N/A' },
  ip: { type: String, default: 'N/A' },
  unitRoutes: { type: String, default: 'Desconhecida' },
  installedPrograms: { type: [String], default: [] },
  printerStatus: { type: String, default: 'N/A' },
  lastSeen: { type: Date, default: Date.now },
  biometricReaderStatus: { type: String, default: 'N/A' },
  zebraStatus: { type: String, default: 'N/A' },
  bematechStatus: { type: String, default: 'N/A' },
  totemType: { type: String, default: 'N/A' },
  ram: { type: String, default: 'N/A' },
  hdType: { type: String, default: 'N/A' },
  hdStorage: { type: String, default: 'N/A' },
}, {
  versionKey: false
});

totemSchema.index({ lastSeen: -1 });

const Totem = mongoose.model('Totem', totemSchema);

module.exports = Totem;