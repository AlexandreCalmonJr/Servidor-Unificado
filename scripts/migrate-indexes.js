const mongoose = require('mongoose');

async function migrateIndexes() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const collections = [
    { name: 'desktops', model: 'Desktop' },
    { name: 'notebooks', model: 'Notebook' },
    { name: 'panels', model: 'Panel' },
    { name: 'printers', model: 'Printer' },
  ];

  for (const col of collections) {
    console.log(`\n🔧 Migrando ${col.name}...`);
    
    try {
      // Remove índice antigo
      await mongoose.connection.db.collection(col.name).dropIndex('serial_number_1');
      console.log(`   ✅ Índice antigo removido`);
    } catch (e) {
      console.log(`   ⚠️ Índice antigo não existe`);
    }
    
    // Cria novo índice composto
    await mongoose.connection.db.collection(col.name).createIndex(
      { serial_number: 1, asset_type: 1 },
      { unique: true, sparse: true, name: `idx_${col.name}_serial_type` }
    );
    console.log(`   ✅ Novo índice criado`);
  }

  console.log('\n✅ Migração concluída!\n');
  await mongoose.disconnect();
}