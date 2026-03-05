const mongoose = require('mongoose');

const printerSupplyMovementSchema = new mongoose.Schema({
  module_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssetModuleConfig',
    required: true,
    index: true,
  },
  supply_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PrinterSupplyItem',
    required: true,
    index: true,
  },
  printer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ManagedAsset',
    default: null,
    index: true,
  },
  movement_type: {
    type: String,
    enum: ['in', 'out', 'adjustment', 'consumption', 'transfer', 'initial'],
    required: true,
    index: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  quantity_before: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity_after: {
    type: Number,
    required: true,
    min: 0,
  },
  reason: {
    type: String,
    default: '',
  },
  reference: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
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

printerSupplyMovementSchema.index({ module_id: 1, created_at: -1 });
printerSupplyMovementSchema.index({ supply_id: 1, created_at: -1 });
printerSupplyMovementSchema.index({ printer_id: 1, created_at: -1 });

module.exports = mongoose.model('PrinterSupplyMovement', printerSupplyMovementSchema);
