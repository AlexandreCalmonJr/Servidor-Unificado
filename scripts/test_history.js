// ===================================================================
// Script de Teste: Histórico de Localização e Manutenção
// Localização: /scripts/test_history.js
// Uso: node scripts/test_history.js
//
// Este script:
// 1. Cria um dispositivo de teste.
// 2. Muda a localização dele (para criar Histórico de Localização).
// 3. Marca como "Recolhido pela TI" (para criar Histórico de Manutenção).
// 4. Marca como "Em Manutenção" (para adicionar ao histórico).
// 5. Retorna à produção (para adicionar ao histórico).
// ===================================================================

require('dotenv').config();
const axios = require('axios');

// ===== CONFIGURAÇÕES =====
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
// ❗️ Use seu token de ADMIN (JWT) aqui, não o token de dispositivo
const AUTH_TOKEN = process.env.TEST_TOKEN || 'hap@2025'; 

if (AUTH_TOKEN === 'seu_token_jwt_admin_aqui') {
    console.error('\n❌ ERRO: Configure o AUTH_TOKEN no arquivo .env ou direto no script');
    console.error('💡 Adicione: TEST_TOKEN=seu_token_jwt_admin_aqui');
    process.exit(1);
}

// ===== DADOS DO DISPOSITIVO DE TESTE =====
// Usamos um serial único para garantir que todas as operações
// sejam no mesmo dispositivo
const TEST_SERIAL = `HIST-TEST-${Date.now()}`;
const deviceData = {
    device_id: `TEST-DEVICE-HISTORY`,
    device_name: `Teste Histórico UTI-1`,
    device_model: 'iPad Pro (Teste)',
    serial_number: TEST_SERIAL,
    imei: `355555${String(Date.now()).slice(-9)}`,
    battery: 80,
    sector: 'UTI',
    floor: '3º Andar',
    unit: 'Hospital Central',
    mac_address_radio: 'AA:BB:CC:00:11:22', // Localização Inicial
    ip_address: '192.168.1.10',
    last_seen: new Date().toISOString(),
    status: 'online',
};

const http = axios.create({
    headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 1. Cria o dispositivo
 */
async function createDevice() {
    console.log(`\n[PASSO 1/5] 📱 Criando dispositivo: ${TEST_SERIAL}`);
    try {
        await http.post(`${SERVER_URL}/api/devices/data`, deviceData);
        console.log(`✅ Dispositivo criado com BSSID: ${deviceData.mac_address_radio}`);
    } catch (error) {
        console.error('❌ FALHA AO CRIAR DISPOSITIVO:', error.response?.data?.message || error.message);
        throw error; // Para o script se falhar
    }
}

/**
 * 2. Muda a localização (BSSID)
 */
async function changeLocation() {
    console.log(`\n[PASSO 2/5] 📍 Mudando localização do dispositivo...`);
    
    // Simula o dispositivo conectando em outra rede
    const newData = {
        ...deviceData,
        mac_address_radio: 'AA:BB:CC:99:88:77', // <-- NOVO BSSID
        ip_address: '10.20.30.40',
        last_seen: new Date().toISOString(),
    };

    try {
        const response = await http.post(`${SERVER_URL}/api/devices/data`, newData);
        console.log(`✅ Localização alterada. Novo BSSID: ${newData.mac_address_radio}`);
        console.log(`  (AGORA DEVE HAVER 1 REGISTRO NO HISTÓRICO DE LOCALIZAÇÃO)`);
    } catch (error) {
        console.error('❌ FALHA AO MUDAR LOCALIZAÇÃO:', error.response?.data?.message || error.message);
    }
}

/**
 * 3. Marca como "Recolhido pela TI"
 */
async function setCollectedByIT() {
    console.log(`\n[PASSO 3/5] 📦 Marcando como "Recolhido pela TI"...`);
    
    const reason = "TESTE DE RECOLHIMENTO";
    const historyEntry = {
        timestamp: new Date().toISOString(),
        status: 'collected_by_it',
        reason: reason,
    };

    try {
        const response = await http.post(`${SERVER_URL}/api/devices/executeCommand`, {
            serial_number: TEST_SERIAL,
            command: 'set_maintenance',
            maintenance_status: true,
            maintenance_reason: 'collected_by_it', // <-- Chave
            maintenance_ticket: reason, // O app usa a razão como ticket aqui
            maintenance_history_entry: JSON.stringify(historyEntry), // <-- Chave do Histórico
        });
        console.log(`✅ Status alterado para "Recolhido pela TI"`);
        console.log(`  (AGORA DEVE HAVER 1 REGISTRO NO HISTÓRICO DE MANUTENÇÃO)`);
    } catch (error) {
        console.error('❌ FALHA AO MARCAR COMO RECOLHIDO:', error.response?.data?.message || error.message);
    }
}

/**
 * 4. Marca como "Em Manutenção" (transição de Recolhido -> Manutenção)
 */
async function setInMaintenance() {
    console.log(`\n[PASSO 4/5] 🔧 Marcando como "Em Manutenção" (Chamado 123)...`);
    
    const ticket = "CHAMADO-123";
    const historyEntry = {
        timestamp: new Date().toISOString(),
        status: 'entered_maintenance',
        ticket: ticket,
    };

    try {
        const response = await http.post(`${SERVER_URL}/api/devices/executeCommand`, {
            serial_number: TEST_SERIAL,
            command: 'set_maintenance',
            maintenance_status: true,
            maintenance_reason: 'maintenance', // <-- Chave
            maintenance_ticket: ticket,
            maintenance_history_entry: JSON.stringify(historyEntry), // <-- Chave do Histórico
        });
        console.log(`✅ Status alterado para "Em Manutenção"`);
        console.log(`  (AGORA DEVE HAVER 2 REGISTROS NO HISTÓRICO DE MANUTENÇÃO)`);
    } catch (error) {
        console.error('❌ FALHA AO MARCAR COMO MANUTENÇÃO:', error.response?.data?.message || error.message);
    }
}

/**
 * 5. Retorna à Produção
 */
async function returnToProduction() {
    console.log(`\n[PASSO 5/5] ✅ Retornando à Produção...`);
    
    const historyEntry = {
        timestamp: new Date().toISOString(),
        status: 'returned_to_production',
    };

    try {
        const response = await http.post(`${SERVER_URL}/api/devices/executeCommand`, {
            serial_number: TEST_SERIAL,
            command: 'set_maintenance',
            maintenance_status: false,
            maintenance_reason: '', 
            maintenance_ticket: '',
            maintenance_history_entry: JSON.stringify(historyEntry), // <-- Chave do Histórico
        });
        console.log(`✅ Status alterado para "Produção"`);
        console.log(`  (AGORA DEVE HAVER 3 REGISTROS NO HISTÓRICO DE MANUTENÇÃO)`);
    } catch (error) {
        console.error('❌ FALHA AO RETORNAR À PRODUÇÃO:', error.response?.data?.message || error.message);
    }
}


/**
 * Executa todos os testes em sequência
 */
async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 INICIANDO TESTE COMPLETO DE HISTÓRICO');
    console.log(`   Dispositivo: ${TEST_SERIAL}`);
    console.log('='.repeat(60));

    try {
        await createDevice();
        await delay(2000); // Espera 2s

        await changeLocation();
        await delay(2000); // Espera 2s

        await setCollectedByIT();
        await delay(2000); // Espera 2s

        await setInMaintenance();
        await delay(2000); // Espera 2s

        await returnToProduction();

        console.log('\n' + '='.repeat(60));
        console.log('🏁 TESTE FINALIZADO!');
        console.log(`   Vá para o painel e procure pelo dispositivo: ${TEST_SERIAL}`);
        console.log('   Ele deve ter 1 registro de localização e 3 de manutenção.');
        console.log('='.repeat(60));

    } catch (error) {
        console.error("\n\n❌ O TESTE FALHOU DE FORMA CRÍTICA. Verifique o erro acima.");
    }
}

main();