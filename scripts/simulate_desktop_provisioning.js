const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api';
const AUTH_TOKEN = 'hap@2025';

async function runSimulation() {
    console.log('--- DESKTOP PROVISIONING SIMULATION ---');

    // 1. Generate Token
    console.log('1. Generating Token...');
    try {
        const resTok = await axios.post(`${API_URL}/provisioning/generate-token`, {
            organization: 'Sim Org',
            config_profile: 'Simulation Profile'
        }, { headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` } });

        const token = resTok.data.token;
        console.log(`✅ Token Generated: ${token}`);

        // 2. Download File
        console.log('2. Downloading Client...');
        const downloadUrl = `${API_URL}/provisioning/download/desktop/${token}`;
        const resDown = await axios.get(downloadUrl, { responseType: 'stream' });

        const contentDisposition = resDown.headers['content-disposition'];
        console.log(`   Header: ${contentDisposition}`);

        const expectedFilename = `UnifiedDesktop-${token}.exe`;
        if (contentDisposition.includes(expectedFilename)) {
            console.log(`✅ Filename correct: ${expectedFilename}`);
        } else {
            console.error(`❌ Filename Mismatch! Expected ${expectedFilename}`);
            process.exit(1);
        }

        // 3. Simulate Client Logic (Regex)
        console.log('3. Verifying Client Logic...');
        // Mimic main.js logic
        const simulatedExecPath = `C:\\Program Files\\Unified Agent\\${expectedFilename}`;
        const fileName = path.basename(simulatedExecPath);
        const tokenMatch = fileName.match(/UnifiedDesktop-([a-fA-F0-9]{64})\.exe/);

        if (tokenMatch && tokenMatch[1] === token) {
            console.log(`✅ Client Regex Extracted Token: ${tokenMatch[1]}`);
        } else {
            console.error(`❌ Client Regex Failed!`);
            process.exit(1);
        }

    } catch (e) {
        console.error('❌ Simulation Failed:', e.message);
        if (e.response) console.error(e.response.data);
    }
}

runSimulation();
