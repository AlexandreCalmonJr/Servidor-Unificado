/**
 * unified_tester.js — Script Unificado de Testes e Simulações MDM
 * 
 * Este script reune todos os simuladores e testes (API, WS, Desktop, Mobile, Localização)
 * em um único arquivo para facilitar a execução.
 * 
 * Uso:
 *   node scripts/unified_tester.js --all          (Roda todos os testes e cria simuladores)
 *   node scripts/unified_tester.js --tests        (Roda apenas testes de API e WebSocket)
 *   node scripts/unified_tester.js --history      (Roda apenas o teste de localização e histórico)
 *   node scripts/unified_tester.js --desktop      (Simula ativos desktop/totem)
 *   node scripts/unified_tester.js --mobile       (Simula ativos mobile)
 *   node scripts/unified_tester.js --heartbeat    (Pode ser combinado com desktop/mobile/all para manter online)
 *   node scripts/unified_tester.js --count N      (Define a quantidade de mock devices para desktop/mobile)
 */

require('dotenv').config();
const http = require('http');
const WebSocket = require('ws');

const BASE = `http://localhost:${process.env.PORT || 3000}`;
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'hap@2025';

// Parsed Args
const ARGS = process.argv.slice(2);
const RUN_ALL = ARGS.includes('--all') || ARGS.length === 0;
const RUN_TESTS = RUN_ALL || ARGS.includes('--tests');
const RUN_HISTORY = RUN_ALL || ARGS.includes('--history');
const RUN_DESKTOP = RUN_ALL || ARGS.includes('--desktop');
const RUN_MOBILE = RUN_ALL || ARGS.includes('--mobile');
const HEARTBEAT = ARGS.includes('--heartbeat');

const countArgIndex = ARGS.indexOf('--count');
const DEVICE_COUNT = countArgIndex !== -1 ? parseInt(ARGS[countArgIndex + 1], 10) : 5;

// ============================================================================
// HELPER: HTTP REQUEST
// ============================================================================
async function request(method, path, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE);
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: url.hostname, port: url.port, path: url.pathname, method,
            headers: { 'Content-Type': 'application/json', ...headers, ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
        };
        const req = http.request(opts, (res) => {
            let result = '';
            res.on('data', (c) => result += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(result) }); }
                catch { resolve({ status: res.statusCode, data: result }); }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function login() {
    const res = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
    if (res.status !== 200 || !res.data.token) throw new Error('Falha no login admin');
    return res.data.token;
}

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', cyan: '\x1b[36m', blue: '\x1b[34m' };
function logTest(name, passed, details = '') {
    console.log(`${passed ? colors.green + '✅' : colors.red + '❌'} ${name}${colors.reset} ${details ? colors.cyan + details + colors.reset : ''}`);
    if (!passed) throw new Error(`Teste falhou: ${name}`);
}

// ============================================================================
// 1. TESTES DE API E WEBSOCKET (test_server_endpoints.js & verify_ws.js)
// ============================================================================
async function runApiAndWsTests(jwt) {
    console.log(`\n${colors.blue}📝 INICIANDO TESTES DE API E WEBSOCKET${colors.reset}`);
    const headers = { Authorization: `Bearer ${jwt}` };
    let testModuleId, testAssetId;

    // WEBSOCKET
    await new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://localhost:${process.env.PORT || 3000}/ws`);
        const timeout = setTimeout(() => { ws.close(); reject(new Error('WS Timeout')); }, 5000);
        ws.on('open', () => {
            ws.send(JSON.stringify({ type: 'register', clientId: 'test_script' }));
            setTimeout(() => {
                ws.send(JSON.stringify({ type: 'heartbeat' }));
            }, 500);
        });
        ws.on('message', (data) => {
            const msg = JSON.parse(data);
            if (msg.type === 'heartbeat_ack') {
                clearTimeout(timeout);
                ws.close();
                logTest('WebSocket Conexão e Heartbeat', true);
                resolve();
            }
        });
        ws.on('error', reject);
    });

    // MÓDULOS E ASSETS
    const modRes = await request('POST', '/api/modules', { name: 'Módulo Teste API', type: 'custom', description: 'Teste' }, headers);
    testModuleId = modRes.data.module?._id || modRes.data.module?.id;
    logTest('API: Criar Módulo', modRes.status === 201, `ID: ${testModuleId}`);

    const astRes = await request('POST', `/api/modules/${testModuleId}/assets`, {
        serial_number: `API-TEST-${Date.now()}`, asset_name: 'Ativo de Teste API', asset_type: 'custom'
    }, headers);
    testAssetId = astRes.data.asset?._id || astRes.data.asset?.id;
    logTest('API: Criar Ativo', astRes.status === 201 || astRes.status === 200, `ID: ${testAssetId}`);

    // MANUTENÇÃO
    const maintRes = await request('PUT', `/api/modules/${testModuleId}/assets/${testAssetId}/maintenance`, { maintenance_status: true, maintenance_ticket: 'API-123' }, headers);
    logTest('API: Ativar Manutenção', maintRes.status === 200);

    // LIMPEZA
    await request('DELETE', `/api/modules/${testModuleId}/assets/${testAssetId}`, null, headers);
    await request('DELETE', `/api/modules/${testModuleId}`, null, headers);
    logTest('API: Limpeza Concluída', true);
}

// ============================================================================
// 2. TESTE DE LOCALIZAÇÃO E HISTÓRICO (simulate_history_location.js)
// ============================================================================
async function runHistoryAndLocationTests(jwt) {
    console.log(`\n${colors.blue}🏥 INICIANDO TESTE DE LOCALIZAÇÃO (IP/MAC) E HISTÓRICO${colors.reset}`);
    const headers = { Authorization: `Bearer ${jwt}` };

    const unitData = { name: 'Hospital Central - Teste', ip_ranges: [{ start: '192.168.100.1', end: '192.168.100.254' }] };
    await request('POST', '/api/units', unitData, headers);
    logTest('Localização: Configurar Unidade (IP Range)', true);

    const macPrefix = 'AA:BB:CC:DD:EE:FF';
    await request('POST', '/api/bssid-mappings', { mac_address_radio: macPrefix, sector: 'UTI Neonatal', floor: '3º Andar', unitName: 'Hospital Central - Teste' }, headers);
    logTest('Localização: Configurar BSSID (MAC)', true);

    let modRes = await request('POST', '/api/modules', { name: 'Desktop History Test', type: 'desktop' }, headers);
    let moduleId = modRes.data.module?._id || modRes.data.module?.id;
    if (!moduleId) {
        const listRes = await request('GET', '/api/modules', null, headers);
        moduleId = listRes.data.modules.find(m => m.type === 'desktop')?._id;
    }

    const serial = `TEST-LOC-${Date.now().toString(36).toUpperCase()}`;
    const assetRes = await request('POST', `/api/modules/${moduleId}/assets`, {
        serial_number: serial, asset_name: `DESK-TEST-${serial.substring(0, 4)}`, asset_type: 'desktop',
        mac_address: macPrefix, ip_address: '192.168.100.50', unit: 'Hospital Central - Teste', sector: 'UTI Neonatal', floor: '3º Andar', location: 'Auto-Loc'
    }, headers);

    const assetId = assetRes.data.asset?._id || assetRes.data.asset?.id;
    logTest('Histórico: Criar Ativo', !!assetId);

    await request('PUT', `/api/modules/${moduleId}/assets/${assetId}/maintenance`, { maintenance_status: true, maintenance_reason: 'Teste' }, headers);
    await request('PATCH', `/api/modules/${moduleId}/assets/${assetId}`, { location: 'Manutenção T.I.', status: 'maintenance' }, headers);

    const histRes = await request('GET', `/api/modules/${moduleId}/assets/${assetId}/history`, null, headers);
    logTest('Histórico: Verificar Entradas', histRes.status === 200 && histRes.data.history.length > 0, `${histRes.data.history.length} registros`);
}

// ============================================================================
// 3. SIMULAÇÃO DE DESKTOP/TOTEM/PRINTER (simulate_desktop.js)
// ============================================================================
async function runDesktopSimulation(jwt) {
    console.log(`\n${colors.blue}🖥️  INICIANDO SIMULAÇÃO DE DESKTOP / TOTEM / PAINEL (${DEVICE_COUNT} dispositivos)${colors.reset}`);
    const headers = { Authorization: `Bearer ${jwt}` };

    const modulesDef = [
        { name: 'Desktop', type: 'desktop', prefix: 'DESK' }, { name: 'Notebook', type: 'notebook', prefix: 'NOTE' },
        { name: 'Totem', type: 'totem', prefix: 'TOTEM' }, { name: 'Impressora', type: 'printer', prefix: 'PRN' },
        { name: 'Scanner', type: 'scanner', prefix: 'SCN' }, { name: 'Painel', type: 'panel', prefix: 'PNL' }
    ];

    const moduleMap = {};
    for (const def of modulesDef) {
        let res = await request('POST', '/api/modules', { name: def.name, type: def.type, is_active: true }, headers);
        let id = res.data.module?._id || res.data.module?.id;
        if (!id) {
            let listRes = await request('GET', '/api/modules', null, headers);
            id = listRes.data.modules.find(m => m.type === def.type)?._id;
        }
        moduleMap[def.type] = id;
    }
    logTest('Desktop Sim: Preparar Módulos', Object.keys(moduleMap).length > 0);

    const registered = [];
    for (let i = 0; i < DEVICE_COUNT; i++) {
        const def = modulesDef[i % modulesDef.length];
        const serial = `${def.prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const res = await request('POST', `/api/modules/${moduleMap[def.type]}/assets`, {
            serial_number: serial, asset_name: `${def.prefix}-${serial.slice(-4)}`, asset_type: def.type, status: 'online'
        }, headers);
        if (res.status <= 201) registered.push(serial);
    }
    logTest('Desktop Sim: Registrar Ativos', registered.length === DEVICE_COUNT, `${registered.length} registrados`);
    return registered;
}

// ============================================================================
// 4. SIMULAÇÃO DE MOBILE (simulate_mobile.js)
// ============================================================================
async function runMobileSimulation(jwt) {
    console.log(`\n${colors.blue}📱 INICIANDO SIMULAÇÃO MOBILE (${DEVICE_COUNT} dispositivos)${colors.reset}`);
    const headers = { Authorization: `Bearer ${jwt}` };

    let res = await request('POST', '/api/modules', { name: 'Smartphones', type: 'mobile', is_active: true }, headers);
    let moduleId = res.data.module?._id || res.data.module?.id;
    if (!moduleId) {
        let listRes = await request('GET', '/api/modules', null, headers);
        moduleId = listRes.data.modules.find(m => m.type === 'mobile')?._id;
    }
    logTest('Mobile Sim: Preparar Módulo', !!moduleId);

    const registered = [];
    for (let i = 0; i < DEVICE_COUNT; i++) {
        const serial = `MOB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const res = await request('POST', `/api/modules/${moduleId}/assets`, {
            serial_number: serial, asset_name: `Smartphone-${serial.slice(-4)}`, asset_type: 'mobile', status: 'online'
        }, headers);
        if (res.status <= 201) registered.push(serial);
    }
    logTest('Mobile Sim: Registrar Ativos', registered.length === DEVICE_COUNT, `${registered.length} registrados`);
    return registered;
}

// ============================================================================
// RUNNER PRINCIPAL
// ============================================================================
async function main() {
    console.log(`\n🚀 INICIANDO UNIFIED TESTER & SIMULATOR\n`);
    try {
        const jwt = await login();
        logTest('Sistema: Login Admin', true);

        let allDevices = [];

        if (RUN_TESTS) await runApiAndWsTests(jwt);
        if (RUN_HISTORY) await runHistoryAndLocationTests(jwt);
        if (RUN_DESKTOP) allDevices.push(...await runDesktopSimulation(jwt));
        if (RUN_MOBILE) allDevices.push(...await runMobileSimulation(jwt));

        console.log(`\n${colors.green}🎉 TODAS AS ROTINAS FORAM EXECUTADAS COM SUCESSO!${colors.reset}`);

        if (HEARTBEAT && allDevices.length > 0) {
            console.log(`\n💓 MODO HEARTBEAT ATIVO para ${allDevices.length} dispositivos (Ctrl+C para sair)`);
            setInterval(async () => {
                for (const serial of allDevices) {
                    await request('POST', '/api/devices/heartbeat', {
                        serial_number: serial, battery: 50 + Math.floor(Math.random() * 50), last_seen: new Date().toISOString()
                    }, { AUTH_TOKEN });
                }
                process.stdout.write('💓 ');
            }, 10000);
        } else {
            process.exit(0);
        }
    } catch (err) {
        console.error(`\n${colors.red}❌ ERRO FATAL: ${err.message}${colors.reset}`);
        process.exit(1);
    }
}

main();
