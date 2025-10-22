const mongoose = require('mongoose');

const BssidMappingSchema = new mongoose.Schema({
  mac_address_radio: { type: String, required: true, unique: true, trim: false },
  sector: { type: String, required: true, trim: false },
  floor: { type: String, required: true, trim: false },
  // AJUSTE: Adiciona o novo campo ao schema do banco
  unitName: { type: String, trim: false, default: '' }
});

const BssidMapping = mongoose.model('BssidMapping', BssidMappingSchema);

module.exports = BssidMapping;