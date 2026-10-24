// models/SavedFilter.js
const mongoose = require('mongoose');

const SavedFilterSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  moduleId: { 
    type: String, 
    required: true 
  },
  filterName: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String,
    default: ''
  },
  filterData: {
    searchTerm: { type: String, default: '' },
    statusFilter: { type: String, default: 'all' },
    sortBy: { type: String, default: 'name' },
    sortOrder: { type: String, enum: ['asc', 'desc'], default: 'asc' },
    pageSize: { type: Number, default: 10 },
    customFilters: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  isDefault: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
});

// Índices para performance
SavedFilterSchema.index({ userId: 1, moduleId: 1 });
SavedFilterSchema.index({ userId: 1, isDefault: 1 });

const SavedFilter = mongoose.model('SavedFilter', SavedFilterSchema);

module.exports = SavedFilter;
