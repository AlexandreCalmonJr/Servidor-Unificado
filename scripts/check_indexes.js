const mongoose = require('mongoose');
require('dotenv').config();
const ManagedAsset = require('../models/ManagedAsset');

async function checkIndexes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const indexes = await ManagedAsset.collection.getIndexes();
    
    console.log('Índices:');
    Object.entries(indexes).forEach(([name, spec]) => {
      console.log(`  ${name}:`);
      console.log(`    - unique: ${spec.unique || false}`);
      console.log(`    - fields: ${JSON.stringify(spec.key)}`);
    });
    
    // Verificar se serial_number tem unique: true
    const serialIndex = indexes.serial_number_1;
    if (serialIndex && serialIndex.unique) {
      console.log('\n✓ serial_number_1 está UNIQUE');
    } else {
      console.log('\n✗ serial_number_1 NÃO está unique');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

checkIndexes();
