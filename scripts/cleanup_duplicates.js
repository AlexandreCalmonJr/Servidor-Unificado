const mongoose = require('mongoose');
require('dotenv').config();
const ManagedAsset = require('../models/ManagedAsset');

async function cleanupDuplicates() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Conectado ao MongoDB');

    // Encontrar serial_numbers com múltiplas ocorrências
    const duplicates = await ManagedAsset.aggregate([
      { $group: { _id: '$serial_number', count: { $sum: 1 }, ids: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]);

    if (duplicates.length === 0) {
      console.log('✓ Nenhuma duplicata encontrada');
      process.exit(0);
    }

    console.log(`\n⚠ ${duplicates.length} serial_numbers com duplicatas encontrados:\n`);

    for (const dup of duplicates) {
      const { _id: serialNumber, count, ids } = dup;
      console.log(`Serial: ${serialNumber} (${count} ocorrências)`);
      
      // Buscar os docs para mostrar
      const docs = await ManagedAsset.find({ _id: { $in: ids } }).select('_id serial_number asset_type asset_name module_id');
      docs.forEach(doc => {
        console.log(`  - ${doc._id}: ${doc.asset_type} (${doc.asset_name})`);
      });

      // Manter o primeiro, remover os outros
      const toDelete = ids.slice(1);
      await ManagedAsset.deleteMany({ _id: { $in: toDelete } });
      console.log(`  ✓ Removidas ${toDelete.length} duplicatas\n`);
    }

    console.log('✓ Limpeza concluída com sucesso');
    process.exit(0);
  } catch (error) {
    console.error('✗ Erro:', error.message);
    process.exit(1);
  }
}

cleanupDuplicates();
