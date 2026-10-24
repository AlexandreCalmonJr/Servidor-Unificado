// File: models/AssetModule.js
const mongoose = require('mongoose');

const assetModuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    required: true,
    enum: ['mobile', 'totem', 'desktop', 'notebook', 'panel', 'printer', 'scanner', 'custom'],
    default: 'custom'
  },
  is_active: {
    type: Boolean,
    default: true
  },
  is_custom: {
    type: Boolean,
    default: false
  },
  custom_fields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  settings: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Índices para melhorar performance
assetModuleSchema.index({ type: 1, is_active: 1 });

module.exports = mongoose.model('AssetModule', assetModuleSchema, 'assetmodules');
