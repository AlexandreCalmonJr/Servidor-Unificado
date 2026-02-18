// scripts/test_dashboard_stats.js
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/modules/totem/stats',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'auth_token': 'hap@2025' // Usando token de dispositivo para teste rápido (ou Bearer se tiver user)
        // O endpoint aceita 'flexibleAuth' que suporta auth_token se configurado
    }
};

const optionsMobile = {
    ...options,
    path: '/api/modules/mobile/stats'
};

function doRequest(opts, label) {
    const req = http.request(opts, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log(`\n=== TESTE ${label} ===`);
            console.log(`Status: ${res.statusCode}`);
            try {
                console.log('Resposta:', JSON.stringify(JSON.parse(data), null, 2));
            } catch (e) {
                console.log('Resposta Raw:', data);
            }
        });
    });

    req.on('error', (error) => {
        console.error(`Erro no teste ${label}:`, error);
    });

    req.end();
}

// Executa Dashboard Totem
doRequest(options, 'TOTEM DASHBOARD');

// Executa Dashboard Mobile (após um delay para não misturar logs)
setTimeout(() => {
    doRequest(optionsMobile, 'MOBILE DASHBOARD');
}, 1000);
