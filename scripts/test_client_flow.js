#!/usr/bin/env node
/**
 * test_client_flow.js
 * Simula exatamente o que o client faz ao sincronizar
 */

const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';
const MODULE_ID = '699c756685e5276aa4b3ae70'; // Notebooks TI
const TOKEN = 'seu_token_aqui';

async function testClientFlow() {
  try {
    console.log('\n🧪 TESTE: Fluxo do Cliente\n');

    // 1️⃣ Cliente busca info do módulo
    console.log('1️⃣ Client: GET /api/modules/{moduleId}');
    const moduleResponse = await axios.get(`${SERVER_URL}/api/modules/${MODULE_ID}`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` },
      timeout: 5000,
    });
    
    console.log(`✅ Resposta recebida`);
    console.log(`   module.type = "${moduleResponse.data.module.type}"`);
    console.log(`   module.name = "${moduleResponse.data.module.name}"\n`);

    // 2️⃣ Cliente extrai o tipo
    const moduleType = moduleResponse.data.module.type;
    console.log(`2️⃣ Client: Extrai moduleType = "${moduleType}"\n`);

    // 3️⃣ Simular payload
    const payload = {
      service: 'mdm-server',
      environment: 'development',
      version: '1.0.0',
      moduleId: MODULE_ID,
      moduleType: moduleType,  // ← Deveria ser "notebook"
      serialNumber: 'PE0E0RX6',
      assetType: moduleType,   // ← Deveria ser "notebook"
      assetName: 'TEST-PE0E0RX6',
      // ... outros campos
    };

    console.log(`3️⃣ Client: Cria payload com asset_type="${payload.assetType}"\n`);

    console.log('📊 Payload que será enviado:');
    console.log(JSON.stringify(payload, null, 2));

    console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('\nSe moduleType !== "notebook", há um problema na requisição GET!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response?.data) {
      console.error('Resposta:', error.response.data);
    }
    process.exit(1);
  }
}

testClientFlow();
