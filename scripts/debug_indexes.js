const mongoose = require('mongoose');
require('dotenv').config();
const ManagedAsset = require('../models/ManagedAsset');

async function debugIndexes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const col = ManagedAsset.collection;
    const indexes = await col.getIndexes();
    
    console.log('Índices com detalhes RAW:');
    Object.entries(indexes).forEach(([name, spec]) => {
      console.log(`\n  ${name}:`);
      console.log(`    ${JSON.stringify(spec, null, 2)}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Erro:', error.message);
    process.exit(1);
  }
}

debugIndexes();
