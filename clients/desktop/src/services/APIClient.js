/**
 * APIClient.js
 * Responsável por fazer requisições HTTP ao servidor
 * Extraído de: CommandPoller.js → todos os axios.post/get
 */

const axios = require('axios');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTH HEADERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getHeaders(token) {
    if (!token) return { 'Content-Type': 'application/json' };
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'AUTH_TOKEN': token,
    };
}

function getLegacyHeaders(token) {
    return {
        'Content-Type': 'application/json',
        'AUTH_TOKEN': token || '',
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODULE OPERATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchModuleStructure(serverUrl, moduleId, token) {
    try {
        const response = await axios.get(`${serverUrl}/api/modules/${moduleId}`, {
            headers: getHeaders(token),
            timeout: 10000,
            proxy: false,
        });
        return response.data?.module || response.data;
    } catch (error) {
        console.error('[APIClient] ❌ Erro ao buscar estrutura do módulo:', error.message);
        throw error;
    }
}

async function listModules(serverUrl, token) {
    try {
        const response = await axios.get(`${serverUrl}/api/modules`, {
            headers: getHeaders(token),
            timeout: 10000,
            proxy: false,
        });
        return response.data?.modules || [];
    } catch (error) {
        console.error('[APIClient] ❌ Erro ao listar módulos:', error.message);
        throw error;
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ASSET OPERATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function sendAssetToModule(serverUrl, moduleId, payload, token) {
    try {
        const response = await axios.post(
            `${serverUrl}/api/modules/${moduleId}/assets`,
            payload,
            { headers: getHeaders(token), timeout: 30000, proxy: false }
        );

        const wasUpdated = response.data?.updated === true;
        const message = wasUpdated ? 'atualizado' : 'criado';
        console.log(`[APIClient] ✅ Ativo ${message}: ${payload.asset_name} (S/N: ${payload.serial_number})`);

        return {
            success: true,
            updated: wasUpdated,
            data: response.data,
        };
    } catch (error) {
        console.error('[APIClient] ❌ Erro ao enviar ativo para módulo:', error.message);
        if (error.response?.data) {
            console.error('[APIClient] Resposta do servidor:', error.response.data);
        }
        throw error;
    }
}

async function sendLegacyData(serverUrl, payload, token) {
    try {
        const response = await axios.post(`${serverUrl}/api/monitor`, payload, {
            headers: getLegacyHeaders(token),
            timeout: 30000,
        });

        const location = response.data?.location || 'Desconhecida';
        console.log(`[APIClient] ✅ Dados enviados ao endpoint legado. Localização: ${location}`);

        return {
            success: true,
            location,
            data: response.data,
        };
    } catch (error) {
        console.error('[APIClient] ❌ Erro ao enviar dados legados:', error.message);
        if (error.response?.data) {
            console.error('[APIClient] Resposta do servidor:', error.response.data);
        }
        throw error;
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMAND OPERATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchPendingCommands(serverUrl, moduleId, serialNumber, token) {
    try {
        const uri = `${serverUrl}/api/modules/${moduleId}/assets/commands/pending?serial_number=${encodeURIComponent(serialNumber)}`;
        const response = await axios.get(uri, {
            headers: getHeaders(token),
            timeout: 15000,
            proxy: false,
        });
        return response.data?.commands || [];
    } catch (error) {
        console.warn('[APIClient] ⚠️ Erro ao buscar comandos:', error.message);
        return [];
    }
}

async function reportCommandResult(serverUrl, moduleId, commandId, token, resultData) {
    try {
        const { success, stdout, stderr, exitCode, executionTime } = resultData;
        const body = {
            success,
            stdout: stdout.length > 5000 ? stdout.substring(0, 5000) : stdout,
            stderr: stderr.length > 2000 ? stderr.substring(0, 2000) : stderr,
            exitCode,
            executionTime,
        };

        const response = await axios.post(
            `${serverUrl}/api/modules/${moduleId}/assets/commands/${commandId}/result`,
            body,
            { headers: getHeaders(token), timeout: 15000, proxy: false }
        );

        if (response.status === 200) {
            console.log('[APIClient] ✅ Resultado reportado ao servidor');
        } else {
            console.warn(`[APIClient] ⚠️ Falha ao reportar resultado: ${response.status}`);
        }
    } catch (error) {
        console.error('[APIClient] ❌ Erro ao reportar resultado:', error.message);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports = {
    getHeaders,
    getLegacyHeaders,
    fetchModuleStructure,
    listModules,
    sendAssetToModule,
    sendLegacyData,
    fetchPendingCommands,
    reportCommandResult,
};
