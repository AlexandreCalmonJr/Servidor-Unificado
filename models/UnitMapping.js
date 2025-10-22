const mongoose = require('mongoose');

// Objeto auxiliar para a faixa de IP (não será um modelo separado)
const IpRangeSchema = new mongoose.Schema({
  start: { type: String, required: true, trim: false },
  end: { type: String, required: true, trim: false },
}, { _id: false }); // _id: false para não criar IDs para cada faixa

const UnitMappingSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: false },
  ip_ranges: [IpRangeSchema], 
  
  created_at: { type: Date, default: Date.now },
});

const UnitMapping = mongoose.model('UnitMapping', UnitMappingSchema);

module.exports = UnitMapping;