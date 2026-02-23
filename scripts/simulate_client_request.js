#!/usr/bin/env node

/**
 * Script de teste: Simula client desktop enviando dados
 * Mostra exatamente qual URL está sendo chamada
 * 
 * Uso: node scripts/simulate_client_request.js
 */

const axios = require('axios');
const DataCollector = require('./clients/desktop/src/services/DataCollector');
const PayloadBuilder = require('./clients/desktop/src/services/PayloadBuilder');

async function testClientRequest() {
  try {
    console.log('\n🧪 TESTE DE CLIENT DESKTOP\n');
    console.log('='.repeat(60));

    // Configurações simuladas
    const config = {
      serverIp: '10.71.3.211',
      serverPort: 3000,
      moduleId: '6998571ae55cf83e82c8010f', // Desktop TI
      token: 'hap@2025', // Device token
      sector: 'TI',
      floor: 'Primeiro',
      assetName: 'PC-TEST-001'
    };

    console.log('\n📋 CONFIGURAÇÃO DO CLIENT:');
    console.log(`  - serverIp: ${config.serverIp}`);
    console.log(`  - serverPort: ${config.serverPort}`);
    console.log(`  - moduleId: ${config.moduleId}`);
    console.log(`  - token: ${config.token}`);

    // 1. Coletar dados
    console.log('\n1️⃣ COLETANDO DADOS DO SISTEMA...');
    const coreInfo = await DataCollector.getCoreSystemInfo();
    console.log(`  ✅ Serial: ${coreInfo.serial_number}`);
    console.log(`  ✅ Hostname: ${coreInfo.hostname}`);
    console.log(`  ✅ IP: ${coreInfo.ip_address}`);

    // 2. Construir payload
    console.log('\n2️⃣ CONSTRUINDO PAYLOAD...');
    const payload = PayloadBuilder.buildModulePayload(
      coreInfo,
      'desktop',
      config.sector,
      config.floor,
      config.assetName
    );
    console.log(`  ✅ asset_type: ${payload.asset_type}`);
    console.log(`  ✅ asset_name: ${payload.asset_name}`);
    console.log(`  ✅ serial_number: ${payload.serial_number}`);

    // 3. Enviar
    console.log('\n3️⃣ ENVIANDO PARA SERVIDOR...');
    const url = `http://${config.serverIp}:${config.serverPort}/api/modules/${config.moduleId}/assets`;
    console.log(`  📤 URL: ${url}`);
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.token}`,
    };

    const response = await axios.post(url, payload, { headers, timeout: 10000 });

    console.log(`\n✅ RESPOSTA DO SERVIDOR:`);
    console.log(`  - Status: ${response.status}`);
    console.log(`  - Mensagem: ${response.data.message}`);
    console.log(`  - Atualizado: ${response.data.updated ? 'Sim' : 'Não (criado novo)'}`);
    console.log(`  - Asset ID: ${response.data.asset?._id}`);

    console.log('\n' + '='.repeat(60));
    console.log('✨ TESTE CONCLUÍDO COM SUCESSO!\n');

  } catch (error) {
    console.error('\n❌ ERRO:');
    console.error(`  ${error.message}`);
    if (error.response?.data) {
      console.error('  Resposta do servidor:', error.response.data);
    }
    process.exit(1);
  }
}

testClientRequest();
