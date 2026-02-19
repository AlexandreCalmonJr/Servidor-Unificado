require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

// --- CONFIGURATION ---
const API_URL = 'http://localhost:3000/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'hap@2025';

// --- LOGGING ---
function log(msg, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    console.log(`${icon} [${timestamp}] ${msg}`);
}

const client = axios.create({
    baseURL: API_URL,
    headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
    validateStatus: () => true // Handle 4xx/5xx manually
});

async function runSimulation() {
    console.log('--- SYSTEM SIMULATION STARTED ---');
    console.log(`Target: ${API_URL}\n`);

    // 1. Connection Check
    log('1. Checking Server Connection...');
    const resStatus = await client.get('/status');
    if (resStatus.status !== 200) {
        log(`Server Unreachable (${resStatus.status})`, 'error');
        process.exit(1);
    }
    log('Server reachable', 'success');

    // 2. Setup Profiles (One for Mobile, One for Totem)
    log('2. Setting up Config Profiles...');

    // 2.1 Mobile Profile
    const PROFILE_MOBILE = 'Simulation Client Mobile';
    try {
        await client.post('/config-profiles', {
            name: PROFILE_MOBILE,
            module_type: 'mobile',
            description: 'Profile for Mobile Simulation',
            settings: { mandatory_apps: [] }
        });
        log('  Mobile Profile Ready', 'success');
    } catch (e) {
        if (e.response && e.response.status === 409) log('  Mobile Profile Exists', 'success');
        else log(`  Mobile Profile Setup Failed: ${e.message}`, 'error');
    }

    // 2.2 Totem Profile
    const PROFILE_TOTEM = 'Simulation Client Totem';
    try {
        await client.post('/config-profiles', {
            name: PROFILE_TOTEM,
            module_type: 'totem',
            description: 'Profile for Totem Simulation',
            settings: { restrictions: { disable_usb: true } }
        });
        log('  Totem Profile Ready', 'success');
    } catch (e) {
        if (e.response && e.response.status === 409) log('  Totem Profile Exists', 'success');
        else log(`  Totem Profile Setup Failed: ${e.message}`, 'error');
    }

    // 3. Test Provisioning (MOBILE)
    log('3. Testing Provisioning Flow (MOBILE)...');

    // A. Generate Token
    const resGenMob = await client.post('/provisioning/generate-token', {
        organization: 'Sim Corp',
        config_profile: PROFILE_MOBILE
    });
    const TOKEN_MOBILE = resGenMob.data.token;
    log(`  Token (Mobile): ${TOKEN_MOBILE}`, 'success');

    // B. Enroll Mobile
    const SERIAL_MOBILE = `SIM-MOB-${Date.now()}`;
    const resEnrollMob = await client.post('/provisioning/enroll', {
        provisioning_token: TOKEN_MOBILE,
        device_id: SERIAL_MOBILE,
        device_name: 'Simulated Mobile 01',
        serial_number: SERIAL_MOBILE,
        android_id: 'ANDROID_ID_12345', // Forces recognition as Mobile via old logic too
        mac_address_radio: 'AA:BB:CC:DD:EE:01'
    });

    if (resEnrollMob.status === 200) {
        log('  Enroll Successful (Mobile)', 'success');
    } else {
        log(`  Enroll Failed (Mobile): ${resEnrollMob.data.error}`, 'error');
    }

    // 4. Test Provisioning (TOTEM)
    log('4. Testing Provisioning Flow (TOTEM)...');

    // A. Generate Token
    const resGenTotem = await client.post('/provisioning/generate-token', {
        organization: 'Sim Corp',
        config_profile: PROFILE_TOTEM
    });
    const TOKEN_TOTEM = resGenTotem.data.token;
    log(`  Token (Totem): ${TOKEN_TOTEM}`, 'success');

    // B. Enroll Totem
    const SERIAL_TOTEM = `SIM-TOT-${Date.now()}`;
    const resEnrollTotem = await client.post('/provisioning/enroll', {
        provisioning_token: TOKEN_TOTEM,
        device_id: SERIAL_TOTEM,
        device_name: 'Simulated Totem 01',
        serial_number: SERIAL_TOTEM,
        // No android/mobile fields. Should rely on ConfigProfile.module_type = 'totem'
        ip_address: '192.168.1.100',
        mac_address_radio: 'AA:BB:CC:DD:EE:02'
    });

    if (resEnrollTotem.status === 200) {
        log('  Enroll Successful (Totem)', 'success');
    } else {
        log(`  Enroll Failed (Totem): ${resEnrollTotem.data.error}`, 'error');
    }

    // 5. Verify Asset Types (API Check)
    log('5. Verifying Asset Types...');

    // Check Mobile Module
    const resMobList = await client.get('/modules/mobile/assets');
    const mobFound = resMobList.data.assets.find(a => a.serial_number === SERIAL_MOBILE);
    if (mobFound) log('  Mobile Asset Found in Mobile Module', 'success');
    else log('  Mobile Asset NOT Found in Mobile Module', 'error');

    // Check Totem Module
    // Assuming backend endpoint /modules/totem/assets exists and works similarly
    const resTotemList = await client.get('/modules/totem/assets');
    // If endpoint doesn't exist yet, this might fail (404), but let's check
    if (resTotemList.status === 200) {
        log(`  Totem Module Assets Count: ${resTotemList.data.assets.length}`);
        // console.dir(resTotemList.data.assets, { depth: 1 });
        const totemFound = resTotemList.data.assets.find(a => a.serial_number === SERIAL_TOTEM);
        if (totemFound) log('  Totem Asset Found in Totem Module', 'success');
        else log('  Totem Asset NOT Found in Totem Module', 'error');
    } else {
        log(`  Totem Module List Failed (${resTotemList.status}) - maybe endpoint not mapped?`, 'info');
    }

    console.log('\n--- SIMULATION COMPLETED ---');
}

runSimulation();
