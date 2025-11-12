// models/LocationHistory.js
const mongoose = require('mongoose');

const LocationHistorySchema = new mongoose.Schema({
    serial_number: { 
        type: String, 
        required: true,
        // CORREÇÃO (Item 12): Removido índice simples, será coberto pelo composto
    },
    bssid: { type: String, required: true },
    sector: { type: String, required: true },
    floor: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

// CORREÇÃO (Item 12): Adicionar índice composto para performance
LocationHistorySchema.index({ serial_number: 1, timestamp: -1 });

const LocationHistory = mongoose.model('LocationHistory', LocationHistorySchema);

module.exports = LocationHistory;