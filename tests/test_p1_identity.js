/**
 * tests/test_p1_identity.js
 * Bateria de testes automatizados para a Fase P1 (Identidade de Dispositivos e Transporte)
 *
 * Cobre:
 * 1. Emissão de token individual 'dev_...' no enroll
 * 2. Persistência do hash SHA-256 no banco (segredo em texto puro não é guardado)
 * 3. Autenticação com token individual de dispositivo
 * 4. Compatibilidade dual-mode (token global legado aceito)
 * 5. Colocação e liberação de quarentena administrativa
 * 6. Bloqueio estrito de comandos durante quarentena (403 Forbidden)
 * 7. Aceitação de telemetria/heartbeat durante quarentena para auditoria
 * 8. Revogação de token (401 DEVICE_TOKEN_REVOKED)
 * 9. Rotação manual de credencial por dispositivo
 * 10. Conexão WebSocket com token individual do dispositivo
 */

require('dotenv').config();
const axios = require('axios');
const WebSocket = require('ws');
const crypto = require('crypto');
const mongoose = require('mongoose');

const BASE_URL = 'http://127.0.0.1:3000';
const WS_URL = 'ws://127.0.0.1:3000/ws';

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

async function runP1Tests() {
  console.log('\n=================================================================');
  console.log('🛡️  BATERIA DE TESTES P1 — IDENTIDADE E TRANSPORTE');
  console.log('=================================================================\n');

  let adminToken = '';
  let authHeader = {};

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mdm');

  // 0. Autenticação Admin
  try {
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
    });
    adminToken = loginRes.data.token;
    authHeader = { Authorization: `Bearer ${adminToken}` };
  } catch (err) {
    console.error('Falha ao autenticar admin:', err.message);
    process.exit(1);
  }

  // Cria módulo e perfil para os testes de provisionamento
  let moduleId = '';
  let profileName = `Profile-P1-${Date.now()}`;
  let provToken = '';
  let testSerial = `DEV-P1-${Date.now()}`;
  let assetId = '';
  let deviceToken = '';

  try {
    const modRes = await axios.post(`${BASE_URL}/api/modules`, {
      name: `Módulo P1 ${Date.now()}`,
      type: 'desktop',
      description: 'Módulo para testes de identidade P1',
    }, { headers: authHeader });
    moduleId = modRes.data.module._id;

    await axios.post(`${BASE_URL}/api/config-profiles`, {
      name: profileName,
      module_id: moduleId,
      module_type: 'desktop',
      description: 'Perfil P1 Testes',
      settings: {},
    }, { headers: authHeader });

    const tokRes = await axios.post(`${BASE_URL}/api/provisioning/generate-token`, {
      organization: 'Hapvida Seguranca P1',
      config_profile: profileName,
      max_uses: 5,
      expires_in_hours: 2,
    }, { headers: authHeader });
    provToken = tokRes.data.token?.token || tokRes.data.token;
  } catch (err) {
    console.error('Falha na preparação de módulo/perfil:', err.response?.data?.message || err.message);
    process.exit(1);
  }

  // ── TESTE 1: Enroll com Emissão de Token Individual ───────────────
  console.log('1. Enroll e Emissão de Token Individual:');
  try {
    const enrollRes = await axios.post(`${BASE_URL}/api/provisioning/enroll`, {
      provisioning_token: provToken,
      device_id: testSerial,
      device_name: 'Estacao-P1-Auditoria',
      device_model: 'Dell Precision 3660',
      serial_number: testSerial,
      ip_address: '10.0.1.55',
      mac_address_radio: 'AA:BB:CC:11:22:33',
    });

    deviceToken = enrollRes.data.device_token;
    assert('Enroll retorna device_token com prefixo dev_', Boolean(deviceToken) && deviceToken.startsWith('dev_'));
    assert('credential_type retornado como device_token', enrollRes.data.credential_type === 'device_token');

    // Validação no MongoDB via require do modelo
    const ManagedAsset = require('../backend/models/ManagedAsset');
    const dbAsset = await ManagedAsset.findOne({ serial_number: testSerial });
    assetId = dbAsset._id.toString();

    const expectedHash = crypto.createHash('sha256').update(deviceToken).digest('hex');
    assert('Hash SHA-256 persistido no banco', dbAsset.device_token_hash === expectedHash);
    assert('Token em texto puro NÃO é persistido no banco', !dbAsset.device_token && dbAsset.toObject().device_token === undefined);
    assert('token_status inicial é active', dbAsset.token_status === 'active');
  } catch (err) {
    assert('Enroll com token individual', false, err.response?.data?.error || err.message);
  }

  // ── TESTE 2: Autenticação com Token Individual do Dispositivo ──────
  console.log('\n2. Autenticação com Token Individual:');
  try {
    const hbRes = await axios.post(`${BASE_URL}/api/devices/heartbeat`, {
      serial_number: testSerial,
      battery: 92,
    }, {
      headers: { Authorization: `Bearer ${deviceToken}` },
    });

    assert('Heartbeat aceito via Authorization Bearer dev_...', hbRes.data.success === true);
    assert('Dispositivo reconhecido e registrado', hbRes.data.registered === true);

    const hbHeaderRes = await axios.post(`${BASE_URL}/api/devices/heartbeat`, {
      serial_number: testSerial,
    }, {
      headers: { AUTH_TOKEN: deviceToken },
    });
    assert('Heartbeat aceito via header AUTH_TOKEN dev_...', hbHeaderRes.data.success === true);
  } catch (err) {
    assert('Autenticação com token individual', false, err.response?.data?.message || err.message);
  }

  // ── TESTE 3: Compatibilidade Dual-Mode (Token Global Legado) ───────
  console.log('\n3. Compatibilidade Dual-Mode (Token Global Legado):');
  try {
    const legacyRes = await axios.post(`${BASE_URL}/api/devices/heartbeat`, {
      serial_number: testSerial,
    }, {
      headers: { AUTH_TOKEN: process.env.AUTH_TOKEN },
    });

    assert('Requisição com AUTH_TOKEN global aceita em paralelo (dual-mode)', legacyRes.data.success === true);
  } catch (err) {
    assert('Compatibilidade dual-mode', false, err.response?.data?.message || err.message);
  }

  // ── TESTE 4: Quarentena Administrativa e Bloqueio de Comandos ───────
  console.log('\n4. Gestão de Quarentena e Bloqueio de Comandos:');
  try {
    // 4.1 Coloca em quarentena
    const quarRes = await axios.put(`${BASE_URL}/api/modules/${moduleId}/assets/${assetId}/quarantine`, {
      quarantine: true,
      reason: 'Atividade anômala detectada pelo SOC',
    }, { headers: authHeader });

    assert('Admin coloca dispositivo em quarentena com sucesso', quarRes.data.asset.token_status === 'quarantine');
    assert('Motivo da quarentena registrado', quarRes.data.asset.quarantine_reason === 'Atividade anômala detectada pelo SOC');

    // 4.2 Telemetria / Heartbeat aceita em modo somente-leitura
    const hbQuar = await axios.post(`${BASE_URL}/api/devices/heartbeat`, {
      serial_number: testSerial,
    }, {
      headers: { Authorization: `Bearer ${deviceToken}` },
    });
    assert('Heartbeat de dispositivo em quarentena é aceito para auditoria', hbQuar.data.success === true && hbQuar.data.quarantine === true);

    // 4.3 Consulta de comandos: BLOQUEADA com 403 Forbidden
    try {
      await axios.get(`${BASE_URL}/api/modules/${moduleId}/assets/commands/pending?serialNumber=${testSerial}`, {
        headers: { Authorization: `Bearer ${deviceToken}` },
      });
      assert('Busca de comandos bloqueada durante quarentena', false, 'Retornou 200 indevidamente');
    } catch (cmdErr) {
      assert('Busca de comandos bloqueada com 403 Forbidden', cmdErr.response?.status === 403);
      assert('Código retornado é DEVICE_IN_QUARANTINE', cmdErr.response?.data?.code === 'DEVICE_IN_QUARANTINE');
    }

    // 4.4 Reporte de resultado de comando: BLOQUEADO com 403 Forbidden
    try {
      await axios.post(`${BASE_URL}/api/devices/command-result`, {
        command_id: '600000000000000000000001',
        success: true,
      }, {
        headers: { Authorization: `Bearer ${deviceToken}` },
      });
      assert('Reporte de resultado bloqueado durante quarentena', false, 'Retornou 200 indevidamente');
    } catch (cmdErr) {
      assert('Reporte de comando bloqueado com 403 Forbidden', cmdErr.response?.status === 403);
    }

    // 4.5 Libera da quarentena
    const unquarRes = await axios.put(`${BASE_URL}/api/modules/${moduleId}/assets/${assetId}/quarantine`, {
      quarantine: false,
    }, { headers: authHeader });
    assert('Admin remove dispositivo da quarentena', unquarRes.data.asset.token_status === 'active');

    // Agora a consulta de comandos volta a responder 200 OK
    const unquarCmd = await axios.get(`${BASE_URL}/api/modules/${moduleId}/assets/commands/pending?serialNumber=${testSerial}`, {
      headers: { Authorization: `Bearer ${deviceToken}` },
    });
    assert('Consulta de comandos reestabelecida após fim da quarentena', unquarCmd.status === 200);
  } catch (err) {
    assert('Gestão de quarentena', false, err.response?.data?.message || err.message);
  }

  // ── TESTE 5: Revogação e Rotação de Credenciais ─────────────────────
  console.log('\n5. Revogação e Rotação de Token:');
  try {
    // 5.1 Revogação
    const revokeRes = await axios.post(`${BASE_URL}/api/modules/${moduleId}/assets/${assetId}/revoke-token`, {}, { headers: authHeader });
    assert('Admin revoga credencial com sucesso', revokeRes.data.asset.token_status === 'revoked');

    // Requisição com token revogado DEVE falhar com 401
    try {
      await axios.post(`${BASE_URL}/api/devices/heartbeat`, {
        serial_number: testSerial,
      }, {
        headers: { Authorization: `Bearer ${deviceToken}` },
      });
      assert('Token revogado é rejeitado', false, 'Retornou 200 indevidamente');
    } catch (revErr) {
      assert('Token revogado rejeitado com 401 Unauthorized', revErr.response?.status === 401);
      assert('Código DEVICE_TOKEN_REVOKED retornado', revErr.response?.data?.code === 'DEVICE_TOKEN_REVOKED');
    }

    // 5.2 Rotação
    const rotateRes = await axios.post(`${BASE_URL}/api/modules/${moduleId}/assets/${assetId}/rotate-token`, {}, { headers: authHeader });
    const newToken = rotateRes.data.device_token;
    assert('Admin rotaciona token gerando nova credencial dev_...', Boolean(newToken) && newToken !== deviceToken);

    // Novo token funciona
    const newHb = await axios.post(`${BASE_URL}/api/devices/heartbeat`, {
      serial_number: testSerial,
    }, {
      headers: { Authorization: `Bearer ${newToken}` },
    });
    assert('Novo token após rotação é aceito com 200 OK', newHb.data.success === true);
    deviceToken = newToken;
  } catch (err) {
    assert('Revogação e rotação de credenciais', false, err.response?.data?.message || err.message);
  }

  // ── TESTE 6: WebSocket com Token Individual do Dispositivo ─────────
  console.log('\n6. WebSocket com Token Individual:');
  try {
    const ws = new WebSocket(WS_URL, [`mdm.device.${deviceToken}`]);

    const connected = await new Promise((resolve) => {
      ws.on('open', () => {
        resolve(true);
        ws.close();
      });
      ws.on('error', () => {
        resolve(false);
      });
      setTimeout(() => resolve(false), 4000);
    });

    assert('Handshake WebSocket aceito com subprotocolo mdm.device.<dev_token>', connected);
  } catch (err) {
    assert('WebSocket com token individual', false, err.message);
  }

  // ── TESTE 7: Templates de Reverse Proxy Criados ─────────────────────
  console.log('\n7. Templates de Reverse Proxy TLS:');
  try {
    const fs = require('fs');
    const path = require('path');
    const caddyExists = fs.existsSync(path.join(__dirname, '../deploy/Caddyfile'));
    const nginxExists = fs.existsSync(path.join(__dirname, '../deploy/nginx.conf'));
    assert('deploy/Caddyfile criado com configuração de proxy TLS', caddyExists);
    assert('deploy/nginx.conf criado com configuração de proxy TLS', nginxExists);
  } catch (err) {
    assert('Templates de proxy', false, err.message);
  }

  // ── Limpeza dos dados de teste ──────────────────────────────────────
  try {
    if (assetId && moduleId) {
      await axios.delete(`${BASE_URL}/api/modules/${moduleId}/assets/${assetId}`, { headers: authHeader });
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
  console.log(`📊 RESULTADO P1: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runP1Tests().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
