// scripts/cleanupIndexes.js
const mongoose = require('mongoose');
require('dotenv').config();

const cleanupIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    });

    console.log('✅ Conectado ao MongoDB');

    const collections = [
      'desktops',
      'notebooks',
      'panels',
      'printers',
      'assetmoduleconfigs' // Adicionada coleção de configs
    ];

    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);

        // Verifica se a coleção existe
        const collectionExists = await mongoose.connection.db.listCollections({ name: collectionName }).hasNext();

        if (!collectionExists) {
          console.log(`⏭️  Coleção '${collectionName}' não existe, pulando...`);
          continue;
        }

        console.log(`\n--- Limpando índices de [${collectionName}] ---`);
        const indexes = await collection.indexes();
        console.log(`Índices atuais: ${indexes.map(i => i.name).join(', ')}`);

        // Remove todos os índices exceto o _id
        for (const index of indexes) {
          if (index.name !== '_id_') {
            await collection.dropIndex(index.name);
            console.log(`🧹 Índice removido: ${index.name}`);
          }
        }

      } catch (error) {
        console.log(`⚠️  Erro ao limpar índices de ${collectionName}: ${error.message}`);
      }
    }

    console.log('\n✨ Limpeza concluída! Reinicie o servidor para recriar os índices corretamente.');


  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

cleanupIndexes();