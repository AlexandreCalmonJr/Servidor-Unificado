// scripts/verify_migration.js
const mongoose = require('mongoose');
require('dotenv').config();
const { Device } = require('../models/Device');

async function verify() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado ao MongoDB');

        const devices = await Device.find({});
        console.log(`📊 Total de Dispositivos na nova coleção: ${devices.length}`);

        devices.forEach(d => {
            console.log(`- [${d.device_type.toUpperCase()}] Serial: ${d.serial_number} | IP: ${d.ip_address} | Unit: ${d.unit}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

verify();
