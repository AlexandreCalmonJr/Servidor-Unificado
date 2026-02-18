// scripts/test_totem_location.js
const http = require('http');

// Configuração
const HOST = 'localhost';
const PORT = 3000;
const PATH = '/api/monitor'; // Endpoint legado do Totem
const LEGACY_TOKEN = 'hap@2025';

// Dados de Teste
const TEST_TOTEM_IP_ONLY = {
    hostname: 'TEST-TOTEM-IP',
    serialNumber: 'SN-TEST-IP-001',
    ip: '192.168.1.105',
    totemType: 'totem'
};

const TEST_TOTEM_BSSID = {
    hostname: 'TEST-TOTEM-BSSID',
    serialNumber: 'SN-TEST-BSSID-001',
    ip: '10.0.0.99',
    mac_address_radio: 'AA:BB:CC:DD:EE:FF',
    totemType: 'totem'
};

// Função para enviar requisição
function sendHeartbeat(data) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);

        const options = {
            hostname: HOST,
            port: PORT,
            path: PATH,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'auth_token': LEGACY_TOKEN
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

async function runTests() {
    console.log('=== INICIANDO TESTES DE LOCALIZAÇÃO DO TOTEM (Native Node) ===\n');

    try {
        // 1. Teste IP Only
        console.log('1. Testando envio APENAS com IP...');
        const resIp = await sendHeartbeat(TEST_TOTEM_IP_ONLY);
        console.log(`Status: ${resIp.status}`);
        console.log('Resposta:', JSON.stringify(resIp.data, null, 2));
        console.log('--------------------------------------------------\n');

        // 2. Teste BSSID
        console.log('2. Testando envio com BSSID (Novo Recurso)...');
        const resBssid = await sendHeartbeat(TEST_TOTEM_BSSID);
        console.log(`Status: ${resBssid.status}`);
        console.log('Resposta:', JSON.stringify(resBssid.data, null, 2));
        console.log('--------------------------------------------------\n');

    } catch (err) {
        console.error('ERRO CRÍTICO NO TESTE:', err.message);
        if (err.code === 'ECONNREFUSED') {
            console.error('DICA: O servidor está rodando na porta 3000?');
        }
    }

    console.log('=== TESTES FINALIZADOS ===');
}

runTests();
