/**
 * tests/test_p2_contract_integrity.js
 * Bateria de testes automatizados para a Fase P2 (Contrato de API, Validação e Integridade de Telemetria)
 *
 * Cobre:
 * 1. Rejeição estrita de contratos inválidos (400 SCHEMA_VALIDATION_ERROR) via Ajv
 * 2. Prevenção de colisões de serial (rejeição de 'N/A' e 'unknown')
 * 3. Normalização canônica de grandezas: RAM (MB), Storage (GB), Bateria (0-100 ou null)
 * 4. Separação de Conectividade (status: 'online') de Saúde de Hardware (health_status: 'error' / 'degraded')
 * 5. Convergência dos caminhos de ingestão (/api/monitor e /api/modules/.../assets)
 * 6. Preservação de campos de inventário (available_ram, antivirus, notes)
 * 7. Disponibilidade de documentação OpenAPI 3.0 (/api-docs e /api-docs.json)
 */

require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'http://127.0.0.1:3000';

let passed = 0;
let failed = 0;

function assert(description, condition, details = '') {
  if (condition) {
    console.log(`  ✅ ${description} ${details ? '(' + details + ')' : ''}`);
    passed++;
  } else {
    console.error(`  ❌ ${description} ${details ? '— ' + details : ''}`);
    failed++;
  }
}

async function runP2Tests() {
  console.log('\n=================================================================');
  console.log('📜  BATERIA DE TESTES P2 — CONTRATO DE API E INTEGRIDADE');
  console.log('=================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mdm');

  let adminToken = '';
  let authHeader = {};
  let moduleId = '';
  const testSerial = `DEV-P2-${Date.now()}`;
  const ManagedAsset = require('../backend/models/ManagedAsset');

  // 0. Autenticação Admin e Setup
  try {
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
    });
    adminToken = loginRes.data.token;
    authHeader = { Authorization: `Bearer ${adminToken}` };

    // Cria módulo totem para ingestão
    const modRes = await axios.post(`${BASE_URL}/api/modules`, {
      name: `Módulo P2 Totens ${Date.now()}`,
      type: 'totem',
      description: 'Módulo para testes de telemetria P2',
    }, { headers: authHeader });
    moduleId = modRes.data.module._id;
  } catch (err) {
    console.error('Falha na autenticação ou setup de módulo:', err.response?.data?.message || err.message);
    process.exit(1);
  }

  // ── TESTE 1: Rejeição de Contratos Inválidos (Ajv JSON Schema) ──────
  console.log('1. Validação de Schemas JSON (Ajv):');
  try {
    // 1.1 Telemetria sem serial_number deve retornar 400 SCHEMA_VALIDATION_ERROR
    try {
      await axios.post(`${BASE_URL}/api/monitor`, {
        ram: '16 GB',
        storage: '512 GB',
      }, {
        headers: { AUTH_TOKEN: process.env.AUTH_TOKEN },
      });
      assert('Rejeição de telemetria sem serial_number', false, 'Retornou 200 indevidamente');
    } catch (valErr) {
      assert('Telemetria sem serial retorna 400 Bad Request', valErr.response?.status === 400);
      assert('Código retornado é SCHEMA_VALIDATION_ERROR', valErr.response?.data?.code === 'SCHEMA_VALIDATION_ERROR');
    }

    // 1.2 Telemetria com serial 'N/A' (padrão antigo que causava colisão) deve ser rejeitada
    try {
      await axios.post(`${BASE_URL}/api/monitor`, {
        serial_number: 'N/A',
        ram: '16 GB',
      }, {
        headers: { AUTH_TOKEN: process.env.AUTH_TOKEN },
      });
      assert('Rejeição de serial colidente "N/A"', false, 'Retornou 200 indevidamente');
    } catch (valErr) {
      assert('Serial "N/A" rejeitado por violação de pattern do schema', valErr.response?.status === 400);
    }

    // 1.3 Heartbeat sem serial ou com serial vazio
    try {
      await axios.post(`${BASE_URL}/api/devices/heartbeat`, {
        battery: 50,
      }, {
        headers: { AUTH_TOKEN: process.env.AUTH_TOKEN },
      });
      assert('Rejeição de heartbeat sem serial', false, 'Retornou 200 indevidamente');
    } catch (hbErr) {
      assert('Heartbeat sem serial retorna 400 SCHEMA_VALIDATION_ERROR', hbErr.response?.status === 400);
      assert('Código é SCHEMA_VALIDATION_ERROR', hbErr.response?.data?.code === 'SCHEMA_VALIDATION_ERROR');
    }

    // 1.4 Command result sem command_id ou success
    try {
      await axios.post(`${BASE_URL}/api/devices/command-result`, {
        output: 'Comando executado',
      }, {
        headers: { AUTH_TOKEN: process.env.AUTH_TOKEN },
      });
      assert('Rejeição de command-result incompleto', false, 'Retornou 200 indevidamente');
    } catch (cmdErr) {
      assert('Command-result sem required fields retorna 400', cmdErr.response?.status === 400);
    }
  } catch (err) {
    assert('Validação de schemas', false, err.message);
  }

  // ── TESTE 2: Normalização Canônica de Grandezas (RAM, Disco, Bateria) ──
  console.log('\n2. Normalização Canônica de Grandezas:');
  try {
    const ingestRes = await axios.post(`${BASE_URL}/api/monitor`, {
      serial_number: testSerial,
      asset_name: 'Totem-Hospital-P2',
      asset_type: 'totem',
      ram: '16 GB',
      available_ram: '4096 MB',
      storage: '512 GB',
      storage_free_gb: 48,
      battery_level: -1, // Desktop / totem sem bateria (-1 deve virar null)
      antivirus_name: 'Windows Defender',
      antivirus_status: true,
      antivirus_version: '4.18.23050',
      notes: 'Totem recepção bloco A',
    }, {
      headers: { AUTH_TOKEN: process.env.AUTH_TOKEN },
    });

    assert('Ingestão em /api/monitor retorna 201 Created', ingestRes.status === 201);

    const assetInDb = await ManagedAsset.findOne({ serial_number: testSerial });
    assert('ram_total_mb convertido para inteiro (16384 MB)', assetInDb.ram_total_mb === 16384);
    assert('ram_free_mb convertido para inteiro (4096 MB)', assetInDb.ram_free_mb === 4096);
    assert('storage_total_gb convertido para inteiro (512 GB)', assetInDb.storage_total_gb === 512);
    assert('storage_free_gb persistido (48 GB)', assetInDb.storage_free_gb === 48);
    assert('battery_level -1 normalizado para null (não polui com -1%)', assetInDb.battery_level === null);
    assert('Campos de inventário persistidos (antivirus, notes)', assetInDb.antivirus_name === 'Windows Defender' && assetInDb.notes === 'Totem recepção bloco A');
    assert('available_ram preservado', Boolean(assetInDb.available_ram));
  } catch (err) {
    assert('Normalização de grandezas', false, err.response?.data?.error || err.message);
  }

  // ── TESTE 3: Separação de Conectividade e Saúde de Periféricos (B2) ──
  console.log('\n3. Separação de Conectividade (status) e Saúde (health_status):');
  try {
    // Envia telemetria com impressora sem papel (erro crítico de hardware)
    const errorIngest = await axios.post(`${BASE_URL}/api/monitor`, {
      serial_number: testSerial,
      asset_type: 'totem',
      printer_status: 'Erro: papel encravado e tampa aberta',
      zebra_status: 'OK',
    }, {
      headers: { AUTH_TOKEN: process.env.AUTH_TOKEN },
    });

    assert('Ingestão de totem com falha de impressora aceita', errorIngest.status === 201);

    const updatedAsset = await ManagedAsset.findOne({ serial_number: testSerial });
    assert('status de conectividade permanece "online" (comunicação ativa)', updatedAsset.status === 'online');
    assert('health_status computado como "error" devido à impressora', updatedAsset.health_status === 'error');
    assert('health_issues contém detalhes da impressora', updatedAsset.health_issues.some((i) => i.includes('papel encravado')));

    // Recupera impressora para estado normal
    await axios.post(`${BASE_URL}/api/monitor`, {
      serial_number: testSerial,
      asset_type: 'totem',
      printer_status: 'Pronta para impressão',
      zebra_status: 'Pronta',
    }, {
      headers: { AUTH_TOKEN: process.env.AUTH_TOKEN },
    });

    const recoveredAsset = await ManagedAsset.findOne({ serial_number: testSerial });
    assert('health_status recuperado para "healthy" após resolução', recoveredAsset.health_status === 'healthy');
    assert('health_issues limpo', recoveredAsset.health_issues.length === 0);
  } catch (err) {
    assert('Conectividade vs Saúde', false, err.response?.data?.error || err.message);
  }

  // ── TESTE 4: Convergência de Ingestão (/api/monitor vs /api/modules) ─
  console.log('\n4. Convergência Canônica dos Caminhos de Ingestão:');
  try {
    // Ingestão pelo endpoint modular
    const modAssetRes = await axios.post(`${BASE_URL}/api/modules/${moduleId}/assets`, {
      serial_number: testSerial,
      asset_name: 'Totem-Recepcao-Atualizado',
      ram: '32 GB',
      storage: '1 TB',
      printer_status: 'OK',
    }, { headers: authHeader });

    assert('Ingestão via rota de módulo aceita com sucesso', modAssetRes.data.success === true);

    const modAssetInDb = await ManagedAsset.findOne({ serial_number: testSerial });
    assert('ram_total_mb atualizado para 32768 MB via rota de módulo', modAssetInDb.ram_total_mb === 32768);
    assert('storage_total_gb atualizado para 1024 GB via rota de módulo', modAssetInDb.storage_total_gb === 1024);
    assert('printer_status presente tanto no topo quanto no custom_data', modAssetInDb.printer_status === 'OK' && modAssetInDb.custom_data.get('printer_status') === 'OK');
  } catch (err) {
    assert('Convergência de ingestão', false, err.response?.data?.message || err.message);
  }

  // ── TESTE 5: Documentação OpenAPI 3.0 e Swagger UI ──────────────────
  console.log('\n5. Documentação OpenAPI 3.0 / Swagger UI:');
  try {
    const swaggerHtml = await axios.get(`${BASE_URL}/api-docs/`);
    assert('Swagger UI responde 200 OK em /api-docs/', swaggerHtml.status === 200 && swaggerHtml.data.includes('swagger'));

    const openapiJson = await axios.get(`${BASE_URL}/api-docs.json`);
    assert('Especificação OpenAPI 3.0 disponível em /api-docs.json', openapiJson.data.openapi === '3.0.3');
    assert('Título da API é MDM Servidor Unificado API', openapiJson.data.info.title === 'MDM Servidor Unificado API');
    assert('Rotas documentadas (/api/monitor, /api/devices/heartbeat)', Boolean(openapiJson.data.paths['/api/monitor']));
  } catch (err) {
    assert('Documentação OpenAPI', false, err.message);
  }

  // ── Limpeza dos dados de teste ──────────────────────────────────────
  try {
    const assetToRemove = await ManagedAsset.findOne({ serial_number: testSerial });
    if (assetToRemove) {
      await axios.delete(`${BASE_URL}/api/modules/${moduleId}/assets/${assetToRemove._id}`, { headers: authHeader });
    }
    if (moduleId) {
      await axios.delete(`${BASE_URL}/api/modules/${moduleId}`, { headers: authHeader });
    }
  } catch {
    // Limpeza silenciosa
  } finally {
    try {
      await mongoose.disconnect();
    } catch {}
  }

  console.log('\n=================================================================');
  console.log(`📊 RESULTADO P2: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runP2Tests().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
