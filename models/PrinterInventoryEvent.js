const mongoose = require('mongoose');

const printerInventoryEventSchema = new mongoose.Schema({
  module_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssetModuleConfig',
    required: true,
    index: true,
  },
  printer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ManagedAsset',
    default: null,
    index: true,
  },
  event_type: {
    type: String,
    enum: ['stock_adjustment', 'toner_replacement', 'imaging_replacement', 'maintenance', 'alert'],
    required: true,
    index: true,
  },
  item_type: {
    type: String,
    enum: ['toner_black', 'imaging_unit', 'backup_printer', 'other'],
    default: 'other',
  },
  quantity_delta: {
    type: Number,
    default: 0,
  },
  quantity_after: {
    type: Number,
    default: null,
  },
  reason: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false },
});

printerInventoryEventSchema.index({ module_id: 1, created_at: -1 });
printerInventoryEventSchema.index({ printer_id: 1, created_at: -1 });

module.exports = mongoose.model('PrinterInventoryEvent', printerInventoryEventSchema);
