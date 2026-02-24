/**
 * scripts/migrateSoftDelete.js
 * Adiciona campos de soft delete aos ativos existentes
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function migrateSoftDelete() {
  try {
    console.log('🔄 Iniciando migração de soft delete...');

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado ao MongoDB');

    // Obter todos os modelos de ativo
    const models = [
      require('../models/Desktop'),
      require('../models/Notebook'),
      require('../models/Totem'),
      require('../models/Panel'),
      require('../models/Printer'),
      require('../models/ManagedAsset'),
    ];

    let totalUpdated = 0;

    for (const Model of models) {
      try {
        // Atualizar todos os documentos que não têm deleted_at
        const result = await Model.updateMany(
          { deleted_at: { $exists: false } },
          {
            $set: {
              deleted_at: null,
              is_deleted: false,
              deleted_by: null,
            }
          }
        );

        console.log(`✅ ${Model.modelName}: ${result.modifiedCount} documentos atualizados`);
        totalUpdated += result.modifiedCount;
      } catch (err) {
        console.warn(`⚠️ ${Model.modelName} não encontrado ou erro: ${err.message}`);
      }
    }

    console.log(`\n✅ Migração concluída: ${totalUpdated} documentos atualizados`);
    
    // Criar índices
    console.log('\n🔨 Criando índices...');
    
    for (const Model of models) {
      try {
        await Model.collection.createIndex({ deleted_at: 1 });
        await Model.collection.createIndex({ is_deleted: 1 });
        await Model.collection.createIndex({ module_id: 1, is_deleted: 1 });
        console.log(`✅ Índices criados para ${Model.modelName}`);
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.warn(`⚠️ Erro ao criar índices em ${Model.modelName}: ${err.message}`);
        }
      }
    }

    console.log('\n🎉 Migração finalizada com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    process.exit(1);
  }
}

// Executar
migrateSoftDelete();
