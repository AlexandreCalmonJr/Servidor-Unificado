#!/usr/bin/env node
/**
 * Testa fluxo do Desktop Agent no servidor:
 * 1) modulo escolhido (/api/modules/:moduleId + /assets)
 * 2) sync de impressoras (/api/printers/sync)
 * 3) leitura de impressoras via modulo printer (/api/modules/printer/assets)
 *
 * Uso:
 *   node scripts/test_desktop_agent_routes.js --server http://IP:3000 --token TOKEN --module MODULE_ID_OU_TYPE
 *
 * Exemplo:
 *   node scripts/test_desktop_agent_routes.js --server http://10.71.3.110:3000 --token SEU_TOKEN --module desktop
 */

const os = require('os');
const crypto = require('crypto');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function buildHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    AUTH_TOKEN: token,
  };
}

async function requestJson(method, url, token, body = null) {
  const response = await fetch(url, {
    method,
    headers: buildHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

function fail(message, detail) {
  console.error(`\n[FAIL] ${message}`);
  if (detail) console.error(detail);
  process.exit(1);
}

function ok(message) {
  console.log(`[OK] ${message}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const server = String(args.server || '').replace(/\/+$/, '');
  const token = String(args.token || '');
  const moduleParam = String(args.module || '');

  if (!server || !token || !moduleParam) {
    console.log('Uso: node scripts/test_desktop_agent_routes.js --server http://IP:3000 --token TOKEN --module MODULE_ID_OU_TYPE');
    process.exit(1);
  }

  const runId = crypto.randomBytes(4).toString('hex');
  const hostname = os.hostname();
  const serial = `DESKTOP-TEST-${runId}`;
  const printerSerial = `PRN-TEST-${runId}`;

  console.log('\n=== Desktop Agent Route Test ===');
  console.log(`server=${server}`);
  console.log(`module=${moduleParam}`);
  console.log(`runId=${runId}\n`);

  // 1) valida modulo escolhido
  const moduleInfo = await requestJson('GET', `${server}/api/modules/${encodeURIComponent(moduleParam)}`, token);
  if (!moduleInfo.ok) fail('Falha ao consultar modulo escolhido', moduleInfo);
  ok(`Modulo escolhido acessivel (${moduleParam})`);

  // 2) cria/atualiza ativo desktop no modulo escolhido
  const desktopPayload = {
    asset_type: 'desktop',
    serial_number: serial,
    asset_name: `Desktop Test ${hostname}`,
    hostname,
    ip_address: '127.0.0.1',
    status: 'online',
    os_version: process.platform,
    processor: 'Route Test Processor',
    ram: '8 GB',
    storage: '256 GB',
    storage_type: 'SSD',
    custom_data: {
      source: 'desktop-route-test',
      run_id: runId,
      created_at: new Date().toISOString(),
    },
  };

  const upsertDesktop = await requestJson(
    'POST',
    `${server}/api/modules/${encodeURIComponent(moduleParam)}/assets`,
    token,
    desktopPayload,
  );
  if (!upsertDesktop.ok || upsertDesktop.payload.success === false) {
    fail('Falha ao criar/atualizar ativo desktop no modulo escolhido', upsertDesktop);
  }
  ok('Ativo desktop enviado para o modulo escolhido');

  // 3) valida leitura do ativo desktop no modulo escolhido
  const listDesktop = await requestJson(
    'GET',
    `${server}/api/modules/${encodeURIComponent(moduleParam)}/assets?search=${encodeURIComponent(serial)}`,
    token,
  );
  if (!listDesktop.ok || listDesktop.payload.success === false) {
    fail('Falha ao listar ativos do modulo escolhido', listDesktop);
  }
  const desktopFound = Array.isArray(listDesktop.payload.assets)
    && listDesktop.payload.assets.some((asset) => String(asset.serial_number || '') === serial);
  if (!desktopFound) {
    fail('Ativo desktop nao encontrado na listagem do modulo escolhido', listDesktop.payload);
  }
  ok('Ativo desktop confirmado no modulo escolhido');

  // 4) testa rota de sync de impressoras (desktop agent -> /api/printers/sync)
  const printerSyncPayload = {
    source: 'desktop-agent-route-test',
    agent_hostname: hostname,
    device_id: `${hostname}-route-test`,
    timestamp: new Date().toISOString(),
    printers: [
      {
        id: printerSerial,
        serial_number: printerSerial,
        asset_name: `Printer Route Test ${runId}`,
        manufacturer: 'HP',
        model: 'HP Laser 408',
        connection_type: 'usb',
        usb_path: 'USB001',
        status: 'online',
        last_check: new Date().toISOString(),
        toner_levels: {
          black: 82,
          imaging_unit: 29,
        },
        custom_data: {
          usb_toner_supported: true,
          toner_source: 'route_test',
          imaging_source: 'route_test',
        },
      },
    ],
  };

  const syncPrinter = await requestJson(
    'POST',
    `${server}/api/printers/sync`,
    token,
    printerSyncPayload,
  );
  if (!syncPrinter.ok || syncPrinter.payload.success === false) {
    fail('Falha ao sincronizar impressora via /api/printers/sync', syncPrinter);
  }
  ok('Sync de impressora realizado com sucesso');

  // 5) valida impressora no modulo printer
  const listPrintersByModule = await requestJson(
    'GET',
    `${server}/api/modules/printer/assets?search=${encodeURIComponent(printerSerial)}`,
    token,
  );
  if (!listPrintersByModule.ok || listPrintersByModule.payload.success === false) {
    fail('Falha ao listar modulo printer apos sync', listPrintersByModule);
  }
  const printerFound = Array.isArray(listPrintersByModule.payload.assets)
    && listPrintersByModule.payload.assets.some((asset) => String(asset.serial_number || '') === printerSerial);
  if (!printerFound) {
    fail('Impressora sincronizada nao encontrada no modulo printer', listPrintersByModule.payload);
  }
  ok('Impressora confirmada no modulo printer');

  console.log('\n[SUCESSO] Fluxo do desktop agent validado (modulo escolhido + printers sync).\n');
}

main().catch((error) => {
  fail('Erro inesperado durante o teste', error?.stack || error?.message || String(error));
});

