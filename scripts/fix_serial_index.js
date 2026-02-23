#!/usr/bin/env node

/**
 * Script: fix_serial_index.js
 * Propósito: Corrigir índice de serial_number para ser único globalmente
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ManagedAsset = require('../models/ManagedAsset');

const log = (msg, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '✓',
    warn: '⚠',
    error: '✗'
  }[type] || '•';
  console.log(`[${timestamp}] ${prefix} ${msg}`);
};

async function fixSerialIndex() {
  try {
    // Conectar ao banco
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mdm';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    log('Conectado ao MongoDB');

    // Listar índices atuais
    const currentIndexes = await ManagedAsset.collection.getIndexes();
    log('Índices atuais:');
    Object.keys(currentIndexes).forEach(key => {
      console.log(`  - ${key}: ${JSON.stringify(currentIndexes[key])}`);
    });

    // Procurar e remover índice antigo (asset_type + serial_number com unique)
    let oldIndexRemoved = false;
    for (const [name, spec] of Object.entries(currentIndexes)) {
      if (
        spec.key &&
        spec.key.asset_type === 1 &&
        spec.key.serial_number === 1 &&
        spec.unique === true
      ) {
        log(`Removendo índice antigo: ${name}`, 'warn');
        await ManagedAsset.collection.dropIndex(name);
        oldIndexRemoved = true;
        break;
      }
    }

    if (oldIndexRemoved) {
      log('Índice antigo removido');
    } else {
      log('Índice antigo não encontrado (já pode ter sido removido)');
    }

    // Recriar índices
    log('Recriando índices...');
    await ManagedAsset.syncIndexes();
    log('Índices sincronizados');

    // Listar novos índices
    const newIndexes = await ManagedAsset.collection.getIndexes();
    log('Novos índices:');
    Object.keys(newIndexes).forEach(key => {
      console.log(`  - ${key}: ${JSON.stringify(newIndexes[key])}`);
    });

    // Verificar integridade: encontrar serial_numbers duplicados
    const duplicates = await ManagedAsset.aggregate([
      { $group: { _id: '$serial_number', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);

    if (duplicates.length > 0) {
      log(`${duplicates.length} serial numbers duplicados encontrados:`, 'warn');
      duplicates.forEach(dup => {
        console.log(`  - serial_number: ${dup._id} (${dup.count} ocorrências)`);
      });
    } else {
      log('Nenhuma duplicata de serial_number encontrada');
    }

    log('Script concluído com sucesso');
    process.exit(0);
  } catch (error) {
    log(`Erro: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

fixSerialIndex();
