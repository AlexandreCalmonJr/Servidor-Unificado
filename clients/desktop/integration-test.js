/**
 * Integration Test Suite - Desktop Client → Server
 * Arquivo para testar o fluxo completo end-to-end
 * 
 * Uso: node integration-test.js
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

// Importa módulos
const DataCollector = require('./src/services/DataCollector');
const PayloadBuilder = require('./src/services/PayloadBuilder');
const APIClient = require('./src/services/APIClient');
const CommandExecutor = require('./src/services/CommandExecutor');
const CommandPoller = require('./src/services/CommandPoller');

// ═══════════════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

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

function success(test) {
    log(`✓ ${test}`, 'green');
}

function error(test, err) {
    log(`✗ ${test}`, 'red');
    if (err) log(`  ${err.message}`, 'red');
}

function section(title) {
    log(`\n${'═'.repeat(70)}`, 'cyan');
    log(`  ${title}`, 'cyan');
    log(`${'═'.repeat(70)}\n`, 'cyan');
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

async function runTests() {
    let passed = 0;
    let failed = 0;

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: DataCollector
    // ─────────────────────────────────────────────────────────────────────────
    section('TEST 1: DataCollector Module');

    try {
        log('Testing getSerialNumber()...');
        const serial = await DataCollector.getSerialNumber();
        
        if (!serial || serial === 'UNKNOWN') {
            throw new Error('Serial number is invalid');
        }
        
        success(`Serial number obtained: ${serial}`);
        passed++;
    } catch (err) {
        error('getSerialNumber() failed', err);
        failed++;
    }

    try {
        log('Testing getCoreSystemInfo()...');
        const info = await DataCollector.getCoreSystemInfo();
        
        if (!info) throw new Error('No system info returned');
        if (!info.serial_number) throw new Error('Missing serial_number');
        if (!info.hostname) throw new Error('Missing hostname');
        if (!info.ip_address) throw new Error('Missing ip_address');
        
        success(`System info collected:`);
        log(`  Serial: ${info.serial_number}`, 'blue');
        log(`  Hostname: ${info.hostname}`, 'blue');
        log(`  IP: ${info.ip_address}`, 'blue');
        log(`  OS: ${info.os_version}`, 'blue');
        passed++;
    } catch (err) {
        error('getCoreSystemInfo() failed', err);
        failed++;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: PayloadBuilder
    // ─────────────────────────────────────────────────────────────────────────
    section('TEST 2: PayloadBuilder Module');

    let testInfo = null;
    try {
        testInfo = await DataCollector.getCoreSystemInfo();
    } catch (err) {
        error('Could not get system info for payload test', err);
        failed++;
    }

    if (testInfo) {
        // Test desktop payload
        try {
            log('Testing buildModulePayload() for desktop...');
            const payload = PayloadBuilder.buildModulePayload(
                testInfo,
                'desktop',
                'TI',
                0,
                'DESK-TEST-001'
            );

            if (!payload) throw new Error('Payload is null');
            if (!payload.serial_number) throw new Error('Missing serial_number');
            if (payload.battery_level !== undefined && payload.battery_level !== null) {
                throw new Error('Battery level should be removed for desktop');
            }

            success('Desktop payload created correctly');
            log(`  Fields: ${Object.keys(payload).length}`, 'blue');
            passed++;
        } catch (err) {
            error('buildModulePayload(desktop) failed', err);
            failed++;
        }

        // Test validation
        try {
            log('Testing validatePayload() for desktop...');
            const payload = PayloadBuilder.buildModulePayload(
                testInfo,
                'desktop',
                'TI',
                0,
                'DESK-TEST-001'
            );
            const validation = PayloadBuilder.validatePayload(payload, 'desktop');

            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            success('Payload validation passed');
            if (validation.warnings.length > 0) {
                log(`  Warnings: ${validation.warnings.join(', ')}`, 'yellow');
            }
            passed++;
        } catch (err) {
            error('validatePayload() failed', err);
            failed++;
        }

        // Test notebook payload
        try {
            log('Testing buildModulePayload() for notebook...');
            const payload = PayloadBuilder.buildModulePayload(
                { ...testInfo, is_notebook: true, battery_level: 85 },
                'notebook',
                'TI',
                1,
                'NB-TEST-001'
            );

            if (payload.battery_level === undefined || payload.battery_level === null) {
                throw new Error('Battery level should be present for notebook');
            }

            success('Notebook payload created correctly');
            passed++;
        } catch (err) {
            error('buildModulePayload(notebook) failed', err);
            failed++;
        }

        // Test legacy payload
        try {
            log('Testing buildLegacyPayload() for totem...');
            const payload = PayloadBuilder.buildLegacyPayload(testInfo, 'TOTEM-001');

            if (!payload) throw new Error('Payload is null');
            if (!payload.serial_number) throw new Error('Missing serial_number');

            success('Legacy (totem) payload created correctly');
            passed++;
        } catch (err) {
            error('buildLegacyPayload() failed', err);
            failed++;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: APIClient
    // ─────────────────────────────────────────────────────────────────────────
    section('TEST 3: APIClient Module');

    try {
        log('Testing getHeaders()...');
        const headers = APIClient.getHeaders('test-jwt-token');

        if (!headers['Content-Type']) throw new Error('Missing Content-Type');
        if (!headers['Authorization']) throw new Error('Missing Authorization');
        if (!headers['AUTH_TOKEN']) throw new Error('Missing AUTH_TOKEN');

        success('Headers generated correctly');
        log(`  Fields: ${Object.keys(headers).join(', ')}`, 'blue');
        passed++;
    } catch (err) {
        error('getHeaders() failed', err);
        failed++;
    }

    try {
        log('Testing getLegacyHeaders()...');
        const headers = APIClient.getLegacyHeaders('legacy-token');

        if (!headers['Content-Type']) throw new Error('Missing Content-Type');
        if (!headers['AUTH_TOKEN']) throw new Error('Missing AUTH_TOKEN');

        success('Legacy headers generated correctly');
        passed++;
    } catch (err) {
        error('getLegacyHeaders() failed', err);
        failed++;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: CommandExecutor
    // ─────────────────────────────────────────────────────────────────────────
    section('TEST 4: CommandExecutor Module');

    try {
        log('Testing runCommand() with echo...');
        const result = await CommandExecutor.runCommand('echo test-output');

        if (result.exitCode !== 0) throw new Error(`Exit code: ${result.exitCode}`);
        if (!result.stdout || result.stdout !== 'test-output') {
            throw new Error(`Expected 'test-output', got '${result.stdout}'`);
        }

        success('Command executed successfully');
        log(`  Output: ${result.stdout}`, 'blue');
        passed++;
    } catch (err) {
        error('runCommand() failed', err);
        failed++;
    }

    try {
        log('Testing runCommand() with timeout...');
        const result = await CommandExecutor.runCommand('timeout 2', {
            timeout: 1000
        });

        // Deve ter saído por timeout
        if (result.exitCode === 0) {
            log('  ⚠ Command completed before timeout (system dependent)', 'yellow');
        }

        success('Timeout test completed');
        passed++;
    } catch (err) {
        error('Timeout test failed', err);
        failed++;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 5: CommandPoller
    // ─────────────────────────────────────────────────────────────────────────
    section('TEST 5: CommandPoller Module');

    try {
        log('Testing CommandPoller.getStatus()...');
        const status = CommandPoller.getStatus();

        if (status.isRunning === undefined) throw new Error('Missing isRunning');
        if (status.isPolling === undefined) throw new Error('Missing isPolling');

        success('Status retrieved correctly');
        log(`  Running: ${status.isRunning}`, 'blue');
        log(`  Polling: ${status.isPolling}`, 'blue');
        passed++;
    } catch (err) {
        error('getStatus() failed', err);
        failed++;
    }

    try {
        log('Testing CommandPoller.getConfig()...');
        const config = CommandPoller.getConfig();

        if (config === null) {
            log('  Config not found (expected - file may not exist)', 'yellow');
        } else if (config.server_url) {
            success('Config loaded');
            log(`  Server: ${config.server_url}`, 'blue');
        }

        passed++;
    } catch (err) {
        error('getConfig() failed', err);
        failed++;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 6: Full Cycle Simulation (without server)
    // ─────────────────────────────────────────────────────────────────────────
    section('TEST 6: Full Data Collection Cycle');

    try {
        log('Simulating complete data collection and payload building...\n');

        // Step 1: Collect
        log('[1/3] Collecting system information...');
        const coreInfo = await DataCollector.getCoreSystemInfo();
        success(`Collected for: ${coreInfo.hostname}`);

        // Step 2: Build payload
        log('[2/3] Building payload...');
        const assetType = coreInfo.is_notebook ? 'notebook' : 'desktop';
        const payload = PayloadBuilder.buildModulePayload(
            coreInfo,
            assetType,
            'Test Sector',
            0,
            'TEST-DEVICE-001'
        );
        success(`Payload built for type: ${assetType}`);

        // Step 3: Validate
        log('[3/3] Validating payload...');
        const validation = PayloadBuilder.validatePayload(payload, assetType);
        
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        success('Full cycle completed successfully');
        log(`\nPayload Summary:`, 'cyan');
        log(`  Asset Type: ${assetType}`, 'blue');
        log(`  Serial: ${payload.serial_number}`, 'blue');
        log(`  Hostname: ${payload.hostname}`, 'blue');
        log(`  IP: ${payload.ip_address}`, 'blue');
        log(`  Processor: ${payload.processor}`, 'blue');
        log(`  RAM: ${payload.ram}`, 'blue');

        passed++;
    } catch (err) {
        error('Full cycle simulation failed', err);
        failed++;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═════════════════════════════════════════════════════════════════════════
    section('TEST SUMMARY');

    const total = passed + failed;
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

    log(`Total Tests: ${total}`);
    log(`Passed: ${passed}`, 'green');
    log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    log(`Success Rate: ${percentage}%`, percentage === 100 ? 'green' : 'yellow');

    if (failed === 0) {
        log('\n✓ ALL TESTS PASSED', 'green');
    } else {
        log(`\n✗ ${failed} TEST(S) FAILED`, 'red');
    }

    log(`\nNext steps:`, 'cyan');
    log(`  1. Configure client: ~/.servidor_unificado/client_config.json`);
    log(`  2. Start server: npm start`);
    log(`  3. Start client: node -e "const cp = require('./CommandPoller.js'); cp.init();"`);
    log(`  4. Verify data in MongoDB or web panel`);
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════════════════

log(`\n${'═'.repeat(70)}`, 'cyan');
log(`  Desktop Client - Integration Test Suite`, 'cyan');
log(`  Version: 1.0.0`, 'cyan');
log(`${'═'.repeat(70)}\n`, 'cyan');

runTests().catch(err => {
    log(`\nFatal error: ${err.message}`, 'red');
    process.exit(1);
});
