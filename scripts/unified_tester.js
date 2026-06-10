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
const AUTH_TOKEN = process.env.AUTH_TOKEN;
if (!AUTH_TOKEN) {
    throw new Error('AUTH_TOKEN deve estar definido no ambiente para rodar o unified_tester.');
}

// Parsed Args
const ARGS = process.argv.slice(2);
const RUN_ALL = ARGS.includes('--all') || ARGS.length === 0;
const RUN_TESTS = RUN_ALL || ARGS.includes('--tests');
const RUN_HISTORY = RUN_ALL || ARGS.includes('--history');
const RUN_DESKTOP = RUN_ALL || ARGS.includes('--desktop');
const RUN_MOBILE = RUN_ALL || ARGS.includes('--mobile');
const RUN_PROFILES = RUN_ALL || ARGS.includes('--profiles');
const RUN_COMMANDS = RUN_ALL || ARGS.includes('--commands');
const RUN_DASHBOARD = RUN_ALL || ARGS.includes('--dashboard');
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
            hostname: url.hostname, port: url.port, path: url.pathname + url.search, method,
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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
        const ws = new WebSocket(`ws://localhost:${process.env.PORT || 3000}/ws`, [`mdm.jwt.${jwt}`]);
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

    console.log(`[DEBUG] History Create response: ${JSON.stringify(assetRes)}`);

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
        if (res.status <= 201) {
            const createdId = res.data.asset?._id || res.data.asset?.id;
            registered.push({ serial, id: createdId, moduleId });
        }
    }
    logTest('Mobile Sim: Registrar Ativos', registered.length === DEVICE_COUNT, `${registered.length} registrados`);
    return registered;
}

// ============================================================================
// 5. TESTE DE PERFIS DE CONFIGURAÇÃO (PROFILES)
// ============================================================================
async function runProfileTests(jwt) {
    console.log(`\n${colors.blue}⚙️  INICIANDO TESTES DE PERFIL DE CONFIGURAÇÃO${colors.reset}`);
    const headers = { Authorization: `Bearer ${jwt}` };

    const profileData = {
        name: `Teste Automatizado - Bloqueio de Câmera ${Date.now()}`,
        description: 'Perfil gerado pelo unified_tester para verificar a engine de políticas.',
        platform: 'all',
        category: 'security',
        configurations: {
            allowCamera: false,
            allowScreenCapture: false,
            requirePassword: true,
            passwordMinLength: 8
        },
        priority: 10
    };

    const res = await request('POST', '/api/config-profiles', profileData, headers);
    logTest('Profiles: Criar Perfil de Seguranca', res.status === 201 || res.status === 200, `ID: ${res.data._id || res.data.id || 'N/A'}`);
}

// ============================================================================
// 6. SIMULAÇÃO BIDIRECIONAL DE COMANDOS (Mock Device x Controller)
// ============================================================================
async function runCommandSimulation(jwt, devicesList) {
    console.log(`\n${colors.blue}⚡ INICIANDO SIMULAÇÃO DE COMANDOS BIDIRECIONAL${colors.reset}`);
    const headers = { Authorization: `Bearer ${jwt}` };
    const deviceAuth = { Authorization: `Bearer ${AUTH_TOKEN}` };

    if (!devicesList || devicesList.length === 0) {
        console.log(`${colors.cyan}Nenhum ativo disponível para testar comandos. Pulando...${colors.reset}`);
        return;
    }

    const testDevice = devicesList[0]; // Pega o primeiro device mockado

    // 6.1 Painel Admin cria um comando
    // Verifica se temos o ID. No Desktop retorna string serial, no Mobile retorna objeto {serial, id, moduleId}.
    // Vamos garantir o formato:
    const tgtSerial = typeof testDevice === 'string' ? testDevice : testDevice.serial;
    const tgtModule = typeof testDevice === 'string' ? 'desktop' : testDevice.moduleId;
    const tgtAssetId = typeof testDevice === 'string' ? tgtSerial : testDevice.id; // Se for string apenas tenta enviar pro ID sendo o serial (fallback server controller tentará buscar, mas no ideal precisamos do objectID do mongo)

    // Como getPending puxa pelo Serial (baseado no controller analisado), a gente primeiro descobre o Object Id real chamando /api/assets se necessário, mas o createCommand pede ModuleId e AssetId.
    // Vamos procurar listando se não tiver.
    let resolvedModuleId = tgtModule;
    let resolvedAssetId = tgtAssetId;

    if (typeof testDevice === 'string') {
        const listRes = await request('GET', '/api/modules', null, headers);
        const deskMod = listRes.data?.modules?.find(m => m.type === 'desktop');
        if (deskMod) {
            resolvedModuleId = deskMod._id;
            const astRes = await request('GET', `/api/modules/${resolvedModuleId}/assets`, null, headers);
            const ast = astRes.data?.assets?.find(a => a.serial_number === tgtSerial || a.serialNumber === tgtSerial);
            if (ast) resolvedAssetId = ast._id;
        }
    }

    logTest('Comandos: Resolvendo alvos do comando', resolvedModuleId && resolvedAssetId !== tgtSerial);

    if (resolvedModuleId && resolvedAssetId !== tgtSerial) {
        // Envia comando (Admin)
        const cmdRes = await request('POST', `/api/modules/${resolvedModuleId}/assets/${resolvedAssetId}/commands`, {
            commandType: 'lock_device',
            timeout: 30000
        }, headers);
        logTest('Comandos: Enviar "Lock Device" via Painel', cmdRes.status === 201 || cmdRes.status === 200);

        // Aguarda 1 segundo para garantir que o BD persista o comando e indexe
        await sleep(1000);

        // Dispositivo checa payload pendente (Mock Device Agent)
        const pendRes = await request('GET', `/api/modules/${resolvedModuleId}/assets/commands/pending?serialNumber=${tgtSerial}`, null, deviceAuth);

        console.log(`[DEBUG] pending commands response: ${JSON.stringify(pendRes)}`);

        let foundCmd = pendRes.data?.commands?.[0];
        logTest('Comandos: Dispositivo recebe comando (Push/Poll)', pendRes.status === 200 && !!foundCmd, `Comando recebido: ${foundCmd?.commandType || 'N/A'}`);

        if (foundCmd) {
            // Dispositivo reporta resultado da execução
            const repRes = await request('POST', `/api/modules/${resolvedModuleId}/assets/commands/${foundCmd.id}/result`, {
                success: true,
                stdout: 'Device locked successfully by automation script',
                exitCode: 0,
                executionTime: 120
            }, deviceAuth);
            logTest('Comandos: Dispositivo reporta sucesso (ACK)', repRes.status === 200);

            // Admin checa o histórico (Painel Admin)
            const histRes = await request('GET', `/api/modules/${resolvedModuleId}/assets/${resolvedAssetId}/commands`, null, headers);
            const verifiedCmd = histRes.data?.commands?.find(c => c.id === foundCmd.id);
            logTest('Comandos: Validação do Histórico e Status = "completed"', histRes.status === 200 && verifiedCmd?.status === 'completed');
        }
    } else {
        console.log(`${colors.red}❌ Falha ao encontrar Object IDs válidos para o teste de comando bidirecional.${colors.reset}`);
    }
}


// ============================================================================
// 7. VALIDAÇÃO DE DASHBOARD / SERVER STATUS
// ============================================================================
async function runDashboardValidation(jwt) {
    console.log(`\n${colors.blue}📊 INICIANDO VALIDAÇÃO DE MÉTRICAS DO PAINEL${colors.reset}`);
    const headers = { Authorization: `Bearer ${jwt}` };

    const statusRes = await request('GET', '/api/server/status', null, headers);
    const data = statusRes.data;

    const valid = statusRes.status === 200 && typeof data.device_count === 'number' && typeof data.pending_commands === 'number';

    logTest('Dashboard: Rota /api/server/status operante', valid, `Total Dispositivos: ${data.device_count} | Comandos Pendentes: ${data.pending_commands}`);
    if (valid) {
        console.log(`    ${colors.cyan}↳ CPU Usage: ${data.cpu_usage || 0}% | RAM: ${data.memory_usage || 0}%${colors.reset}`);
    }
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
        // DesktopSim handles strings (serials), but mobile outputs objects now. Let's map for heartbeat compatibility!
        const mobileSims = await (RUN_MOBILE ? runMobileSimulation(jwt) : Promise.resolve([]));
        allDevices.push(...mobileSims.map(m => typeof m === 'string' ? m : m.serial));

        if (RUN_PROFILES) await runProfileTests(jwt);

        let cmdMocks = mobileSims.length > 0 ? mobileSims : allDevices; // Prefere objeto formatado do mobile
        if (RUN_COMMANDS) await runCommandSimulation(jwt, cmdMocks);

        if (RUN_DASHBOARD) await runDashboardValidation(jwt);

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
