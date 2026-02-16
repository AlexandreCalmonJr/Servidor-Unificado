// Arquivo: test_server_endpoints.js
// Testes completos para todos os endpoints do servidor

const axios = require('axios');

// ===== CONFIGURAÇÃO =====
const BASE_URL = 'http://localhost:3000';
let authToken = '';
let testModuleId = '';
let testAssetId = '';
let testDeviceSerial = '';

// Cores para output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
    const symbol = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`${symbol} ${name}`, color);
    if (details) log(`   ${details}`, 'cyan');
}

// ===== TESTES DE AUTENTICAÇÃO =====
async function testAuth() {
    log('\n📝 TESTES DE AUTENTICAÇÃO', 'blue');

    try {
        // 1. Login
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });

        authToken = loginResponse.data.token;
        logTest('Login', !!authToken, `Token: ${authToken.substring(0, 20)}...`);

        // 2. Verificar Token
        const verifyResponse = await axios.get(`${BASE_URL}/api/auth/verify`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        logTest('Verificar Token', verifyResponse.data.valid, `User: ${verifyResponse.data.user.username}`);

        return true;
    } catch (error) {
        logTest('Autenticação', false, error.message);
        return false;
    }
}

// ===== TESTES DE MÓDULOS =====
async function testModules() {
    log('\n📦 TESTES DE MÓDULOS', 'blue');

    try {
        const headers = { Authorization: `Bearer ${authToken}` };

        // 1. Listar Módulos
        const listResponse = await axios.get(`${BASE_URL}/api/modules`, { headers });
        logTest('Listar Módulos', listResponse.data.success, `Total: ${listResponse.data.modules.length}`);

        // 2. Criar Módulo de Teste
        const createResponse = await axios.post(`${BASE_URL}/api/modules`, {
            name: 'Teste Automático Desktop',
            type: 'desktop',
            description: 'Módulo criado por teste automático',
            table_columns: [
                { dataKey: 'assetName', label: 'Nome' },
                { dataKey: 'serialNumber', label: 'Serial' }
            ]
        }, { headers });

        testModuleId = createResponse.data.module._id;
        logTest('Criar Módulo', createResponse.data.success, `ID: ${testModuleId}`);

        // 3. Buscar Módulo Específico
        const getResponse = await axios.get(`${BASE_URL}/api/modules/${testModuleId}`, { headers });
        logTest('Buscar Módulo', getResponse.data.success, `Nome: ${getResponse.data.module.name}`);

        // 4. Atualizar Módulo
        const updateResponse = await axios.put(`${BASE_URL}/api/modules/${testModuleId}`, {
            description: 'Descrição atualizada por teste'
        }, { headers });
        logTest('Atualizar Módulo', updateResponse.data.success);

        return true;
    } catch (error) {
        logTest('Módulos', false, error.response?.data?.message || error.message);
        return false;
    }
}

// ===== TESTES DE ASSETS =====
async function testAssets() {
    log('\n💻 TESTES DE ASSETS', 'blue');

    try {
        const headers = { Authorization: `Bearer ${authToken}` };

        // 1. Criar Asset
        const createResponse = await axios.post(`${BASE_URL}/api/modules/${testModuleId}/assets`, {
            serial_number: `TEST-${Date.now()}`,
            asset_name: 'Desktop Teste',
            hostname: 'DESKTOP-TEST',
            ip_address: '192.168.1.100',
            mac_address: '00:11:22:33:44:55',
            model: 'Dell OptiPlex 7090',
            manufacturer: 'Dell',
            processor: 'Intel i7',
            ram: '16GB',
            storage: '512GB',
            storage_type: 'SSD',
            operating_system: 'Windows 11',
            os_version: '23H2'
        }, { headers });

        testAssetId = createResponse.data.asset._id || createResponse.data.asset.id;
        logTest('Criar Asset', createResponse.data.success, `ID: ${testAssetId}`);

        // 2. Listar Assets
        const listResponse = await axios.get(`${BASE_URL}/api/modules/${testModuleId}/assets`, { headers });
        logTest('Listar Assets', listResponse.data.success, `Total: ${listResponse.data.total_count}`);

        // 3. Atualizar Asset
        const updateResponse = await axios.put(`${BASE_URL}/api/modules/${testModuleId}/assets/${testAssetId}`, {
            location: 'Sala TI - Teste'
        }, { headers });
        logTest('Atualizar Asset', updateResponse.data.success);

        return true;
    } catch (error) {
        logTest('Assets', false, error.response?.data?.message || error.message);
        return false;
    }
}

// ===== TESTES DE COMANDOS =====
async function testCommands() {
    log('\n⚡ TESTES DE COMANDOS', 'blue');

    try {
        const headers = { Authorization: `Bearer ${authToken}` };

        // 1. Enviar Comando
        const sendResponse = await axios.post(
            `${BASE_URL}/api/modules/${testModuleId}/assets/${testAssetId}/commands`,
            { commandType: 'flush_dns' },
            { headers }
        );
        logTest('Enviar Comando', sendResponse.data.success, `Command ID: ${sendResponse.data.command.id}`);

        // 2. Buscar Histórico de Comandos
        const historyResponse = await axios.get(
            `${BASE_URL}/api/modules/${testModuleId}/assets/${testAssetId}/commands`,
            { headers }
        );
        logTest('Histórico de Comandos', historyResponse.data.success, `Total: ${historyResponse.data.commands.length}`);

        return true;
    } catch (error) {
        logTest('Comandos', false, error.response?.data?.message || error.message);
        return false;
    }
}

// ===== TESTES DE MANUTENÇÃO =====
async function testMaintenance() {
    log('\n🔧 TESTES DE MANUTENÇÃO', 'blue');

    try {
        const headers = { Authorization: `Bearer ${authToken}` };

        // 1. Colocar em Manutenção
        const setResponse = await axios.put(
            `${BASE_URL}/api/modules/${testModuleId}/assets/${testAssetId}/maintenance`,
            {
                maintenance_status: true,
                maintenance_ticket: 'TEST-001',
                maintenance_reason: 'Teste automático de manutenção',
                maintenance_history_entry: JSON.stringify({
                    timestamp: new Date().toISOString(),
                    status: 'Em Manutenção',
                    ticket: 'TEST-001',
                    reason: 'Teste automático'
                })
            },
            { headers }
        );
        logTest('Colocar em Manutenção', setResponse.data.success);

        // 2. Buscar Histórico
        const historyResponse = await axios.get(
            `${BASE_URL}/api/modules/${testModuleId}/assets/${testAssetId}/history`,
            { headers }
        );
        logTest('Histórico de Manutenção', historyResponse.data.success, `Entradas: ${historyResponse.data.history.length}`);

        // 3. Retirar de Manutenção
        const removeResponse = await axios.put(
            `${BASE_URL}/api/modules/${testModuleId}/assets/${testAssetId}/maintenance`,
            {
                maintenance_status: false,
                maintenance_history_entry: JSON.stringify({
                    timestamp: new Date().toISOString(),
                    status: 'Operacional',
                    reason: 'Teste concluído'
                })
            },
            { headers }
        );
        logTest('Retirar de Manutenção', removeResponse.data.success);

        return true;
    } catch (error) {
        logTest('Manutenção', false, error.response?.data?.message || error.message);
        return false;
    }
}

// ===== TESTES DE DEVICES (MOBILE) =====
async function testDevices() {
    log('\n📱 TESTES DE DEVICES (MOBILE)', 'blue');

    try {
        const headers = { Authorization: `Bearer ${authToken}` };
        testDeviceSerial = `MOBILE-TEST-${Date.now()}`;

        // 1. Enviar Dados de Device
        const dataResponse = await axios.post(`${BASE_URL}/api/devices/data`, {
            device_id: 'test-device-001',
            device_name: 'Tablet Teste',
            serial_number: testDeviceSerial,
            device_model: 'Samsung Galaxy Tab',
            imei: '123456789012345',
            battery: 85,
            network: 'WiFi',
            ip_address: '192.168.1.200',
            mac_address_radio: 'AA:BB:CC:DD:EE:FF'
        }, { headers });
        logTest('Enviar Dados Device', dataResponse.data.success);

        // 2. Heartbeat
        const heartbeatResponse = await axios.post(`${BASE_URL}/api/devices/heartbeat`, {
            serial_number: testDeviceSerial
        }, { headers });
        logTest('Heartbeat Device', heartbeatResponse.data.success);

        // 3. Listar Devices
        const listResponse = await axios.get(`${BASE_URL}/api/devices`, { headers });
        logTest('Listar Devices', listResponse.data.success, `Total: ${listResponse.data.count}`);

        // 4. Executar Comando em Device
        const commandResponse = await axios.post(`${BASE_URL}/api/devices/executeCommand`, {
            serial_number: testDeviceSerial,
            command: 'set_maintenance',
            maintenance_status: true,
            maintenance_ticket: 'MOBILE-TEST-001',
            maintenance_reason: 'Teste de comando'
        }, { headers });
        logTest('Comando Device', commandResponse.data.success);

        return true;
    } catch (error) {
        logTest('Devices', false, error.response?.data?.message || error.message);
        return false;
    }
}

// ===== TESTES DE LOCALIZAÇÕES =====
async function testLocations() {
    log('\n📍 TESTES DE LOCALIZAÇÕES', 'blue');

    try {
        const headers = { Authorization: `Bearer ${authToken}` };

        // 1. Listar Localizações
        const listResponse = await axios.get(`${BASE_URL}/api/locations`, { headers });
        logTest('Listar Localizações', listResponse.data.success, `Total: ${listResponse.data.locations?.length || 0}`);

        // 2. Resumo de Localizações
        const summaryResponse = await axios.get(`${BASE_URL}/api/devices/locations/summary`, { headers });
        logTest('Resumo de Localizações', summaryResponse.data.success, `Locais: ${summaryResponse.data.locations?.length || 0}`);

        return true;
    } catch (error) {
        logTest('Localizações', false, error.response?.data?.message || error.message);
        return false;
    }
}

// ===== LIMPEZA =====
async function cleanup() {
    log('\n🧹 LIMPEZA', 'blue');

    try {
        const headers = { Authorization: `Bearer ${authToken}` };

        // 1. Deletar Asset
        if (testAssetId) {
            await axios.delete(`${BASE_URL}/api/modules/${testModuleId}/assets/${testAssetId}`, { headers });
            logTest('Deletar Asset', true);
        }

        // 2. Deletar Módulo
        if (testModuleId) {
            await axios.delete(`${BASE_URL}/api/modules/${testModuleId}`, { headers });
            logTest('Deletar Módulo', true);
        }

        // 3. Deletar Device
        if (testDeviceSerial) {
            await axios.delete(`${BASE_URL}/api/devices/${testDeviceSerial}`, { headers });
            logTest('Deletar Device', true);
        }

        return true;
    } catch (error) {
        logTest('Limpeza', false, error.response?.data?.message || error.message);
        return false;
    }
}

// ===== EXECUTAR TODOS OS TESTES =====
async function runAllTests() {
    log('\n' + '='.repeat(60), 'cyan');
    log('🧪 INICIANDO TESTES COMPLETOS DO SERVIDOR', 'cyan');
    log('='.repeat(60) + '\n', 'cyan');

    const startTime = Date.now();

    try {
        // Executar testes em sequência
        await testAuth();
        await testModules();
        await testAssets();
        await testCommands();
        await testMaintenance();
        await testDevices();
        await testLocations();
        await cleanup();

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        log('\n' + '='.repeat(60), 'cyan');
        log(`✅ TESTES CONCLUÍDOS EM ${duration}s`, 'green');
        log('='.repeat(60) + '\n', 'cyan');

    } catch (error) {
        log('\n❌ ERRO GERAL NOS TESTES:', 'red');
        log(error.message, 'red');
    }
}

// ===== EXECUTAR =====
if (require.main === module) {
    runAllTests();
}

module.exports = { runAllTests };
