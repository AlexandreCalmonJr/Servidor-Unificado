// scripts/seed_test_data.js
const mongoose = require('mongoose');
require('dotenv').config();

const BSSID_MAPPING = {
    mac_address_radio: 'AA:BB:CC:DD:EE:FF',
    unitName: 'Unit Test',
    sector: 'Setor Teste',
    floor: 'Térreo'
};

/*
 * Schema Simplificado para BssidMapping (apenas para seeding)
 */
const BssidSchema = new mongoose.Schema({
    mac_address_radio: { type: String, required: true, unique: true },
    unitName: { type: String },
    sector: { type: String },
    floor: { type: String }
}, {});

const BssidMapping = mongoose.model('BssidMapping', BssidSchema);

async function seed() {
    try {
        console.log('Conectando ao MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mdm');

        console.log('Removendo dados de teste antigos...');
        await BssidMapping.deleteOne({ mac_address_radio: BSSID_MAPPING.mac_address_radio });

        console.log('Inserindo BSSID de teste...');
        await BssidMapping.create(BSSID_MAPPING);

        console.log('✅ BSSID de teste inserido com sucesso!');
        console.log(BSSID_MAPPING);

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro no seed:', error);
        process.exit(1);
    }
}

seed();
