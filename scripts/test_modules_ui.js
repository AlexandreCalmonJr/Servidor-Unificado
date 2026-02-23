#!/usr/bin/env node
/**
 * test_modules_ui.js
 * Testa a interface de módulos e mostra visualmente o status
 */

require('dotenv').config();
const mongoose = require('mongoose');
const AssetModuleConfig = require('./models/AssetModuleConfig');
const ManagedAsset = require('./models/ManagedAsset');

async function testModulesUI() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TESTE: Interface de Módulos');
    console.log('='.repeat(70) + '\n');

    // Conectar ao banco
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado ao MongoDB\n');

    // 1️⃣ Listar módulos
    console.log('📦 MÓDULOS NO BANCO:');
    console.log('-'.repeat(70));
    
    const modules = await AssetModuleConfig.find({}, 'name type is_active _id');
    
    if (modules.length === 0) {
      console.log('❌ Nenhum módulo encontrado!');
      process.exit(1);
    }

    for (const mod of modules) {
      // Contar ativos
      const assetCount = await ManagedAsset.countDocuments({ 
        module_id: mod._id 
      });

      const status = mod.is_active ? '🟢' : '🔴';
      const icon = {
        'mobile': '📱',
        'totem': '🖥️',
        'desktop': '🖥️',
        'notebook': '💻',
        'panel': '📺',
        'printer': '🖨️',
        'scanner': '📠',
        'custom': '⚙️'
      }[mod.type] || '📦';

      console.log(`
${icon} ${mod.name}
   ├─ ID: ${mod._id}
   ├─ Tipo: ${mod.type}
   ├─ Ativos: ${assetCount}
   └─ Status: ${status} ${mod.is_active ? 'Ativo' : 'Inativo'}`);
    }

    console.log('\n' + '-'.repeat(70));
    console.log(`✅ Total: ${modules.length} módulo(s)\n`);

    // 2️⃣ Verificar dados específicos
    console.log('🔍 VERIFICAÇÃO DE DADOS:');
    console.log('-'.repeat(70));

    const notebookMod = modules.find(m => m.type === 'notebook');
    const totemMod = modules.find(m => m.type === 'totem');
    const desktopMod = modules.find(m => m.type === 'desktop');

    console.log(`
✅ Notebooks TI: ${notebookMod ? '🟢 Encontrado' : '❌ NÃO encontrado'}
✅ Totem Module: ${totemMod ? '🟢 Encontrado' : '❌ NÃO encontrado'}
✅ Desktop TI: ${desktopMod ? '🟢 Encontrado' : '❌ NÃO encontrado'}\n`);

    // 3️⃣ Listar ativos por módulo
    console.log('📊 ATIVOS POR MÓDULO:');
    console.log('-'.repeat(70));

    for (const mod of modules) {
      const assets = await ManagedAsset.find({ module_id: mod._id }, 'asset_name serial_number asset_type');
      
      console.log(`\n${mod.name}:`);
      if (assets.length === 0) {
        console.log('  (Nenhum ativo)');
      } else {
        assets.forEach(a => {
          console.log(`  - ${a.asset_name} (SN: ${a.serial_number}, type: ${a.asset_type})`);
        });
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ TESTE CONCLUÍDO');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testModulesUI();
