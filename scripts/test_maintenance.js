require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'hap@2025';

async function testMaintenance() {
    console.log('--- TESTING MAINTENANCE ROUTE ---');
    const client = axios.create({
        baseURL: API_URL,
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
        validateStatus: () => true
    });

    // 1. Send status check
    const status = await client.get('/status');
    if (status.status !== 200) {
        console.error('Server not reachable');
        return;
    }

    // 2. Get Modules to find a valid one (e.g., Totems or Mobiles)
    const modulesRes = await client.get('/modules');
    const modules = modulesRes.data.modules;
    const totemModule = modules.find(m => m.type === 'totem');

    if (!totemModule) {
        console.error('No Totem module found');
        return;
    }
    console.log(`Module Found: ${totemModule.name} (ID: ${totemModule.id})`);

    // 3. Get Assets in that module
    const assetsRes = await client.get(`/modules/${totemModule.id}/assets`);
    const assets = assetsRes.data.assets;

    if (assets.length === 0) {
        console.error('No assets found in Totem module');
        return;
    }
    const asset = assets[0];
    console.log(`Asset Found: ${asset.asset_name} (ID: ${asset._id})`);

    // 4. Try to PUT maintenance
    console.log(`Attempting PUT /modules/${totemModule.id}/assets/${asset._id}/maintenance`);
    const payload = {
        maintenance_status: true,
        maintenance_ticket: 'TEST-123',
        maintenance_reason: 'Testing Route'
    };

    const maintRes = await client.put(`/modules/${totemModule.id}/assets/${asset._id}/maintenance`, payload);
    console.log(`Response Status: ${maintRes.status}`);
    console.log('Response Data:', maintRes.data);
}

testMaintenance();
