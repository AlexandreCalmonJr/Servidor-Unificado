const mongoose = require('mongoose');

const UnitMappingSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: false },
  ip_range_start: { type: String, required: true, trim: false },
  ip_range_end: { type: String, required: true, trim: false },
  created_at: { type: Date, default: Date.now },
});

const UnitMapping = mongoose.model('UnitMapping', UnitMappingSchema);

module.exports = UnitMapping;