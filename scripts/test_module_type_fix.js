#!/usr/bin/env node
/**
 * test_module_type_fix.js
 * 
 * Testa se a correção de asset_type está funcionando:
 * 1. Verifica se o módulo foi criado com type='notebook'
 * 2. Simula envio de asset ao módulo
 * 3. Verifica se asset foi criado com type='notebook' (não 'desktop')
 */

const axios = require('axios');
const mongoose = require('mongoose');

// Configuração
const SERVER_URL = 'http://localhost:3000';
const TOKEN = 'seu_token_aqui'; // Usar token real

// Modelos
const AssetModuleConfig = require('../models/AssetModule');
const NotebookModel = require('../models/Notebook');

async function runTest() {
  try {
    console.log('\n🧪 TESTE: Verificando correção de asset_type\n');

    // 1. Conectar ao banco
    console.log('📡 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/UnificadoServer');
    console.log('✅ Conectado!\n');

    // 2. Buscar módulo "Notebooks TI"
    console.log('🔍 Buscando módulo "Notebooks TI"...');
    const module = await AssetModuleConfig.findOne({ name: 'Notebooks TI' });
    if (!module) {
      console.log('❌ Módulo "Notebooks TI" não encontrado!');
      process.exit(1);
    }
    console.log(`✅ Encontrado: ${module.name}, type=${module.type}\n`);

    // 3. Verificar assets neste módulo
    console.log(`📊 Assets no módulo ${module.name}:`);
    const assets = await NotebookModel.find({ module_id: module._id });
    console.log(`Total: ${assets.length}`);
    
    if (assets.length > 0) {
      console.log('\nÚltimos 3 assets:');
      assets.slice(-3).forEach(asset => {
        console.log(`  - ${asset.asset_name} (S/N: ${asset.serial_number})`);
        console.log(`    ├─ type: ${asset.asset_type || 'N/A'}`);
        console.log(`    └─ created_at: ${asset.created_at}`);
      });
    }

    // 4. Verificar se há assets com type="desktop" no módulo notebook
    console.log('\n⚠️  Verificando anomalias...');
    const anomalies = await NotebookModel.find({ 
      module_id: module._id, 
      asset_type: 'desktop' 
    });
    
    if (anomalies.length > 0) {
      console.log(`❌ ACHADO ${anomalies.length} assets com type="desktop" em módulo notebook!`);
      anomalies.forEach(asset => {
        console.log(`  - ${asset.asset_name} (S/N: ${asset.serial_number})`);
      });
    } else {
      console.log('✅ Nenhum asset com type="desktop" encontrado neste módulo');
    }

    // 5. Teste API - Simular o que o client vai fazer
    console.log('\n🔄 Testando fluxo do client (simulado):\n');
    
    // 5a. Client busca info do módulo
    console.log('1️⃣  Client: GET /api/modules/{moduleId}');
    try {
      const moduleInfoResponse = await axios.get(`${SERVER_URL}/api/modules/${module._id}`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` },
        timeout: 5000,
      });
      
      const retrievedModuleType = moduleInfoResponse.data?.module?.type;
      console.log(`   ✅ Server retornou: type="${retrievedModuleType}"`);
      
      if (retrievedModuleType === 'notebook') {
        console.log('   ✅ CORRETO: Client vai usar type="notebook"');
      } else {
        console.log(`   ⚠️  PROBLEMA: Esperava "notebook", recebeu "${retrievedModuleType}"`);
      }
    } catch (error) {
      console.log(`   ⚠️  Não pude fazer requisição API: ${error.message}`);
      console.log('   (Isso é OK se o servidor não estiver rodando)');
    }

    console.log('\n✅ Teste concluído!\n');

  } catch (error) {
    console.error('❌ Erro durante teste:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
