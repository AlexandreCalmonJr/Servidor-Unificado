// tests/full_system_stress_suite.js
// Bateria Completa de Teste de Carga & Estresse Multissistema - Antigravity MDM Docker Stack
// Cobre: Módulos Dinâmicos, Telemetria Massiva, Provisionamento, Mapeamentos (Unidades/BSSID),
// Perfis/Políticas, Usuários/RBAC, Relatórios Analíticos/CSV, Impressoras/Suprimentos, Comandos RSA e WebSockets.

const axios = require('axios');
const WebSocket = require('ws');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const WS_URL = process.env.WS_URL || 'ws://localhost:3000/ws';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'MDM_PROD_SECRET_TOKEN_2026_XYZ987';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function calculatePercentiles(latencies) {
  if (!latencies || latencies.length === 0) {
    return { min: 0, max: 0, avg: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const getP = (p) => sorted[Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1)];
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    min: Math.round(sorted[0]),
    max: Math.round(sorted[sorted.length - 1]),
    avg: Math.round(sum / sorted.length),
    p50: Math.round(getP(50)),
    p90: Math.round(getP(90)),
    p95: Math.round(getP(95)),
    p99: Math.round(getP(99)),
  };
}

async function runInBatches(tasks, batchSize = 10) {
  const results = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const chunk = tasks.slice(i, i + batchSize);
    const chunkResults = await Promise.all(chunk.map(fn => fn()));
    results.push(...chunkResults);
  }
  return results;
}

async function runFullSystemStressSuite() {
  const overallStart = Date.now();

  log('\n' + '='.repeat(80), 'cyan');
  log('⚡ BATERIA DE TESTE DE CARGA TOTAL: TODAS AS FUNÇÕES DO SISTEMA MDM', 'bold');
  log('='.repeat(80), 'cyan');
  log(`🎯 Endpoint Alvo:        ${BASE_URL}`, 'blue');
  log(`🔌 WebSocket Gateway:    ${WS_URL}`, 'blue');
  log(`📅 Data/Hora Início:     ${new Date().toISOString()}`, 'blue');
  log('='.repeat(80) + '\n', 'cyan');

  let adminToken = '';
  const subsystemMetrics = {};

  function recordMetrics(name, latencies, errorCount, customNotes = '') {
    const p = calculatePercentiles(latencies);
    const totalReqs = latencies.length + errorCount;
    const durationSec = latencies.reduce((a, b) => a + b, 0) / 1000 || 0.001;
    const rps = durationSec > 0 ? Math.round((latencies.length / durationSec) * 10) / 10 : 0;
    const errPct = totalReqs > 0 ? ((errorCount / totalReqs) * 100).toFixed(2) : '0.00';

    subsystemMetrics[name] = {
      total: totalReqs,
      success: latencies.length,
      errors: errorCount,
      errPct: `${errPct}%`,
      ...p,
      notes: customNotes
    };

    log(`  📊 [${name}] Sucesso: ${latencies.length}/${totalReqs} (${errPct}% erros) | p50: ${p.p50}ms | p95: ${p.p95}ms | p99: ${p.p99}ms | Max: ${p.max}ms`, latencies.length > 0 && errorCount === 0 ? 'green' : (errorCount > 0 ? 'yellow' : 'red'));
  }

  // ────────────────────────────────────────────────────────────
  // ETAPA 0: AUTENTICAÇÃO INICIAL E ESTABELECIMENTO DE SESSÃO
  // ────────────────────────────────────────────────────────────
  log('▶ FASE 0: Autenticação de Operador Mestre (Admin Session)...', 'cyan');
  try {
    const t0 = Date.now();
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    adminToken = loginRes.data.token;
    const lat = Date.now() - t0;
    log(`  ✅ Operador mestre autenticado em ${lat}ms (JWT adquirido)`, 'green');
    recordMetrics('Fase 0 - Login Admin', [lat], 0, 'Autenticação inicial');
  } catch (err) {
    log(`  ❌ Falha crítica ao autenticar: ${err.message}`, 'red');
    process.exit(1);
  }

  const authHeaders = { Authorization: `Bearer ${adminToken}` };
  const deviceHeaders = { auth_token: AUTH_TOKEN };

  // ────────────────────────────────────────────────────────────
  // ETAPA 1: GESTÃO DE USUÁRIOS E CONTROLE DE ACESSO (RBAC)
  // ────────────────────────────────────────────────────────────
  log('\n▶ FASE 1: Gestão de Usuários & Autenticação Concorrente (RBAC)...', 'cyan');
  const userLatencies = [];
  let userErrors = 0;
  const createdUsernames = [];
  const USER_COUNT = 15;

  const userTasks = Array.from({ length: USER_COUNT }, (_, i) => async () => {
    const username = `mdm_user_${Date.now()}_${i}`;
    const email = `operator_${Date.now()}_${i}@empresa.com.br`;
    const password = `UserPass#${1000 + i}!`;
    const t0 = Date.now();
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, {
        username,
        email,
        password,
        role: i % 3 === 0 ? 'admin' : 'user',
        sector: i % 3 === 0 ? 'TI' : 'Suporte',
        permissions: ['mobile', 'totem']
      }, { headers: authHeaders });

      createdUsernames.push(username);
      userLatencies.push(Date.now() - t0);
    } catch (e) {
      userErrors++;
    }
  });

  await runInBatches(userTasks, 5);

  // Consulta concorrente de usuários
  const listUsersLatencies = [];
  let listUsersErrors = 0;
  const listTasks = Array.from({ length: 10 }, () => async () => {
    const t0 = Date.now();
    try {
      await axios.get(`${BASE_URL}/api/auth/users?page=1&limit=50`, { headers: authHeaders });
      listUsersLatencies.push(Date.now() - t0);
    } catch (e) {
      listUsersErrors++;
    }
  });
  await runInBatches(listTasks, 5);

  recordMetrics('Fase 1 - Registro Usuários', userLatencies, userErrors, `${USER_COUNT} registros concorrentes`);
  recordMetrics('Fase 1 - Listagem Usuários', listUsersLatencies, listUsersErrors, '10 consultas paralelas');

  // ────────────────────────────────────────────────────────────
  // ETAPA 2: MAPEAMENTOS DE INFRAESTRUTURA & GEOLOCALIZAÇÃO INDOOR (UNITS & BSSID)
  // ────────────────────────────────────────────────────────────
  log('\n▶ FASE 2: Mapeamentos de Infraestrutura (Unidades & Rádios BSSID)...', 'cyan');
  const unitLatencies = [];
  let unitErrors = 0;
  const createdUnitNames = [];
  const UNIT_COUNT = 10;

  const runNonce = Date.now().toString(16).slice(-4).toUpperCase();
  const unitTasks = Array.from({ length: UNIT_COUNT }, (_, i) => async () => {
    const name = `Campus Central Bloco ${String.fromCharCode(65 + i)} - ${runNonce}`;
    const startIp = `10.150.${i + 1}.1`;
    const endIp = `10.150.${i + 1}.254`;
    const t0 = Date.now();
    try {
      await axios.post(`${BASE_URL}/api/units`, {
        name,
        ip_ranges: [{ start: startIp, end: endIp }]
      }, { headers: authHeaders });
      createdUnitNames.push(name);
      unitLatencies.push(Date.now() - t0);
    } catch (e) {
      unitErrors++;
    }
  });
  await runInBatches(unitTasks, 5);
  recordMetrics('Fase 2 - Cadastro Unidades', unitLatencies, unitErrors, `${UNIT_COUNT} Unidades com faixas IP`);

  // BSSID Mappings
  const bssidLatencies = [];
  let bssidErrors = 0;
  const BSSID_COUNT = 25;
  const bssidMacs = [];

  const bssidTasks = Array.from({ length: BSSID_COUNT }, (_, i) => async () => {
    const b2 = runNonce.slice(0, 2);
    const b3 = runNonce.slice(2, 4);
    const b4 = (i + 10).toString(16).padStart(2, '0').toUpperCase();
    const b5 = (i + 20).toString(16).padStart(2, '0').toUpperCase();
    const mac = `02:${b2}:${b3}:${b4}:${b5}:FF`;
    bssidMacs.push(mac);
    const unitTarget = createdUnitNames[i % createdUnitNames.length] || '';
    const sector = ['UTI Adulto', 'Triagem', 'Centro Cirurgico', 'Almoxarifado', 'Diretoria'][i % 5];
    const floor = `${(i % 4) + 1}º Andar`;
    const t0 = Date.now();
    try {
      await axios.post(`${BASE_URL}/api/bssid-mappings`, {
        mac_address_radio: mac,
        sector,
        floor,
        unitName: unitTarget
      }, { headers: authHeaders });
      bssidLatencies.push(Date.now() - t0);
    } catch (e) {
      bssidErrors++;
    }
  });
  await runInBatches(bssidTasks, 10);
  recordMetrics('Fase 2 - Cadastro BSSIDs', bssidLatencies, bssidErrors, `${BSSID_COUNT} APs de geolocalização`);

  // ────────────────────────────────────────────────────────────
  // ETAPA 3: PERFIS DE CONFIGURAÇÃO E POLÍTICAS MDM (PROFILES)
  // ────────────────────────────────────────────────────────────
  log('\n▶ FASE 3: Perfis de Configuração e Políticas Corporativas...', 'cyan');
  const profileLatencies = [];
  let profileErrors = 0;
  const createdProfiles = [];
  const PROFILE_COUNT = 15;

  const profileTasks = Array.from({ length: PROFILE_COUNT }, (_, i) => async () => {
    const name = `Politica MDM Seguranca Nivel ${i + 1} - ${Date.now()}`;
    const t0 = Date.now();
    try {
      const res = await axios.post(`${BASE_URL}/api/config-profiles`, {
        name,
        description: `Politica corporativa com restricoes de seguranca nivel ${i + 1}`,
        settings: {
          restrictions: {
            camera_disabled: i % 2 === 0,
            usb_storage_disabled: true,
            factory_reset_disabled: true,
            safe_boot_disabled: true
          },
          telemetry_interval: 30,
          kiosk_mode: i % 3 === 0
        }
      }, { headers: authHeaders });
      createdProfiles.push(name);
      profileLatencies.push(Date.now() - t0);
    } catch (e) {
      profileErrors++;
    }
  });
  await runInBatches(profileTasks, 5);
  recordMetrics('Fase 3 - Criar Perfis MDM', profileLatencies, profileErrors, `${PROFILE_COUNT} perfis corporativos`);

  // Leitura concorrente de perfis
  const getProfileLatencies = [];
  let getProfileErrors = 0;
  const getProfileTasks = Array.from({ length: 15 }, () => async () => {
    const t0 = Date.now();
    try {
      await axios.get(`${BASE_URL}/api/config-profiles`, { headers: authHeaders });
      getProfileLatencies.push(Date.now() - t0);
    } catch (e) {
      getProfileErrors++;
    }
  });
  await runInBatches(getProfileTasks, 5);
  recordMetrics('Fase 3 - Listagem Perfis MDM', getProfileLatencies, getProfileErrors, '15 leituras simultâneas');

  // ────────────────────────────────────────────────────────────
  // ETAPA 4: MOTOR DE PROVISIONAMENTO EM MASSA (PROVISIONING TOKENS)
  // ────────────────────────────────────────────────────────────
  log('\n▶ FASE 4: Motor de Provisionamento em Massa (Tokens & Status)...', 'cyan');
  const provTokenLatencies = [];
  let provTokenErrors = 0;
  const generatedTokens = [];
  const TOKEN_COUNT = 15;

  const baseProfile = createdProfiles[0] || 'Default';

  const provTasks = Array.from({ length: TOKEN_COUNT }, (_, i) => async () => {
    const t0 = Date.now();
    try {
      const res = await axios.post(`${BASE_URL}/api/provisioning/generate-token`, {
        organization: `Hospital Central Lote ${i + 1}`,
        config_profile: baseProfile,
        max_uses: 50,
        expires_in_hours: 48
      }, { headers: authHeaders });
      generatedTokens.push(res.data.token);
      provTokenLatencies.push(Date.now() - t0);
    } catch (e) {
      provTokenErrors++;
    }
  });
  await runInBatches(provTasks, 5);
  recordMetrics('Fase 4 - Gerar Tokens', provTokenLatencies, provTokenErrors, `${TOKEN_COUNT} tokens gerados`);

  // Consulta concorrente de status de token
  const statusTokenLatencies = [];
  let statusTokenErrors = 0;
  const tokenQueryTasks = generatedTokens.map(tok => async () => {
    const t0 = Date.now();
    try {
      await axios.get(`${BASE_URL}/api/provisioning/tokens/${tok}/status`);
      statusTokenLatencies.push(Date.now() - t0);
    } catch (e) {
      statusTokenErrors++;
    }
  });
  await runInBatches(tokenQueryTasks, 5);
  recordMetrics('Fase 4 - Consulta Status Token', statusTokenLatencies, statusTokenErrors, `${tokenQueryTasks.length} consultas públicas`);

  // ────────────────────────────────────────────────────────────
  // ETAPA 5: MÚLTIPLOS MÓDULOS DINÂMICOS & ATIVOS DIVERSIFICADOS
  // ────────────────────────────────────────────────────────────
  log('\n▶ FASE 5: Múltiplos Módulos Dinâmicos & Ativos Diversificados...', 'cyan');
  const moduleLatencies = [];
  let moduleErrors = 0;
  const activeModuleMap = {};
  const TARGET_TYPES = ['desktop', 'mobile', 'totem', 'notebook', 'panel'];

  for (const modType of TARGET_TYPES) {
    const t0 = Date.now();
    try {
      // Verifica se já existe ou cria
      const getRes = await axios.get(`${BASE_URL}/api/modules`, { headers: authHeaders });
      const mods = getRes.data.modules || getRes.data || [];
      const found = mods.find(m => m.type === modType && m.is_active !== false);

      if (found) {
        activeModuleMap[modType] = found._id || found.id;
        moduleLatencies.push(Date.now() - t0);
      } else {
        const createRes = await axios.post(`${BASE_URL}/api/modules`, {
          name: `Módulo ${modType.toUpperCase()} Corporativo`,
          description: `Módulo dinâmico para frota de ${modType}`,
          type: modType
        }, { headers: authHeaders });
        const modId = createRes.data.module?._id || createRes.data._id || createRes.data.data?._id;
        activeModuleMap[modType] = modId;
        moduleLatencies.push(Date.now() - t0);
      }
    } catch (e) {
      moduleErrors++;
    }
  }
  recordMetrics('Fase 5 - Módulos Dinâmicos', moduleLatencies, moduleErrors, `${TARGET_TYPES.length} tipos ativados`);

  // Cadastro de ativos em múltiplos módulos
  const assetLatencies = [];
  let assetErrors = 0;
  const createdAssetIds = [];
  const ASSETS_PER_MODULE = 4;

  for (const [modType, modId] of Object.entries(activeModuleMap)) {
    const assetTasks = Array.from({ length: ASSETS_PER_MODULE }, (_, idx) => async () => {
      const serial = `STRESS_${modType.toUpperCase()}_${Date.now()}_${idx}`;
      const t0 = Date.now();
      try {
        const res = await axios.post(`${BASE_URL}/api/modules/${modId}/assets`, {
          asset_name: `Ativo ${modType} #${idx + 1}`,
          serial_number: serial,
          model: `Enterprise ${modType.toUpperCase()} Model X`,
          manufacturer: 'Dell/Lenovo/Zebra',
          status: 'online',
          location: 'Andar Corporativo'
        }, { headers: authHeaders });
        const aId = res.data.asset?._id || res.data._id || res.data.data?._id;
        if (aId) createdAssetIds.push({ modId, assetId: aId, serial });
        assetLatencies.push(Date.now() - t0);
      } catch (e) {
        assetErrors++;
      }
    });
    await runInBatches(assetTasks, 4);
  }
  recordMetrics('Fase 5 - Cadastro de Ativos', assetLatencies, assetErrors, `${createdAssetIds.length} ativos criados`);

  // ────────────────────────────────────────────────────────────
  // ETAPA 6: GESTÃO DE IMPRESSORAS CORPORATIVAS & SUPRIMENTOS
  // ────────────────────────────────────────────────────────────
  log('\n▶ FASE 6: Módulo de Impressoras Corporativas & Suprimentos...', 'cyan');
  const printerLatencies = [];
  let printerErrors = 0;

  // Consulta sumário de impressoras
  const printerSummaryTasks = Array.from({ length: 10 }, () => async () => {
    const t0 = Date.now();
    try {
      await axios.get(`${BASE_URL}/api/printers/summary`, { headers: authHeaders });
      printerLatencies.push(Date.now() - t0);
    } catch (e) {
      printerErrors++;
    }
  });
  await runInBatches(printerSummaryTasks, 5);
  recordMetrics('Fase 6 - Sumário Impressoras', printerLatencies, printerErrors, '10 consultas concorrentes');

  // Cadastro e movimentação de suprimentos de impressoras
  const supplyLatencies = [];
  let supplyErrors = 0;
  const supplyIds = [];
  const SUPPLY_COUNT = 15;

  const supplyTasks = Array.from({ length: SUPPLY_COUNT }, (_, i) => async () => {
    const sku = `TONER_HP_${Date.now()}_${i}`;
    const t0 = Date.now();
    try {
      const res = await axios.post(`${BASE_URL}/api/printers/inventory/supplies`, {
        sku,
        name: `Toner Preto HP LaserJet Pro #${i + 1}`,
        category: 'toner_black',
        manufacturer: 'HP',
        model_family: 'LaserJet Enterprise',
        quantity_on_hand: 25,
        min_stock: 5,
        reorder_point: 10,
        unit_of_measure: 'un'
      }, { headers: authHeaders });
      const supId = res.data.item?._id || res.data.item?.id;
      if (supId) supplyIds.push(supId);
      supplyLatencies.push(Date.now() - t0);
    } catch (e) {
      supplyErrors++;
    }
  });
  await runInBatches(supplyTasks, 5);
  recordMetrics('Fase 6 - Cadastro Suprimentos', supplyLatencies, supplyErrors, `${SUPPLY_COUNT} insumos cadastrados`);

  // Movimentações de estoque concorrentes
  const movementLatencies = [];
  let movementErrors = 0;
  const movementTasks = supplyIds.map((supId, i) => async () => {
    const t0 = Date.now();
    try {
      await axios.post(`${BASE_URL}/api/printers/inventory/supplies/${supId}/movements`, {
        movement_type: i % 2 === 0 ? 'in' : 'out',
        quantity: 3,
        reason: 'Teste de carga e consumo de toner em pico operacional'
      }, { headers: authHeaders });
      movementLatencies.push(Date.now() - t0);
    } catch (e) {
      movementErrors++;
    }
  });
  await runInBatches(movementTasks, 5);
  recordMetrics('Fase 6 - Movimentação Estoque', movementLatencies, movementErrors, `${supplyIds.length} movimentações`);

  // ────────────────────────────────────────────────────────────
  // ETAPA 7: TELEMETRIA MASSIVA DA FROTA COM RESOLUÇÃO INDOOR AUTOMÁTICA
  // ────────────────────────────────────────────────────────────
  log('\n▶ FASE 7: Telemetria Massiva da Frota (Geolocalização Indoor & Métricas)...', 'cyan');
  const TOTAL_TELEMETRY = 600;
  const TELEMETRY_CONCURRENCY = 30;
  const telemetryLatencies = [];
  let telemetryErrors = 0;

  const telemetryTasks = Array.from({ length: TOTAL_TELEMETRY }, (_, i) => async () => {
    const devNum = (i % 50) + 1;
    const serial = `MDM_DEVICE_${String(devNum).padStart(3, '0')}`;
    const ipUnit = (i % UNIT_COUNT) + 1;
    const ipAddress = `10.150.${ipUnit}.${(i % 250) + 2}`; // Pertence à unidade criada na Fase 2
    const macRadio = bssidMacs[i % bssidMacs.length] || '00:1A:2B:3C:4D:0A'; // Pertence ao AP criado na Fase 2

    const payload = {
      serial_number: serial,
      device_name: `Terminal-${serial}`,
      device_model: 'MDM-Standard-Client',
      app_version: '2.5.0-docker',
      ip_address: ipAddress,
      mac_address_radio: macRadio,
      cpu_usage: Math.round(15 + (Math.random() * 60)),
      memory_usage: Math.round(30 + (Math.random() * 50)),
      disk_usage: Math.round(45 + (Math.random() * 20)),
      battery_level: Math.round(70 + (Math.random() * 30)),
      temperature: Math.round(35 + (Math.random() * 15)),
      is_charging: true,
      wifi_ssid: 'HOSPITAL_CORPORATE_WIFI',
      timestamp: new Date().toISOString()
    };

    const t0 = Date.now();
    try {
      await axios.post(`${BASE_URL}/api/monitor`, payload, {
        headers: {
          'auth_token': AUTH_TOKEN,
          'x-device-serial': serial,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      });
      telemetryLatencies.push(Date.now() - t0);
    } catch (e) {
      telemetryErrors++;
    }
  });

  const telemStart = Date.now();
  await runInBatches(telemetryTasks, TELEMETRY_CONCURRENCY);
  const telemDurationSec = (Date.now() - telemStart) / 1000;
  const telemRps = Math.round((TOTAL_TELEMETRY / telemDurationSec) * 10) / 10;

  recordMetrics('Fase 7 - Telemetria Massiva', telemetryLatencies, telemetryErrors, `${TOTAL_TELEMETRY} reqs em ${telemDurationSec.toFixed(1)}s (${telemRps} req/s)`);

  // ────────────────────────────────────────────────────────────
  // ETAPA 8: RELATÓRIOS ANALÍTICOS & EXPORTAÇÃO CSV DE ALTA CARGA
  // ────────────────────────────────────────────────────────────
  log('\n▶ FASE 8: Relatórios & Exportação Analítica em Streaming CSV...', 'cyan');
  const exportLatencies = [];
  let exportErrors = 0;
  let totalBytesExported = 0;

  const exportTasks = Object.entries(activeModuleMap).map(([modType, modId]) => async () => {
    // Exportação de ativos
    const t0 = Date.now();
    try {
      const res1 = await axios.get(`${BASE_URL}/api/export/modules/${modId}/assets`, {
        headers: authHeaders,
        responseType: 'text'
      });
      exportLatencies.push(Date.now() - t0);
      if (res1.data) totalBytesExported += Buffer.byteLength(res1.data);
    } catch (e) {
      // 204 No Content se não houver registros
      if (e.response?.status === 204) {
        exportLatencies.push(Date.now() - t0);
      } else {
        exportErrors++;
      }
    }

    // Exportação de stats analíticos
    const t1 = Date.now();
    try {
      const res2 = await axios.get(`${BASE_URL}/api/export/modules/${modId}/stats`, {
        headers: authHeaders,
        responseType: 'text'
      });
      exportLatencies.push(Date.now() - t1);
      if (res2.data) totalBytesExported += Buffer.byteLength(res2.data);
    } catch (e) {
      exportErrors++;
    }
  });

  await runInBatches(exportTasks, 3);
  recordMetrics('Fase 8 - Exportação CSV', exportLatencies, exportErrors, `${Math.round(totalBytesExported / 1024)} KB transferidos`);

  // ────────────────────────────────────────────────────────────
  // ETAPA 9: COMANDOS REMOTOS RSA & WEBSOCKET BROADCAST CONCORRENTE
  // ────────────────────────────────────────────────────────────
  log('\n▶ FASE 9: Despacho de Comandos Remotos & WebSockets em Tempo Real...', 'cyan');

  // Abre 50 WebSockets simultâneos com subprotocolo de autenticação MDM
  const WS_CLIENT_COUNT = 50;
  let wsConnected = 0;
  let wsMessagesReceived = 0;
  const wsSockets = [];

  const wsPromise = new Promise((resolve) => {
    let resolved = false;
    for (let i = 0; i < WS_CLIENT_COUNT; i++) {
      const serial = `STRESS-WS-${String(i + 1).padStart(3, '0')}`;
      const ws = new WebSocket(WS_URL, [`mdm.device.${AUTH_TOKEN}`]);
      wsSockets.push(ws);

      ws.on('open', () => {
        wsConnected++;
        ws.send(JSON.stringify({
          type: 'register',
          clientId: serial,
          serial: serial,
          assetType: 'desktop'
        }));
        if (wsConnected === WS_CLIENT_COUNT && !resolved) {
          resolved = true;
          resolve();
        }
      });
      ws.on('message', () => {
        wsMessagesReceived++;
      });
      ws.on('error', () => {});
    }
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    }, 4000);
  });

  const wsStart = Date.now();
  await wsPromise;
  const wsLatency = Date.now() - wsStart;
  log(`  🔌 ${wsConnected}/${WS_CLIENT_COUNT} Conexões WebSockets ativas e autenticadas em ${wsLatency}ms`, wsConnected > 0 ? 'green' : 'yellow');

  // Despacha 30 comandos remotos válidos distribuídos nos ativos criados
  const cmdLatencies = [];
  let cmdErrors = 0;
  const sampleAssets = createdAssetIds.slice(0, 10);

  if (sampleAssets.length > 0) {
    const validCommands = ['flush_dns', 'restart_print_spooler', 'clear_temp'];
    const cmdTasks = Array.from({ length: 30 }, (_, i) => async () => {
      const target = sampleAssets[i % sampleAssets.length];
      const cmdType = validCommands[i % validCommands.length];
      const t0 = Date.now();
      try {
        await axios.post(`${BASE_URL}/api/modules/${target.modId}/assets/${target.assetId}/commands`, {
          commandType: cmdType,
          description: `Disparo de comando sob estresse ${i + 1} (${cmdType})`
        }, { headers: authHeaders });
        cmdLatencies.push(Date.now() - t0);
      } catch (e) {
        cmdErrors++;
      }
    });

    await runInBatches(cmdTasks, 10);
  }

  // Aguarda 1 segundo para captura de broadcasts WebSocket
  await new Promise(r => setTimeout(r, 1000));

  // Fecha sockets
  wsSockets.forEach(ws => {
    try { ws.close(); } catch (_) {}
  });

  recordMetrics('Fase 9 - Comandos Remotos RSA', cmdLatencies, cmdErrors, `${cmdLatencies.length} comandos despachados`);
  recordMetrics('Fase 9 - WebSockets Concorrentes', [wsLatency], WS_CLIENT_COUNT - wsConnected, `${wsMessagesReceived} eventos recebidos por ${wsConnected} sockets`);

  // ────────────────────────────────────────────────────────────
  // ETAPA 10: RELATÓRIO FINAL CONSOLIDADO
  // ────────────────────────────────────────────────────────────
  const totalElapsedSec = ((Date.now() - overallStart) / 1000).toFixed(2);
  log('\n' + '='.repeat(80), 'cyan');
  log(`🏁 RESUMO CONSOLIDADO DA BATERIA DE CARGA MULTISSISTEMA (${totalElapsedSec}s)`, 'bold');
  log('='.repeat(80), 'cyan');

  console.table(subsystemMetrics);

  let grandTotalReqs = 0;
  let grandTotalSuccess = 0;
  let grandTotalErrors = 0;

  Object.values(subsystemMetrics).forEach(m => {
    grandTotalReqs += m.total;
    grandTotalSuccess += m.success;
    grandTotalErrors += m.errors;
  });

  const overallErrRate = grandTotalReqs > 0 ? ((grandTotalErrors / grandTotalReqs) * 100).toFixed(2) : '0.00';

  log('='.repeat(80), 'cyan');
  log(`🌟 Total Geral de Operações: ${grandTotalReqs}`, 'bold');
  log(`✅ Operações com Sucesso:    ${grandTotalSuccess}`, 'green');
  log(`❌ Falhas / Erros:           ${grandTotalErrors} (${overallErrRate}%)`, grandTotalErrors === 0 ? 'green' : 'yellow');
  log(`⏱️  Tempo Total de Execução:  ${totalElapsedSec} segundos`, 'cyan');
  log('='.repeat(80) + '\n', 'cyan');

  return {
    metrics: subsystemMetrics,
    totalElapsedSec,
    grandTotalReqs,
    grandTotalSuccess,
    grandTotalErrors,
    overallErrRate
  };
}

if (require.main === module) {
  runFullSystemStressSuite()
    .then((summary) => {
      if (summary.grandTotalErrors > 0 && summary.grandTotalSuccess === 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal crash:', err);
      process.exit(1);
    });
}

module.exports = { runFullSystemStressSuite };
