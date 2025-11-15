// ===================================================================
// Script: Gerador de Dados Vivos (para Painel)
// Localização: /scripts/test_live_assets.js
// Uso: node scripts/test_live_assets.js
//
// Este script:
// 1. Encontra seus módulos "notebook" e "desktop" existentes.
// 2. Cria 5 ativos de teste DENTRO desses módulos.
// 3. Deixa um ativo "Em Manutenção" para teste.
// 4. NÃO EXCLUI NADA no final.
// ===================================================================

require('dotenv').config();
const axios = require('axios');

// ===== CONFIGURAÇÕES =====
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
// ❗️ IMPORTANTE: Este deve ser um token JWT de ADMIN (o mesmo do painel)
const AUTH_TOKEN = process.env.TEST_TOKEN || 'seu_token_jwt_admin_aqui';

// Cliente HTTP com autenticação de Admin
const http = axios.create({
    headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// --- Helpers ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const logSuccess = (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`); // Verde
const logError = (msg) => console.error(`\x1b[31m❌ ${msg}\x1b[0m`); // Vermelho
const logInfo = (msg) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`); // Ciano

// --- Funções de Geração de Dados ---

function generateNotebook(i) {
    const locations = ['TI', 'UTI-1', 'Recepção', 'Enfermaria-A', 'Diretoria'];
    const location = locations[i % locations.length];
    
    return {
        asset_name: `Notebook-${location}-${i+1}`,
        serial_number: `NT-SN-${Date.now() + i}`,
        hostname: `NT-HOST-${location}-${i+1}`,
        model: "Dell Latitude 5430",
        manufacturer: "Dell",
        processor: "Intel Core i5-1235U",
        ram: "16GB",
        storage: "256GB SSD",
        ip_address: `192.168.0.${100 + i}`,
        mac_address: `AA:BB:CC:DD:00:${10 + i}`,
        bssid: `AA:BB:CC:DD:EE:0${i}`,
        battery_level: Math.floor(Math.random() * 70) + 30,
        battery_health: "Good",
        location: location,
        current_user: `usuario.${location.toLowerCase()}`,
        operating_system: "Windows 11 Pro",
    };
}

function generateDesktop(i) {
    const locations = ['Triagem', 'UTI-2', 'Balcão-Atendimento'];
    const location = locations[i % locations.length];

    return {
        asset_name: `Desktop-${location}-${i+1}`,
        serial_number: `DT-SN-${Date.now() + i}`,
        hostname: `DT-HOST-${location}-${i+1}`,
        model: "Optiplex 3090",
        manufacturer: "Dell",
        processor: "Intel Core i3-10100",
        ram: "8GB",
        storage: "1TB HDD",
        storage_type: "HDD", //
        ip_address: `192.168.0.${200 + i}`,
        mac_address: `AA:BB:CC:DD:01:${10 + i}`,
        bssid: `AA:BB:CC:DD:FF:0${i}`,
        biometric_reader: "Sim", //
        connected_printer: "HP-TRIAGEM-01",
        java_version: "8.0_311",
        location: location,
        current_user: `atendimento.${location.toLowerCase()}`,
        operating_system: "Windows 10 Pro",
    };
}

// --- Função Core: Criar Ativo ---
async function createAsset(moduleId, assetData) {
    try {
        const response = await http.post(
            `${SERVER_URL}/api/modules/${moduleId}/assets`, // Rota de criação
            assetData
        );
        logSuccess(`Ativo criado: ${assetData.asset_name} (ID: ${response.data.asset._id})`);
        return response.data.asset; // Retorna o ativo criado
    } catch (error) {
        logError(`Falha ao criar ${assetData.asset_name}`);
        console.error(error.response?.data || error.message);
        return null;
    }
}

// --- Função Principal ---
async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 GERADOR DE DADOS VIVOS PARA O PAINEL');
    console.log(`   Servidor: ${SERVER_URL}`);
    console.log('='.repeat(60));

    // PASSO 0: Verificar Token
    if (AUTH_TOKEN === 'seu_token_jwt_admin_aqui' || AUTH_TOKEN === 'hap@2025') {
        logError('ERRO: O TEST_TOKEN no .env está incorreto!');
        logError('   Ele deve ser o seu Token JWT de Admin (começa com "eyJ...").');
        logError('   O token "hap@2025" é um token de dispositivo e não funciona aqui.');
        process.exit(1);
    }
    logSuccess("Autenticação (TEST_TOKEN) parece ser um JWT. Continuando...");

    let notebookModuleId = null;
    let desktopModuleId = null;

    try {
        // --- PASSO 1: Encontrar Módulos Existentes ---
        logInfo('\n--- PASSO 1: Procurando Módulos Existentes ---');
        const modulesResponse = await http.get(`${SERVER_URL}/api/modules`);
        
        const notebookModule = modulesResponse.data.modules.find((m) => m.type === 'notebook');
        const desktopModule = modulesResponse.data.modules.find((m) => m.type === 'desktop');

        if (notebookModule) {
            notebookModuleId = notebookModule._id;
            logSuccess(`Módulo "Notebook" encontrado. ID: ${notebookModuleId}`);
        } else {
            logError('Módulo "notebook" não encontrado. Pulando criação de notebooks.');
        }
        
        if (desktopModule) {
            desktopModuleId = desktopModule._id;
            logSuccess(`Módulo "Desktop" encontrado. ID: ${desktopModuleId}`);
        } else {
            logError('Módulo "desktop" não encontrado. Pulando criação de desktops.');
        }

        if (!notebookModuleId && !desktopModuleId) {
            logError("Nenhum módulo ('notebook' ou 'desktop') encontrado. Abortando.");
            process.exit(1);
        }

        // --- PASSO 2: Criar Ativos ---
        logInfo('\n--- PASSO 2: Criando Lote de Ativos (3 Notebooks, 2 Desktops) ---');
        
        if (notebookModuleId) {
            await createAsset(notebookModuleId, generateNotebook(0));
            await delay(500);
            await createAsset(notebookModuleId, generateNotebook(1));
            await delay(500);
        }
        
        if (desktopModuleId) {
            await createAsset(desktopModuleId, generateDesktop(0));
            await delay(500);
            await createAsset(desktopModuleId, generateDesktop(1));
            await delay(500);
        }

        // --- PASSO 3: Criar Ativo para Manutenção ---
        logInfo('\n--- PASSO 3: Criando Ativo para Teste de Manutenção ---');
        
        if (notebookModuleId) {
            const assetParaManutencao = await createAsset(notebookModuleId, generateNotebook(2));
            
            if (assetParaManutencao) {
                logInfo(`   Colocando "${assetParaManutencao.asset_name}" em manutenção...`);
                await delay(1000);

                const maintenancePayload = {
                    maintenance_status: true,
                    status: "maintenance",
                    maintenance_reason: "Troca de HD agendada"
                };
                
                // Usa a rota PATCH corrigida
                await http.patch(
                    `${SERVER_URL}/api/modules/${notebookModuleId}/assets/${assetParaManutencao._id}`,
                    maintenancePayload
                );
                logSuccess(`   "${assetParaManutencao.asset_name}" está em manutenção.`);
            }
        } else {
            logError("   P_ulando teste de manutenção (módulo notebook não encontrado).");
        }

        // --- FIM ---
        console.log('\n' + '='.repeat(60));
        logSuccess('🎉 GERAÇÃO DE DADOS CONCLUÍDA! 🎉');
        logInfo('Os dados NÃO foram excluídos.');
        logInfo('Vá para o seu painel e atualize (F5 ou Ctrl+Shift+R) para ver os novos ativos.');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        logError('❌ ERRO DURANTE A GERAÇÃO DE DADOS ❌');
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Dados: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            console.error(`   Mensagem: ${error.message}`);
        }
    }
}

// Executa o script
main();