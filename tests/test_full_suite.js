// tests/test_full_suite.js
// Bateria de Testes Completa - Antigravity MDM Suite

const axios = require('axios');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

let passedTests = 0;
let failedTests = 0;

function assertTest(name, condition, details = '') {
  if (condition) {
    passedTests++;
    log(`  ✅ ${name} ${details ? '(' + details + ')' : ''}`, 'green');
    return true;
  } else {
    failedTests++;
    log(`  ❌ ${name} ${details ? '- ' + details : ''}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(65), 'cyan');
  log('🧪 BATERIA DE TESTES DE INTEGRAÇÃO COMPLETA - SISTEMA MDM', 'bold');
  log('='.repeat(65) + '\n', 'cyan');

  let adminToken = '';
  let testModuleId = '';
  let testAssetId = '';
  const testSerial = 'TEST-DEVICE-' + Date.now();

  // ────────────────────────────────────────────────────────────
  // 1. HEALTH CHECKS & DIAGNÓSTICO
  // ────────────────────────────────────────────────────────────
  log('1. Health Checks & Infraestrutura:', 'blue');
  try {
    const health = await axios.get(`${BASE_URL}/health`);
    assertTest('GET /health retorna 200 OK', health.status === 200 && health.data.status === 'OK');

    const ready = await axios.get(`${BASE_URL}/ready`);
    assertTest('GET /ready confirma MongoDB conectado', ready.status === 200 && ready.data.ready === true);

    const live = await axios.get(`${BASE_URL}/live`);
    assertTest('GET /live confirma processo ativo', live.status === 200 && live.data.alive === true);
  } catch (err) {
    assertTest('Health check endpoints acessíveis', false, err.message);
  }

  // ────────────────────────────────────────────────────────────
  // 2. AUTENTICAÇÃO E SEGURANÇA JWT
  // ────────────────────────────────────────────────────────────
  log('\n2. Autenticação e Segurança (JWT & Token):', 'blue');
  try {
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    adminToken = loginRes.data.token;
    assertTest('Login com admin/admin123 bem-sucedido', !!adminToken);

    const verifyRes = await axios.get(`${BASE_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assertTest('Verificação de token ativo retorna dados do operador', verifyRes.data.valid === true);

    // Teste de Token Expirado (assertiva 1.1 do plano)
    const secret = process.env.JWT_SECRET || 'secret';
    const expiredToken = jwt.sign({ id: 'dummy', username: 'dummy' }, secret, { expiresIn: '-1s' });
    try {
      await axios.get(`${BASE_URL}/api/server/status`, {
        headers: { Authorization: `Bearer ${expiredToken}` }
      });
      assertTest('Token expirado rejeitado com 401', false, 'Deveria ter falhado');
    } catch (expErr) {
      const status = expErr.response?.status;
      const code = expErr.response?.data?.code;
      assertTest('Token expirado tratado com HTTP 401 e código de segurança', status === 401, `Status: ${status}, Code: ${code}`);
    }

    // Acesso sem token
    try {
      await axios.get(`${BASE_URL}/api/server/status`);
      assertTest('Acesso sem token rejeitado com 401', false);
    } catch (noTokenErr) {
      assertTest('Acesso sem token bloqueado com 401', noTokenErr.response?.status === 401);
    }
  } catch (err) {
    assertTest('Fluxo de autenticação', false, err.message);
  }

  // ────────────────────────────────────────────────────────────
  // 3. ASSINATURA CRIPTOGRÁFICA DE COMANDOS (RSA-2048)
  // ────────────────────────────────────────────────────────────
  log('\n3. Criptografia Assimétrica de Comandos Remotos (RSA-SHA256):', 'blue');
  try {
    const { signCommand, verifyCommand } = require('../utils/commandSignature');
    const privPath = path.join(__dirname, '..', 'config', 'keys', 'command_private_key.pem');
    const pubPath = path.join(__dirname, '..', 'config', 'keys', 'command_public_key.pem');

    const privKey = fs.readFileSync(privPath, 'utf8');
    const pubKey = fs.readFileSync(pubPath, 'utf8');

    process.env.COMMAND_SIGNING_PRIVATE_KEY = privKey;

    const sampleCommand = {
      id: 'cmd-integration-test',
      commandType: 'reboot_device',
      command: 'INTERNAL_REBOOT',
      parameters: { delay: 10 },
      requiresElevation: false,
      timeout: 60000
    };

    const signature = signCommand(sampleCommand);
    assertTest('Geração de assinatura RSA-SHA256 para comando', !!signature && signature.alg === 'RS256');

    const isValid = verifyCommand(sampleCommand, signature, pubKey);
    assertTest('Validação da assinatura criptográfica com chave pública', isValid === true);

    const tampered = verifyCommand({ ...sampleCommand, command: 'MALICIOUS_WIPE' }, signature, pubKey);
    assertTest('Rejeição sumária de comando adulterado em trânsito', tampered === false);
  } catch (err) {
    assertTest('Mecanismo de assinatura criptográfica', false, err.message);
  }

  // ────────────────────────────────────────────────────────────
  // 4. PROTOCOLO REALTIME WEBSOCKET (PAINEL & DISPOSITIVO)
  // ────────────────────────────────────────────────────────────
  log('\n4. Protocolo Realtime WebSocket (RFC 6455):', 'blue');
  try {
    // 4.1 Handshake do Painel
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        assertTest('Handshake WebSocket do Painel Web (timeout)', false);
        try { panelWs.close(); } catch (_) {}
        resolve();
      }, 3000);

      const panelWs = new WebSocket(WS_URL, [`mdm.jwt.${adminToken}`]);
      panelWs.on('open', () => {
        panelWs.send(JSON.stringify({ type: 'register', clientId: 'panel-ci-test', role: 'panel' }));
      });
      panelWs.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'registered' && msg.role === 'panel') {
            clearTimeout(timer);
            assertTest('Handshake WebSocket do Painel Web aceito sem erro de ativo', true);
            panelWs.close();
            resolve();
          }
        } catch (_) {}
      });
      panelWs.on('error', (e) => {
        clearTimeout(timer);
        assertTest('Conexão WebSocket do Painel', false, e.message);
        resolve();
      });
    });

    // 4.2 Handshake do Dispositivo + Despacho Instantâneo
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        assertTest('Handshake WebSocket do Dispositivo (timeout)', false);
        try { deviceWs.close(); } catch (_) {}
        resolve();
      }, 3000);

      const authToken = process.env.AUTH_TOKEN || '';
      const deviceWs = new WebSocket(WS_URL, [`mdm.device.${authToken}`]);

      deviceWs.on('open', () => {
        deviceWs.send(JSON.stringify({
          type: 'register',
          role: 'device',
          serialNumber: testSerial,
          hostname: 'TOTEM-INTEGRATION-01'
        }));
      });

      deviceWs.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'heartbeat_ack') {
            clearTimeout(timer);
            assertTest('Dispositivo registrado no WebSocket com heartbeat_ack', true);
            deviceWs.close();
            resolve();
          }
        } catch (_) {}
      });

      deviceWs.on('error', (e) => {
        clearTimeout(timer);
        assertTest('Conexão WebSocket de Dispositivo', false, e.message);
        resolve();
      });
    });
  } catch (err) {
    assertTest('Testes de WebSocket', false, err.message);
  }

  // ────────────────────────────────────────────────────────────
  // 5. CICLO DE VIDA DE MÓDULOS E ATIVOS GERENCIADOS
  // ────────────────────────────────────────────────────────────
  log('\n5. Módulos MDM, Ativos e Fila de Comandos:', 'blue');
  const headers = { Authorization: `Bearer ${adminToken}` };
  try {
    // Criar Módulo com nome dinâmico para evitar colisões
    const modRes = await axios.post(`${BASE_URL}/api/modules`, {
      name: 'Módulo de Homologação QA ' + Date.now(),
      type: 'desktop',
      description: 'Módulo para validação automatizada de ponta a ponta',
      table_columns: [
        { dataKey: 'assetName', label: 'Nome' },
        { dataKey: 'serialNumber', label: 'Serial' }
      ]
    }, { headers });
    testModuleId = modRes.data.module._id;
    assertTest('Criação dinâmica de módulo MDM', !!testModuleId, `ID: ${testModuleId}`);

    // Criar Ativo Gerenciado
    const assetRes = await axios.post(`${BASE_URL}/api/modules/${testModuleId}/assets`, {
      asset_name: 'Terminal-Bancada-01',
      serial_number: testSerial,
      hostname: 'TOTEM-01',
      device_model: 'Dell OptiPlex 7090',
      os_version: 'Windows 11 Enterprise',
      asset_type: 'desktop',
      status: 'online'
    }, { headers });
    testAssetId = assetRes.data.asset._id;
    assertTest('Registro de ativo corporativo (Asset)', !!testAssetId, `ID: ${testAssetId}`);

    // Despachar Comando para o Ativo
    const cmdRes = await axios.post(`${BASE_URL}/api/modules/${testModuleId}/assets/${testAssetId}/commands`, {
      commandType: 'restart_computer',
      timeout: 30000
    }, { headers });
    const cmdId = cmdRes.data.command?.id;
    assertTest('Enfileiramento de comando remoto para o ativo', !!cmdId, `Cmd ID: ${cmdId}`);

    // Consulta de Comandos Pendentes pelo Agente (simulação do poller)
    const pendingRes = await axios.get(`${BASE_URL}/api/modules/${testModuleId}/assets/commands/pending?serialNumber=${testSerial}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        AUTH_TOKEN: process.env.AUTH_TOKEN || ''
      }
    });
    const pendingCmds = pendingRes.data.commands || [];
    assertTest('Agente consulta e recebe comando pendente na fila', pendingCmds.some(c => String(c.id || c._id) === String(cmdId)));

    // Modo Manutenção
    const maintOn = await axios.put(`${BASE_URL}/api/modules/${testModuleId}/assets/${testAssetId}/maintenance`, {
      maintenance_status: true,
      maintenance_reason: 'Atualização de Firmware Programada'
    }, { headers });
    assertTest('Ativação de Modo Manutenção no Ativo', maintOn.data.success === true);

    const maintOff = await axios.put(`${BASE_URL}/api/modules/${testModuleId}/assets/${testAssetId}/maintenance`, {
      maintenance_status: false
    }, { headers });
    assertTest('Desativação de Modo Manutenção', maintOff.data.success === true);

    // Limpeza
    await axios.delete(`${BASE_URL}/api/modules/${testModuleId}/assets/${testAssetId}`, { headers });
    assertTest('Exclusão segura do ativo de teste', true);

    await axios.delete(`${BASE_URL}/api/modules/${testModuleId}`, { headers });
    assertTest('Exclusão do módulo de teste', true);
  } catch (err) {
    assertTest('Ciclo de vida de módulos e ativos', false, err.response?.data?.message || err.message);
  }

  // ────────────────────────────────────────────────────────────
  // 6. BUFFER OFFLINE DO AGENTE DESKTOP (OFFLINE STORE)
  // ────────────────────────────────────────────────────────────
  log('\n6. Resiliência do Cliente Desktop (OfflineStore):', 'blue');
  try {
    const offlineStore = require('../clients/desktop/src/services/OfflineStore');
    offlineStore.clear();

    offlineStore.enqueue({ metric: 'cpu', value: 45 });
    offlineStore.enqueue({ metric: 'ram', value: 72 });
    assertTest('Enfileiramento de métricas em buffer offline', offlineStore.size() === 2);

    const peeked = offlineStore.peekAll();
    assertTest('Recuperação de métricas mantidas offline', peeked.length === 2 && peeked[0].metric === 'cpu');

    offlineStore.clear();
    assertTest('Limpeza pós-sincronização do buffer offline', offlineStore.size() === 0);
  } catch (err) {
    assertTest('OfflineStore unit test', false, err.message);
  }

  // ────────────────────────────────────────────────────────────
  // RELATÓRIO FINAL
  // ────────────────────────────────────────────────────────────
  log('\n' + '='.repeat(65), 'cyan');
  log(`📊 RESULTADO FINAL DOS TESTES: ${passedTests} PASSOU | ${failedTests} FALHOU`, failedTests === 0 ? 'green' : 'red');
  log('='.repeat(65) + '\n', 'cyan');

  process.exit(failedTests === 0 ? 0 : 1);
}

runAllTests().catch((err) => {
  console.error('Erro fatal na execução dos testes:', err);
  process.exit(1);
});
