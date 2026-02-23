const mongoose = require('mongoose');
require('dotenv').config();
const ManagedAsset = require('../models/ManagedAsset');

async function checkIndexesProper() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const col = ManagedAsset.collection;
    const indexes = await col.listIndexes().toArray();
    
    console.log('Índices com opções:');
    indexes.forEach(idx => {
      console.log(`\n${idx.name}:`);
      console.log(`  unique: ${idx.unique || false}`);
      console.log(`  key: ${JSON.stringify(idx.key)}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Erro:', error.message);
    process.exit(1);
  }
}

checkIndexesProper();
