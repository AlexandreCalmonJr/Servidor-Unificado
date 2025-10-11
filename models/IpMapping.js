// Ficheiro: models/IpMapping.js
// Descrição: Modelo para mapeamento de faixas de IP para localizações.

const mongoose = require('mongoose');

const ipMappingSchema = new mongoose.Schema({
  location: {
    type: String,
    required: true,
    trim: true,
  },
  ipStart: {
    type: String,
    required: true,
    trim: true,
  },
  ipEnd: {
    type: String,
    required: true,
    trim: true,
  },
});

ipMappingSchema.index({ location: 1 }, { unique: true });

const IpMapping = mongoose.model('IpMapping', ipMappingSchema);

module.exports = IpMapping;