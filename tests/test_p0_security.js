/**
 * tests/test_p0_security.js
 * Bateria de testes de validação das correções P0 (Security Hardening).
 *
 * Cobre:
 * - S1/S2: Utilitário de secrets e fallback seguro
 * - S3: Bloqueio contra Mass Assignment (campos protegidos)
 * - B1: PUT parcial preserva unit, sector e floor existentes
 * - B7: Heartbeat rejeita desconhecidos (404) e gera last_seen server-side
 * - S9: Isolamento de canais WebSocket (broadcastToPanel)
 * - S11: Headers CSP restritos, sem wildcard https:, com HSTS
 * - B10: Remoção de código morto e redirecionamento de /dashboard
 */

require('dotenv').config();
const axios = require('axios');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

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

async function runP0Tests() {
  console.log('\n=================================================================');
  console.log('🛡️  BATERIA DE TESTES P0 — SECURITY HARDENING');
  console.log('=================================================================\n');

  let adminToken = '';

  // 1. Autenticação para testes
  try {
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
    });
    adminToken = loginRes.data.token;
  } catch (err) {
    console.error('Falha ao autenticar admin:', err.message);
    process.exit(1);
  }

  const authHeader = { Authorization: `Bearer ${adminToken}` };

  // ── TESTE 1: CSP & HSTS Headers (S11) ───────────────────────────
  console.log('1. Headers de Segurança HTTP (CSP & HSTS):');
  try {
    const res = await axios.get(`${BASE_URL}/health`);
    const csp = res.headers['content-security-policy'] || '';
    const hsts = res.headers['strict-transport-security'] || '';

    assert('CSP não contém wildcard "https:" irrestrito em script-src', !csp.includes("script-src 'self' 'unsafe-inline' https:"));
    assert('CSP restringe script-src para CDNs permitidos', csp.includes('https://cdn.jsdelivr.net') && csp.includes('https://cdnjs.cloudflare.com'));
    assert('CSP contém suporte a nonce dinâmico', csp.includes("'nonce-"));
    assert('HSTS header presente com max-age configurado', hsts.includes('max-age=31536000') && hsts.includes('includeSubDomains'));
  } catch (err) {
    assert('Headers de segurança', false, err.message);
  }

  // ── TESTE 2: Secrets Reader (S1/S2) ─────────────────────────────
  console.log('\n2. Utilitário de Secrets (Docker Secrets Fallback):');
  try {
    const secrets = require('../backend/config/secrets');
    assert('secrets.AUTH_TOKEN carregado corretamente', Boolean(secrets.AUTH_TOKEN) && secrets.AUTH_TOKEN.length >= 32);
    assert('secrets.JWT_SECRET carregado corretamente', Boolean(secrets.JWT_SECRET) && secrets.JWT_SECRET.length >= 32);
    assert('secrets.readSecret implementa fallback', secrets.readSecret('non_existent_secret', 'PORT', '3000') === '3000');
  } catch (err) {
    assert('Utilitário de secrets', false, err.message);
  }

  // ── TESTE 3: Mass Assignment (S3) ───────────────────────────────
  console.log('\n3. Proteção contra Mass Assignment (S3):');
  let moduleId = '';
  let assetId = '';
  const testSerial = `SEC-TEST-${Date.now()}`;

  try {
    // Cria módulo de teste
    const modRes = await axios.post(`${BASE_URL}/api/modules`, {
      name: `Módulo Seg P0 ${Date.now()}`,
      type: 'desktop',
      description: 'Módulo de teste de segurança',
    }, { headers: authHeader });
    moduleId = modRes.data.module._id;

    // Tenta criar ativo com injeção de campos protegidos
    const assetRes = await axios.post(`${BASE_URL}/api/modules/${moduleId}/assets`, {
      asset_name: 'Terminal-Seguranca',
      serial_number: testSerial,
      unit: 'Unidade Alpha',
      sector: 'TI Central',
      floor: '3º Andar',
      is_deleted: true, // Campo protegido!
      status: 'retired', // Campo protegido!
    }, { headers: authHeader });

    assetId = assetRes.data.asset._id;
    assert('Ativo criado com sucesso no módulo', Boolean(assetId));
    assert('Injeção de is_deleted: true foi ignorada', assetRes.data.asset.is_deleted !== true);

    // Tenta atualizar via PUT tentando forçar mass assignment
    const putRes = await axios.put(`${BASE_URL}/api/modules/${moduleId}/assets/${assetId}`, {
      is_deleted: true,
      provisioning_status: 'compromised',
      location_history: [{ unit: 'Falsa' }],
    }, { headers: authHeader });

    assert('PUT com is_deleted: true não apaga ativo', putRes.data.asset.is_deleted !== true);
  } catch (err) {
    assert('Proteção Mass Assignment', false, err.response?.data?.message || err.message);
  }

  // ── TESTE 4: Correção do PUT Destrutivo (B1) ─────────────────────
  console.log('\n4. Preservação de Campos no PUT Parcial (B1):');
  try {
    // Atualiza APENAS o asset_name com campos vazios no resto
    const updateRes = await axios.put(`${BASE_URL}/api/modules/${moduleId}/assets/${assetId}`, {
      asset_name: 'Terminal-Nome-Atualizado',
      unit: '', // String vazia não deve sobrescrever valor existente
      sector: '',
    }, { headers: authHeader });

    assert('Nome foi atualizado', updateRes.data.asset.asset_name === 'Terminal-Nome-Atualizado');
    assert('Unit original foi preservada (não virou null/vazio)', updateRes.data.asset.unit === 'Unidade Alpha');
    assert('Sector original foi preservado (não virou null/vazio)', updateRes.data.asset.sector === 'TI Central');
  } catch (err) {
    assert('Preservação no PUT parcial', false, err.response?.data?.message || err.message);
  }

  // ── TESTE 5: Heartbeat Seguro (B7) ──────────────────────────────
  console.log('\n5. Validação de Heartbeat (B7):');
  try {
    // Heartbeat para serial que NÃO existe -> deve retornar 404
    try {
      await axios.post(`${BASE_URL}/api/devices/heartbeat`, {
        serial_number: `UNKNOWN-SERIAL-${Date.now()}`,
      }, {
        headers: { AUTH_TOKEN: process.env.AUTH_TOKEN },
      });
      assert('Heartbeat para serial desconhecido retorna 404', false, 'Retornou 200 inesperadamente');
    } catch (hbErr) {
      assert('Heartbeat para serial desconhecido retorna 404', hbErr.response?.status === 404);
    }

    // Heartbeat para serial existente
    const hbSuccess = await axios.post(`${BASE_URL}/api/devices/heartbeat`, {
      serial_number: testSerial,
      battery: 85,
    }, {
      headers: { AUTH_TOKEN: process.env.AUTH_TOKEN },
    });

    assert('Heartbeat de serial existente aceito com 200', hbSuccess.data.success === true && hbSuccess.data.registered === true);
    assert('last_seen gerado pelo servidor retornado', Boolean(hbSuccess.data.last_seen));
  } catch (err) {
    assert('Validação de heartbeat', false, err.response?.data?.message || err.message);
  }

  // ── TESTE 6: Limpeza de Código Morto & Redirecionamentos (B10) ────
  console.log('\n6. Código Morto e Rota /dashboard (B10):');
  try {
    // /dashboard deve redirecionar para a SPA, não dar erro 500
    const dashRes = await axios.get(`${BASE_URL}/dashboard`, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302 || status === 200,
    });
    assert('/dashboard redireciona para painel (não erro 500)', dashRes.status === 302);

    const expressDead = fs.existsSync(path.join(__dirname, '../backend/config/express.js'));
    const dbDead = fs.existsSync(path.join(__dirname, '../backend/config/db.js'));
    assert('backend/config/express.js removido', !expressDead);
    assert('backend/config/db.js removido', !dbDead);
  } catch (err) {
    assert('Verificação de código morto', false, err.message);
  }

  // ── TESTE 7: WebSocket Isolamento de Canais (S9) ─────────────────
  console.log('\n7. WebSocket Isolamento de Canais (S9):');
  try {
    const WebSocketServer = require('../backend/services/websocketServer');
    assert('WebSocketServer possui método broadcastToPanel', typeof WebSocketServer.broadcastToPanel === 'function');
    assert('WebSocketServer possui método broadcastToAll', typeof WebSocketServer.broadcastToAll === 'function');
  } catch (err) {
    assert('WebSocket isolamento', false, err.message);
  }

  // ── Limpeza dos dados de teste ──────────────────────────────────
  try {
    if (assetId && moduleId) {
      await axios.delete(`${BASE_URL}/api/modules/${moduleId}/assets/${assetId}`, { headers: authHeader });
    }
    if (moduleId) {
      await axios.delete(`${BASE_URL}/api/modules/${moduleId}`, { headers: authHeader });
    }
  } catch {
    // Limpeza silenciosa
  }

  console.log('\n=================================================================');
  console.log(`📊 RESULTADO P0: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runP0Tests().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
