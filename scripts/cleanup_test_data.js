// scripts/cleanup_test_data.js
const mongoose = require('mongoose');
require('dotenv').config();

const BSSID = 'AA:BB:CC:DD:EE:FF';

const BssidSchema = new mongoose.Schema({
    mac_address_radio: { type: String }
}, {});
const BssidMapping = mongoose.model('BssidMapping', BssidSchema);

async function cleanup() {
    try {
        console.log('Conectando ao MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mdm');

        console.log(`Removendo BSSID de teste ${BSSID}...`);
        const res = await BssidMapping.deleteOne({ mac_address_radio: BSSID });

        console.log(`✅ Removido(s): ${res.deletedCount}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro no cleanup:', error);
        process.exit(1);
    }
}

cleanup();
