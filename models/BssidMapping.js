const mongoose = require('mongoose');

const BssidMappingSchema = new mongoose.Schema({
  mac_address_radio: { type: String, required: true, unique: true, trim: false },
  sector: { type: String, required: true, trim: false },
  floor: { type: String, required: true, trim: false },
  // AJUSTE: Adiciona o novo campo ao schema do banco
  unitName: { type: String, trim: false, default: '' }
});

// CORREÇÃO (Item 7): Adicionar middleware pre('save') para normalizar MAC
BssidMappingSchema.pre('save', function(next) {
  // Normaliza apenas se o campo foi modificado ou é novo
  if (this.isModified('mac_address_radio') && this.mac_address_radio) {
    this.mac_address_radio = this.mac_address_radio
      .toUpperCase()
      .replace(/[-\.]/g, ':') // Substitui hifens e pontos por dois-pontos
      .trim();
  }
  next();
});


const BssidMapping = mongoose.model('BssidMapping', BssidMappingSchema);

module.exports = BssidMapping;