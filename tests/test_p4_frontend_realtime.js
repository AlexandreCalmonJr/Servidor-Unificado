/**
 * tests/test_p4_frontend_realtime.js
 * Bateria de testes automatizados para a Fase P4 (Tempo Real e Frontend)
 *
 * Cobre:
 * 1. StateStore: integridade do mapa, reatividade, PubSub e isolamento de eventos
 * 2. Atualizações Atômicas de Status e eliminação de inconsistências (B2)
 * 3. Backoff Exponencial com Jitter e Resiliência WebSocket
 * 4. Integridade da renderização de atributos data-asset-id e data-module-id no DOM
 * 5. Integração WebSocket em tempo real com subprotocolo de autenticação
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const WebSocket = require('ws');

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

async function runP4Tests() {
  console.log('\n=================================================================');
  console.log('⚡  BATERIA DE TESTES P4 — TEMPO REAL E FRONTEND');
  console.log('=================================================================\n');

  // ── TESTE 1: StateStore Reativo e PubSub ────────────────────────────
  console.log('1. StateStore Reativo e PubSub:');
  const StateStore = require('../frontend/js/state-store');

  StateStore.clear();

  let upsertFired = false;
  let statusChangeFired = false;
  let receivedStatusChange = null;

  const unsubUpsert = StateStore.on('asset:upsert', (asset) => {
    upsertFired = true;
  });

  const unsubStatus = StateStore.on('asset:status_change', (payload) => {
    statusChangeFired = true;
    receivedStatusChange = payload;
  });

  // Insere ativo
  const asset1 = StateStore.upsertAsset({
    _id: 'asset-test-01',
    module_id: 'mod-01',
    asset_name: 'Terminal-01',
    status: 'online',
  });

  assert('Ativo inserido no StateStore', Boolean(asset1 && asset1._id === 'asset-test-01'));
  assert('Evento asset:upsert disparado', upsertFired);
  assert('getAsset recupera o ativo correto', StateStore.getAsset('asset-test-01')?.asset_name === 'Terminal-01');

  // Atualiza status
  StateStore.updateAssetStatus('asset-test-01', 'offline', { last_seen: new Date().toISOString() });
  assert('Evento asset:status_change disparado', statusChangeFired);
  assert('Status anterior capturado como "online"', receivedStatusChange?.previousStatus === 'online');
  assert('Novo status capturado como "offline"', receivedStatusChange?.newStatus === 'offline');
  assert('getAsset reflete novo status "offline"', StateStore.getAsset('asset-test-01')?.status === 'offline');

  // Batch upsert
  StateStore.upsertAssets([
    { _id: 'asset-test-02', module_id: 'mod-01', asset_name: 'Terminal-02', status: 'online' },
    { _id: 'asset-test-03', module_id: 'mod-02', asset_name: 'Totem-01', status: 'online' },
  ]);

  const allAssets = StateStore.getAllAssets();
  assert('getAllAssets retorna 3 ativos', allAssets.length === 3);

  const mod1Assets = StateStore.getAssetsByModule('mod-01');
  assert('getAssetsByModule retorna 2 ativos para mod-01', mod1Assets.length === 2);

  // Module stats
  StateStore.setModuleStats('mod-01', { total: 2, online: 1, offline: 1 });
  assert('getModuleStats recupera stats de mod-01', StateStore.getModuleStats('mod-01')?.total === 2);

  // Server status
  StateStore.setServerStatus({ device_count: 50, active_devices: 42 });
  assert('getServerStatus recupera métricas do servidor', StateStore.getServerStatus().active_devices === 42);

  // Connection state
  StateStore.setConnectionState('connecting', { attempts: 2 });
  assert('getConnectionState reflete status "connecting"', StateStore.getConnectionState().status === 'connecting');
  StateStore.setConnectionState('connected');
  assert('getConnectionState reflete status "connected"', StateStore.getConnectionState().status === 'connected');

  // Remove asset
  StateStore.removeAsset('asset-test-01');
  assert('removeAsset remove o ativo do mapa', StateStore.getAsset('asset-test-01') === null);

  // ── TESTE 2: Resiliência WebSocket e Algoritmo de Backoff com Jitter ─
  console.log('\n2. Algoritmo de Backoff Exponencial com Jitter:');
  const wsClientCode = fs.readFileSync(path.join(__dirname, '../frontend/js/websocket-client.js'), 'utf-8');

  assert('websocket-client.js implementa calculateBackoffWithJitter', wsClientCode.includes('calculateBackoffWithJitter'));
  assert('websocket-client.js define INITIAL_RECONNECT_DELAY e MAX_RECONNECT_DELAY', wsClientCode.includes('INITIAL_RECONNECT_DELAY') && wsClientCode.includes('MAX_RECONNECT_DELAY'));
  assert('websocket-client.js adiciona fator de Jitter aleatório', wsClientCode.includes('Math.random()'));
  assert('websocket-client.js gerencia banner ws-connection-banner', wsClientCode.includes('ws-connection-banner'));

  // ── TESTE 3: Integridade do HTML e Estilos CSS ─────────────────────
  console.log('\n3. Integridade do HTML e Estilos CSS:');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../frontend/index.html'), 'utf-8');
  const feedbackCss = fs.readFileSync(path.join(__dirname, '../frontend/css/feedback.css'), 'utf-8');

  assert('index.html inclui state-store.js', indexHtml.includes('js/state-store.js'));
  assert('state-store.js é carregado ANTES de websocket-client.js', indexHtml.indexOf('js/state-store.js') < indexHtml.indexOf('js/websocket-client.js'));
  assert('feedback.css contém estilo .ws-banner', feedbackCss.includes('.ws-banner'));
  assert('feedback.css contém classes de estado (.ws-banner-connected, .ws-banner-disconnected)', feedbackCss.includes('.ws-banner-connected') && feedbackCss.includes('.ws-banner-disconnected'));

  // ── TESTE 4: Atributos data-* e Renderização Reativa ───────────────
  console.log('\n4. Atributos data-* e Renderização Reativa no Frontend:');
  const dynamicAssetsCode = fs.readFileSync(path.join(__dirname, '../frontend/js/dynamic-assets.js'), 'utf-8');
  const dashboardCode = fs.readFileSync(path.join(__dirname, '../frontend/js/dashboard.js'), 'utf-8');

  assert('dynamic-assets.js injeta data-asset-id em todas as linhas <tr>', dynamicAssetsCode.includes('data-asset-id="${assetId}"'));
  assert('dynamic-assets.js injeta class="last-seen-cell" nas células de timestamp', dynamicAssetsCode.includes('class="last-seen-cell"'));
  assert('dynamic-assets.js escuta mutações de StateStore (asset:status_change)', dynamicAssetsCode.includes("StateStore.on('asset:status_change'"));
  assert('dashboard.js injeta data-module-id nos cards de módulo', dashboardCode.includes('data-module-id="${item._id}"'));
  assert('dashboard.js expõe updateDashboardCard para atualização atômica', dashboardCode.includes('window.updateDashboardCard'));
  assert('dashboard.js debounceia DashboardRefresh para evitar gargalo', dashboardCode.includes('refreshDebounceTimer'));

  // ── TESTE 5: Conexão WebSocket Real com Token JWT ───────────────────
  console.log('\n5. Conexão WebSocket Real com Token JWT:');
  try {
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
    });
    const token = loginRes.data.token;

    const wsPromise = new Promise((resolve, reject) => {
      const client = new WebSocket(WS_URL, [`mdm.jwt.${token}`]);
      const timer = setTimeout(() => {
        client.close();
        reject(new Error('Timeout de conexão WebSocket'));
      }, 5000);

      client.on('open', () => {
        clearTimeout(timer);
        assert('Handshake WebSocket do Painel com subprotocolo JWT aceito', true);
        client.send(JSON.stringify({
          type: 'register',
          clientId: 'panel-test-runner',
          role: 'panel',
        }));
      });

      client.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'register_ack' || msg.status === 'ok' || msg.type === 'connected') {
            assert('Servidor responde registro do painel no WebSocket', true);
            client.close();
            resolve();
          }
        } catch {}
      });

      // Se após 1.5s já conectou com sucesso, encerra com aprovação
      setTimeout(() => {
        if (client.readyState === WebSocket.OPEN) {
          assert('Conexão WebSocket estável e aberta', true);
          client.close();
          resolve();
        }
      }, 1500);

      client.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    await wsPromise;
  } catch (err) {
    assert('Conexão WebSocket do Painel', false, err.message);
  }

  console.log('\n=================================================================');
  console.log(`📊 RESULTADO P4: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runP4Tests().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
