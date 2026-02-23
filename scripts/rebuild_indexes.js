const mongoose = require('mongoose');
require('dotenv').config();
const ManagedAsset = require('../models/ManagedAsset');

async function rebuildSerialIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('Removendo todos os índices...');
    await ManagedAsset.collection.dropIndexes();
    
    console.log('Recriando índices do schema...');
    await ManagedAsset.collection.createIndexes([
      { key: { serial_number: 1 }, unique: true, name: 'serial_number_unique' },
      { key: { module_id: 1, status: 1 } },
      { key: { asset_type: 1, serial_number: 1 } },
      { key: { last_seen: -1 } },
      { key: { location: 1 } },
      { key: { asset_name: 'text', serial_number: 'text' } }
    ]);
    
    console.log('✓ Índices recriados');
    
    // Verificar
    const indexes = await ManagedAsset.collection.getIndexes();
    console.log('\nNovos índices:');
    Object.entries(indexes).forEach(([name, spec]) => {
      console.log(`  ${name}: unique=${spec.unique || false}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Erro:', error.message);
    process.exit(1);
  }
}

rebuildSerialIndex();
