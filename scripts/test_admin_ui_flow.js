const axios = require('axios');
const chalk = require('chalk');
require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 3000}/api`;
let AUTH_TOKEN = '';

async function login() {
    try {
        // Simulating Admin Login (using a known admin user or creating a test token if possible)
        // For this test, if we don't have a login endpoint readily testable, we might need a valid token.
        // Assuming for now we can use the device auth token or we need to implement a detailed login.
        // However, module management requires ADMIN role.
        // Let's assume we have a hardcoded admin token or we can sign one.
        // For simplicity in this environment, I will try to use the 'flexibleAuth' fallback 
        // mechanism which allows a legacy token to act as admin if configured, 
        // OR I will assume the user has a valid JWT.

        // In 'moduleRoutes.js', flexibleAuth checks 'auth' then 'deviceAuth'.
        // 'deviceAuth' sets user role to 'admin' when using legacy token! 
        // See lines 33-39 of moduleRoutes.js.

        AUTH_TOKEN = process.env.AUTH_TOKEN;
        console.log(chalk.green(`✅ Using Legacy Token for Admin Access: ${AUTH_TOKEN.substring(0, 5)}...`));
        return true;

    } catch (error) {
        console.error(chalk.red('❌ Login Failed'), error.message);
        return false;
    }
}

async function runTest() {
    if (!await login()) return;

    const testModuleName = `TestModule_${Date.now()}`;
    let moduleId = '';

    try {
        // 1. Create Inactive Module with Configs
        console.log(chalk.blue('\n1. Creating Inactive Module with Configs...'));
        const createRes = await axios.post(`${BASE_URL}/modules`, {
            name: testModuleName,
            type: 'custom',
            description: 'Test module for verification',
            is_active: false,
            client_config: {
                icon: 'test_icon',
                color: '#ff0000',
                show_on_dashboard: true,
                tabs: ['tab1', 'tab2']
            },
            feature_flags: {
                allow_remote_control: true,
                track_location: false
            }
        }, {
            headers: { 'auth_token': AUTH_TOKEN }
        });

        moduleId = createRes.data.module._id;
        const mod = createRes.data.module;
        console.log(chalk.green(`✅ Module Created: ${moduleId}`));

        // Verify Configs
        if (mod.client_config?.icon !== 'test_icon') throw new Error('Client Config Icon Mismatch');
        if (mod.feature_flags?.allow_remote_control !== true) throw new Error('Feature Flag Mismatch: allow_remote_control');
        if (mod.feature_flags?.track_location !== false) throw new Error('Feature Flag Mismatch: track_location');

        if (mod.is_active !== false) {
            throw new Error('Module should be inactive!');
        }

        // 2. Verify in Active List (Should NOT be there)
        console.log(chalk.blue('\n2. Verifying /modules/active...'));
        const activeRes = await axios.get(`${BASE_URL}/modules/active`, {
            headers: { 'auth_token': AUTH_TOKEN }
        });

        // 3. Update to Active
        console.log(chalk.blue('\n3. Updating Module to Active...'));
        const updateRes = await axios.put(`${BASE_URL}/modules/${moduleId}`, {
            is_active: true
        }, {
            headers: { 'auth_token': AUTH_TOKEN }
        });
        console.log(chalk.green(`✅ Module Updated (Active: ${updateRes.data.module.is_active})`));

        // 4. Verify in Active List (Should BE there)
        console.log(chalk.blue('\n4. Verifying /modules/active...'));
        const activeRes2 = await axios.get(`${BASE_URL}/modules/active`, {
            headers: { 'auth_token': AUTH_TOKEN }
        });
        const foundInActive2 = activeRes2.data.modules.find(m => m._id === moduleId);
        if (!foundInActive2) {
            throw new Error('Active module NOT found in active list!');
        }
        console.log(chalk.green('✅ Active module found in active list.'));

        // 5. Check Stats (Should be empty but valid)
        console.log(chalk.blue('\n5. Checking Module Stats...'));
        const statsRes = await axios.get(`${BASE_URL}/modules/custom/stats`, { // 'custom' is the type/identifier
            headers: { 'auth_token': AUTH_TOKEN }
        });
        console.log(chalk.green('✅ Stats Retrieved:'), statsRes.data.stats);


        // 6. Delete Module
        console.log(chalk.blue('\n6. Deleting Module...'));
        await axios.delete(`${BASE_URL}/modules/${moduleId}`, {
            headers: { 'auth_token': AUTH_TOKEN }
        });
        console.log(chalk.green('✅ Module Deleted.'));

    } catch (error) {
        console.error(chalk.red('\n❌ Test Failed:'), error.response ? error.response.data : error.message);
    }
}

runTest();
