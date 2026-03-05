const mongoose = require('mongoose');

const printerSupplyItemSchema = new mongoose.Schema({
  module_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssetModuleConfig',
    required: true,
    index: true,
  },
  sku: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ['toner_black', 'imaging_unit', 'maintenance_kit', 'backup_printer', 'other'],
    required: true,
    default: 'other',
    index: true,
  },
  manufacturer: {
    type: String,
    trim: true,
    default: null,
  },
  model_family: {
    type: String,
    trim: true,
    default: null,
  },
  compatible_models: {
    type: [String],
    default: [],
  },
  compatible_manufacturers: {
    type: [String],
    default: [],
  },
  unit_of_measure: {
    type: String,
    trim: true,
    default: 'un',
  },
  quantity_on_hand: {
    type: Number,
    default: 0,
    min: 0,
  },
  min_stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  reorder_point: {
    type: Number,
    default: 0,
    min: 0,
  },
  storage_location: {
    type: String,
    trim: true,
    default: null,
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true,
  },
  notes: {
    type: String,
    default: '',
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

printerSupplyItemSchema.index({ module_id: 1, sku: 1 }, { unique: true, name: 'idx_printer_supply_module_sku_unique' });
printerSupplyItemSchema.index({ module_id: 1, category: 1, is_active: 1 });
printerSupplyItemSchema.index({ module_id: 1, quantity_on_hand: 1, min_stock: 1 });

module.exports = mongoose.model('PrinterSupplyItem', printerSupplyItemSchema);
