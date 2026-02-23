#!/usr/bin/env node
/**
 * Verificar módulos e IDs
 */
require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Corrigir path relativo
const AssetModuleConfig = require(path.join(__dirname, '../models/AssetModuleConfig'));

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('\n🔍 Verificando módulos com IDs dos logs:\n');
    
    const ids = [
      '699c756685e5276aa4b3ae70', // Notebooks TI?
      '6998808fe32a08141f6a4cb9', // Totem Module?
      '6998571ae55cf83e82c8010f'  // Desktop TI?
    ];
    
    for (const id of ids) {
      const mod = await AssetModuleConfig.findById(id);
      if (mod) {
        console.log(`✅ ID: ${id}`);
        console.log(`   Name: ${mod.name}`);
        console.log(`   Type: ${mod.type}\n`);
      } else {
        console.log(`❌ ID: ${id} - NÃO ENCONTRADO\n`);
      }
    }
    
    console.log('📦 Todos os módulos no banco:');
    const all = await AssetModuleConfig.find({}, 'name type _id');
    all.forEach(m => console.log(`  - ${m.name} (type: ${m.type}) ID: ${m._id}`));
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
