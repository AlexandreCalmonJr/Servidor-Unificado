// models/LocationHistory.js
const mongoose = require('mongoose');

const LocationHistorySchema = new mongoose.Schema({
    serial_number: { 
        type: String, 
        required: true, 
        index: true // Index para buscas rápidas
    },
    bssid: { type: String, required: true },
    sector: { type: String, required: true },
    floor: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const LocationHistory = mongoose.model('LocationHistory', LocationHistorySchema);

module.exports = LocationHistory;