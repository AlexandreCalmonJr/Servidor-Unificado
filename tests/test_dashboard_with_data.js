/**
 * test_dashboard_with_data.js
 *
 * Popula TODO o banco com dados de demonstração (todos os módulos, tipos de
 * equipamento, provisionamento, perfis, localização, suprimentos de impressora,
 * filtros, comandos, etc.) e consulta TODOS os endpoints do sistema,
 * exibindo o resultado formatado como um preview completo do To de Olho MDM.
 *
 * Uso:
 *   1. Inicie o servidor: npm start
 *   2. Execute: npm run dashboard:demo
 *
 * Requer: servidor rodando em http://localhost:3000 e MongoDB acessível.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');
const crypto = require('crypto');

const BASE = `http://localhost:${process.env.PORT || 3000}`;
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m',
};

// ─── Dados de seed ──────────────────────────────────────────────────────────
const TYPES = ['desktop', 'notebook', 'totem', 'panel', 'printer', 'mobile', 'scanner'];
const UNITS = ['Matriz SP', 'Filial RJ', 'Filial BH', 'CD Campinas', 'Loja Shopping'];
const SECTORS = ['TI', 'RH', 'Financeiro', 'Vendas', 'Atendimento', 'Produção'];
const MODELS = {
  desktop: ['Dell OptiPlex 7080', 'HP EliteDesk 800', 'Lenovo ThinkCentre M90'],
  notebook: ['Dell Latitude 5430', 'Lenovo ThinkPad E14', 'HP EliteBook 840'],
  totem: ['Totem Autoatendimento v3', 'Totem Senha Digital PDV'],
  panel: ['LG 55" UHD', 'Samsung 65" QLED'],
  printer: ['HP LaserJet M404dn', 'Samsung SL-M5360'],
  mobile: ['Samsung Galaxy Tab A8', 'Motorola Edge 30'],
  scanner: ['HP ScanJet Pro 3000', 'Fujitsu fi-7160'],
};
const NAMES = {
  desktop: ['DESKTOP-TI-01', 'DESKTOP-TI-02', 'DESKTOP-FIN-01', 'DESKTOP-ADM-01'],
  notebook: ['NOTEBOOK-TI-01', 'NOTEBOOK-RH-01', 'NOTEBOOK-DIR-01'],
  totem: ['TOTEM-ATEND-01', 'TOTEM-SENHA-01'],
  panel: ['PAINEL-ENTRADA', 'PAINEL-SALA-ESPERA'],
  printer: ['IMP-TI', 'IMP-RH'],
  mobile: ['SMARTPHONE-01', 'TABLET-01'],
  scanner: ['SCANNER-TI'],
};

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ri = (m, M) => Math.floor(Math.random() * (M - m + 1)) + m;
const rMac = () => Array.from({ length: 6 }, () => ri(0, 255).toString(16).padStart(2, '0').toUpperCase()).join(':');
const rIp = () => `192.168.${ri(1, 10)}.${ri(1, 254)}`;
const rSerial = (p) => `${p}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const rStatus = () => {
  const r = Math.random();
  if (r < 0.45) return 'online';
  if (r < 0.75) return 'offline';
  if (r < 0.90) return 'maintenance';
  return 'unknown';
};
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

// ─── HTTP helper ───────────────────────────────────────────────────────────
function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json', ...headers, ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
    };
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, data: d }); } });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

// ─── Output helpers ────────────────────────────────────────────────────────
let step = 0;
function section(title) {
  step++;
  console.log(`\n  ${C.bold}${C.cyan}[${step}] ${title}${C.reset}`);
  console.log(`  ${C.dim}${'─'.repeat(60)}${C.reset}`);
}
function ok(msg) { console.log(`  ${C.green}✔${C.reset} ${msg}`); }
function info(label, val) { console.log(`  ${C.dim}•${C.reset} ${label}: ${C.bold}${val}${C.reset}`); }
function warn(msg) { console.log(`  ${C.yellow}⚠ ${msg}${C.reset}`); }
function fail(msg) { console.log(`  ${C.red}✖ ${msg}${C.reset}`); }
function table(headers, rows) {
  if (!rows.length) { warn('Nenhum dado'); return; }
  const cw = headers.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i] || '').length)) + 2);
  const line = (l, m, r) => `  ${C.dim}${l}${cw.map(w => '─'.repeat(w + 1)).join(m)}${r}${C.reset}`;
  console.log(line('┌', '┬', '┐'));
  console.log(`  ${C.dim}│${C.reset} ${headers.map((h, i) => C.bold + h.padEnd(cw[i] - 1) + C.reset).join(`${C.dim}│${C.reset}`)}${C.dim}│${C.reset}`);
  console.log(line('├', '┼', '┤'));
  for (const r of rows) console.log(`  ${C.dim}│${C.reset} ${r.map((v, i) => String(v).padEnd(cw[i] - 1)).join(`${C.dim}│${C.reset}`)}${C.dim}│${C.reset}`);
  console.log(line('└', '┴', '┘'));
}
function bar(label, total, count, color) {
  const p = total > 0 ? count / total : 0;
  const f = Math.round(30 * p);
  console.log(`  ${C.bold}${String(label).padEnd(14)}${C.reset} ${C[color]}${'█'.repeat(f)}${C.dim}${'░'.repeat(30 - f)}${C.reset} ${C.bold}${count}${C.reset}${C.dim} / ${total}${C.reset}`);
}

function printBanner() {
  console.log();
  console.log(`  ${C.cyan}${C.bold}╔════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`  ${C.cyan}${C.bold}║       TO DE OLHO MDM — PREVIEW COMPLETO DO SISTEMA       ║${C.reset}`);
  console.log(`  ${C.cyan}${C.bold}╚════════════════════════════════════════════════════════╝${C.reset}`);
  console.log();
}

// ═════════════════════════════════════════════════════════════════════════════
//  FASE 1: SEED NO BANCO
// ═════════════════════════════════════════════════════════════════════════════
async function seedEverything() {
  const ManagedAsset = require('../models/ManagedAsset');
  const AssetModuleConfig = require('../models/AssetModuleConfig');
  const AssetCommand = require('../models/AssetCommand');
  const ConfigProfile = require('../models/ConfigProfile');
  const ProvisioningToken = require('../models/ProvisioningToken');
  const BssidMapping = require('../models/BssidMapping');
  const UnitMapping = require('../models/UnitMapping');
  const IpMapping = require('../models/IpMapping');
  const LocationHistory = require('../models/LocationHistory');
  const SavedFilter = require('../models/SavedFilter');
  const PrinterSupplyItem = require('../models/PrinterSupplyItem');
  const PrinterSupplyMovement = require('../models/PrinterSupplyMovement');
  const PrinterInventoryEvent = require('../models/PrinterInventoryEvent');
  const User = require('../models/User');

  section('Populando banco de dados');

  // Limpa tudo
  await Promise.all([
    ManagedAsset.deleteMany({}), AssetModuleConfig.deleteMany({}),
    AssetCommand.deleteMany({}), ConfigProfile.deleteMany({}),
    ProvisioningToken.deleteMany({}), BssidMapping.deleteMany({}),
    UnitMapping.deleteMany({}), IpMapping.deleteMany({}),
    LocationHistory.deleteMany({}), SavedFilter.deleteMany({}),
    PrinterSupplyItem.deleteMany({}), PrinterSupplyMovement.deleteMany({}),
    PrinterInventoryEvent.deleteMany({}),
  ]);
  ok('Banco limpo');

  // ─── 1. Módulos ────────────────────────────────────────────────────
  const modules = await AssetModuleConfig.insertMany(
    TYPES.map((type) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1) + (type.endsWith('s') ? '' : 's'),
      type, is_active: true,
      description: `Módulo de gerenciamento de ${type}s`,
      client_config: { show_on_dashboard: true, icon: 'box', color: '#3b82f6' },
    }))
  );
  const modMap = {};
  for (const m of modules) modMap[m.type] = m._id;
  ok(`${modules.length} módulos criados: ${modules.map(m => m.name).join(', ')}`);

  // ─── 2. Ativos (ManagedAsset) ──────────────────────────────────────
  let totalAssets = 0;
  for (const type of TYPES) {
    const names = NAMES[type] || [`${type.toUpperCase()}-01`];
    const assets = names.map((name, i) => ({
      module_id: modMap[type],
      asset_name: name,
      asset_type: type,
      serial_number: rSerial(type.toUpperCase().slice(0, 3)),
      ip_address: rIp(), mac_address: rMac(),
      hostname: name,
      model: pick(MODELS[type] || ['Padrão']),
      manufacturer: type === 'desktop' ? 'Dell' : type === 'notebook' ? 'Lenovo' : type === 'printer' ? 'HP' : type === 'mobile' ? 'Samsung' : 'Generic',
      unit: pick(UNITS), sector: pick(SECTORS), floor: `${ri(1, 10)}º Andar`,
      status: rStatus(),
      last_seen: daysAgo(ri(0, 15)),
      operating_system: ['desktop', 'notebook'].includes(type) ? (type === 'desktop' ? 'Windows 10 Pro' : 'Windows 11 Pro') : undefined,
      processor: ['desktop', 'notebook'].includes(type) ? (type === 'desktop' ? 'Intel Core i7-10700' : 'Intel Core i5-1235U') : undefined,
      ram: ['desktop', 'notebook'].includes(type) ? (type === 'desktop' ? '16GB' : '8GB') : undefined,
      storage: ['desktop', 'notebook'].includes(type) ? (type === 'desktop' ? '512GB SSD' : '256GB SSD') : undefined,
      location: `${pick(UNITS)} - ${pick(SECTORS)}`,
      is_deleted: false, deleted_at: null,
      created_at: daysAgo(ri(30, 120)), updated_at: daysAgo(ri(0, 15)),
    }));
    await ManagedAsset.insertMany(assets);
    totalAssets += assets.length;
  }
  ok(`${totalAssets} ativos criados (${TYPES.join(', ')})`);

  // ─── 3. Comandos ──────────────────────────────────────────────────
  const allAssets = await ManagedAsset.find().lean();
  const commands = [];
  const cmdTypes = ['restart_computer', 'flush_dns', 'lock_device', 'clear_temp', 'install_update', 'cmd_custom'];
  const statuses = ['pending', 'sent', 'executing', 'completed', 'completed', 'completed', 'failed'];
  for (let i = 0; i < 12; i++) {
    const asset = pick(allAssets);
    const st = pick(statuses);
    commands.push({
      moduleId: String(asset.module_id),
      assetId: String(asset._id),
      serialNumber: asset.serial_number,
      assetName: asset.asset_name,
      commandType: pick(cmdTypes),
      command: pick(cmdTypes),
      status: st,
      createdBy: 'admin',
      createdAt: daysAgo(ri(0, 7)),
      ...(st === 'completed' ? { completedAt: new Date(), result: { stdout: 'OK', exitCode: 0, executionTime: ri(1, 30) } } : {}),
    });
  }
  await AssetCommand.insertMany(commands);
  ok(`${commands.length} comandos criados (status variados)`);

  // ─── 4. Perfis de Configuração ────────────────────────────────────
  const profiles = await ConfigProfile.insertMany([
    {
      name: 'Kiosk Totem', description: 'Bloqueio total para totem', module_type: 'totem', module_id: modMap.totem,
      settings: { restrictions: { disable_camera: true, disable_bluetooth: true, disable_usb: true, disable_developer_options: true }, app_whitelist: ['com.app.atendimento'] },
    },
    {
      name: 'Corporativo Desktop', description: 'Padrão para estações de trabalho', module_type: 'desktop', module_id: modMap.desktop,
      settings: { restrictions: { disable_camera: false, disable_bluetooth: true, disable_usb: false, disable_developer_options: true }, wifi_configs: [{ ssid: 'Corp-WIFI' }] },
    },
    {
      name: 'Mobile Restrito', description: 'Celulares com restrições', module_type: 'mobile', module_id: modMap.mobile,
      settings: { restrictions: { disable_camera: true, disable_bluetooth: false, disable_usb: true, disable_developer_options: true }, mandatory_apps: [{ package_name: 'com.empresa.app', version: '1.0' }] },
    },
  ]);
  ok(`${profiles.length} perfis de configuração criados`);

  // ─── 5. Tokens de Provisionamento ─────────────────────────────────
  const tokens = await ProvisioningToken.insertMany([
    { token: crypto.randomBytes(32).toString('hex'), organization: 'Matriz SP', config_profile: 'Kiosk Totem', max_uses: 10, used_count: 3, expires_at: daysAgo(-30), is_active: true },
    { token: crypto.randomBytes(32).toString('hex'), organization: 'Filial RJ', config_profile: 'Corporativo Desktop', max_uses: 5, used_count: 5, expires_at: daysAgo(-15), is_active: false },
    { token: crypto.randomBytes(32).toString('hex'), organization: 'CD Campinas', config_profile: 'Mobile Restrito', max_uses: 20, used_count: 2, expires_at: daysAgo(-60), is_active: true },
  ]);
  ok(`${tokens.length} tokens de provisionamento criados`);

  // ─── 6. Unidades ──────────────────────────────────────────────────
  const units = await UnitMapping.insertMany(
    UNITS.map((name, i) => ({ name, ip_ranges: [{ start: `192.168.${i + 1}.1`, end: `192.168.${i + 1}.254` }] }))
  );
  ok(`${units.length} unidades criadas`);

  // ─── 7. BSSID Mappings ────────────────────────────────────────────
  const bssids = await BssidMapping.insertMany([
    { mac_address_radio: 'AA:BB:CC:11:22:33', sector: 'TI', floor: '2º Andar', unitName: 'Matriz SP' },
    { mac_address_radio: 'AA:BB:CC:44:55:66', sector: 'RH', floor: '5º Andar', unitName: 'Matriz SP' },
    { mac_address_radio: 'DD:EE:FF:11:22:33', sector: 'Vendas', floor: 'Térreo', unitName: 'Filial RJ' },
    { mac_address_radio: 'DD:EE:FF:44:55:66', sector: 'Produção', floor: 'Galpão', unitName: 'CD Campinas' },
  ]);
  ok(`${bssids.length} mapeamentos BSSID criados`);

  // ─── 8. IP Mappings ──────────────────────────────────────────────
  const ipMappings = await IpMapping.insertMany([
    { location: 'Matriz SP - TI', ipStart: '192.168.1.1', ipEnd: '192.168.1.50' },
    { location: 'Matriz SP - RH', ipStart: '192.168.1.51', ipEnd: '192.168.1.100' },
    { location: 'Filial RJ', ipStart: '192.168.2.1', ipEnd: '192.168.2.254' },
  ]);
  ok(`${ipMappings.length} mapeamentos IP criados`);

  // ─── 9. Histórico de Localização ──────────────────────────────────
  const locHistory = [];
  for (const asset of allAssets.slice(0, 8)) {
    const unit = pick(UNITS);
    const sector = pick(SECTORS);
    locHistory.push({
      serial_number: asset.serial_number,
      bssid: pick(bssids).mac_address_radio,
      sector, floor: `${ri(1, 10)}º Andar`,
      timestamp: daysAgo(ri(0, 7)),
    });
  }
  await LocationHistory.insertMany(locHistory);
  ok(`${locHistory.length} registros de histórico de localização`);

  // ─── 10. Filtros Salvos ──────────────────────────────────────────
  const adminUser = await User.findOne({ username: 'admin' });
  if (adminUser) {
    const filters = await SavedFilter.insertMany([
      { userId: adminUser._id, moduleId: String(modMap.desktop), filterName: 'Desktop Online', filterData: { statusFilter: 'online', sortBy: 'name' }, isDefault: true },
      { userId: adminUser._id, moduleId: String(modMap.desktop), filterName: 'Desktop Manutenção', filterData: { statusFilter: 'maintenance', sortBy: 'name' } },
      { userId: adminUser._id, moduleId: String(modMap.mobile), filterName: 'Mobile Offline', filterData: { statusFilter: 'offline', sortBy: 'name' } },
    ]);
    ok(`${filters.length} filtros salvos criados`);
  }

  // ─── 11. Suprimentos de Impressora ───────────────────────────────
  const printerMod = await AssetModuleConfig.findOne({ type: 'printer' });
  if (printerMod) {
    const supplies = await PrinterSupplyItem.insertMany([
      { module_id: printerMod._id, sku: 'HP-CF280X', name: 'Toner HP 80X Preto', category: 'toner_black', manufacturer: 'HP', model_family: 'LaserJet', compatible_models: ['HP LaserJet M404dn'], quantity_on_hand: 12, min_stock: 3, reorder_point: 5, storage_location: 'Almoxarifado A1' },
      { module_id: printerMod._id, sku: 'HP-CF360A', name: 'Toner HP 360A Ciano', category: 'toner_black', manufacturer: 'HP', compatible_models: ['HP LaserJet M553'], quantity_on_hand: 5, min_stock: 2, reorder_point: 3 },
      { module_id: printerMod._id, sku: 'SAMSUNG-MLTD', name: 'Toner Samsung Preto', category: 'toner_black', manufacturer: 'Samsung', model_family: 'SL-M', compatible_models: ['Samsung SL-M5360'], quantity_on_hand: 1, min_stock: 2, reorder_point: 3 },
      { module_id: printerMod._id, sku: 'HP-CF065A', name: 'Kit Manutenção HP', category: 'maintenance_kit', manufacturer: 'HP', quantity_on_hand: 3, min_stock: 1, reorder_point: 2 },
    ]);
    ok(`${supplies.length} suprimentos de impressora criados`);

    // Movimentações
    const movements = await PrinterSupplyMovement.insertMany([
      { module_id: printerMod._id, supply_id: supplies[0]._id, movement_type: 'in', quantity: 10, quantity_before: 2, quantity_after: 12, reason: 'Compra mensal' },
      { module_id: printerMod._id, supply_id: supplies[0]._id, movement_type: 'out', quantity: 2, quantity_before: 12, quantity_after: 10, reason: 'Troca em campo', printer_id: allAssets.find(a => a.asset_type === 'printer')?._id },
      { module_id: printerMod._id, supply_id: supplies[2]._id, movement_type: 'consumption', quantity: 1, quantity_before: 2, quantity_after: 1, reason: 'Instalado na IMP-RH', printer_id: allAssets.find(a => a.asset_type === 'printer')?._id },
    ]);
    ok(`${movements.length} movimentações de suprimentos criadas`);

    // Eventos de inventário
    const events = await PrinterInventoryEvent.insertMany([
      { module_id: printerMod._id, event_type: 'stock_adjustment', item_type: 'toner_black', quantity_delta: 10, reason: 'Ajuste de inventário' },
      { module_id: printerMod._id, event_type: 'toner_replacement', item_type: 'toner_black', quantity_delta: -1, reason: 'Troca de toner na IMP-TI' },
    ]);
    ok(`${events.length} eventos de inventário criados`);
  }

  ok(`${C.green}Seed completo! ${totalAssets} ativos, ${modules.length} módulos, ${commands.length} comandos, ${profiles.length} perfis, ${tokens.length} tokens${C.reset}`);
  return modMap;
}

// ═════════════════════════════════════════════════════════════════════════════
//  FASE 2: CONSULTAS VIA API
// ═════════════════════════════════════════════════════════════════════════════
async function queryAllEndpoints(token) {
  const h = { Authorization: `Bearer ${token}` };
  let successCount = 0;
  let failCount = 0;

  const check = async (name, method, path, body, fn) => {
    try {
      const res = await req(method, path, body, h);
      if (fn) fn(res); else if (res.status < 400) ok(`${name}: ${res.status}`);
      else fail(`${name}: ${res.status} — ${res.data?.message || res.data?.error || 'erro'}`);
      if (res.status < 400) successCount++; else failCount++;
    } catch (e) {
      fail(`${name}: ${e.message}`);
      failCount++;
    }
  };

  // ─── 1. Server Status ──────────────────────────────────────────────
  section('Métricas do Servidor');
  await check('Status do servidor', 'GET', '/api/server/status', null, (res) => {
    if (res.status !== 200) return;
    const d = res.data;
    info('Dispositivos registrados', d.device_count ?? 0);
    info('Comandos pendentes', d.pending_commands ?? 0);
    info('CPU', `${d.cpu_usage ?? 0}%`);
    info('Memória', `${d.memory_usage ?? 0}%`);
    info('Uptime', `${Math.floor((d.uptime ?? 0) / 3600)}h ${Math.floor(((d.uptime ?? 0) % 3600) / 60)}m`);
  });

  // ─── 2. Monitoring Assets ──────────────────────────────────────────
  section('Status dos Dispositivos');
  await check('Listar ativos', 'GET', '/api/monitoring/assets', null, (res) => {
    if (res.status !== 200) return;
    const list = res.data.assets || [];
    const counts = { online: 0, offline: 0, maintenance: 0, unknown: 0 };
    for (const a of list) { const s = a.status || 'unknown'; counts[s] = (counts[s] || 0) + 1; }
    const total = list.length || 1;
    bar('Online', total, counts.online, 'green');
    bar('Offline', total, counts.offline, 'red');
    bar('Manutenção', total, counts.maintenance, 'yellow');
    bar('Desconhecido', total, counts.unknown, 'dim');

    // Últimos ativos
    const recent = list.slice(0, 5);
    if (recent.length) {
      console.log();
      info('Últimos ativos atualizados', '');
      table(['Nome', 'Tipo', 'Status', 'Unidade'],
        recent.map(a => [a.asset_name || 'N/A', a.asset_type || 'N/A', a.status || '?', a.unit || 'N/A']));
    }
  });

  // ─── 3. Módulos + Stats ────────────────────────────────────────────
  section('Módulos e Estatísticas');
  const modRes = await req('GET', '/api/modules', null, h);
  if (modRes.status === 200) {
    const mods = modRes.data.modules || [];
    ok(`${mods.length} módulos encontrados`);
    const rows = [];
    for (const m of mods) {
      const s = await req('GET', `/api/modules/${m._id}/stats`, null, h);
      const d = s.status === 200 ? s.data : { total: 0, online: 0, offline: 0, maintenance: 0 };
      rows.push([m.name, m.type, String(d.total ?? 0), `${C.green}${d.online ?? 0}${C.reset}`, `${C.red}${d.offline ?? 0}${C.reset}`, `${C.yellow}${d.maintenance ?? 0}${C.reset}`]);
    }
    table(['Módulo', 'Tipo', 'Total', 'Online', 'Offline', 'Manut.'], rows);

    // Assets por módulo
    console.log();
    for (const m of mods.slice(0, 3)) {
      const ar = await req('GET', `/api/modules/${m._id}/assets`, null, h);
      if (ar.status === 200) {
        const assets = ar.data.assets || [];
        info(`Ativos em ${m.name}`, assets.length);
        if (assets.length) {
          table(['Nome', 'Serial', 'Status'],
            assets.slice(0, 3).map(a => [a.asset_name || 'N/A', a.serial_number || 'N/A', a.status || '?']));
        }
      }
    }
  }

  // ─── 4. Config Profiles ────────────────────────────────────────────
  section('Perfis de Configuração');
  await check('Listar perfis', 'GET', '/api/config-profiles', null, (res) => {
    if (res.status !== 200) return;
    const list = Array.isArray(res.data) ? res.data : [];
    table(['Nome', 'Tipo', 'Restrições'],
      list.map(p => [p.name, p.module_type || 'N/A',
        p.settings?.restrictions ? `${Object.keys(p.settings.restrictions).length} regras` : 'Nenhuma']));
  });

  // ─── 5. Provisioning Tokens ────────────────────────────────────────
  section('Tokens de Provisionamento');
  await check('Listar tokens', 'GET', '/api/provisioning/tokens', null, (res) => {
    const list = Array.isArray(res.data) ? res.data : [];
    table(['Organização', 'Perfil', 'Usos', 'Ativo'],
      list.map(t => [t.organization, t.config_profile, `${t.used_count}/${t.max_uses}`, t.is_active ? `${C.green}Sim${C.reset}` : `${C.red}Não${C.reset}`]));
  });

  // ─── 6. Unidades ───────────────────────────────────────────────────
  section('Unidades');
  await check('Listar unidades', 'GET', '/api/units', null, (res) => {
    if (res.status !== 200) return;
    const list = res.data.units || [];
    table(['Nome', 'Faixas IP'],
      list.map(u => [u.name, u.ip_ranges?.map(r => `${r.start}-${r.end}`).join(', ') || 'N/A']));
  });

  // ─── 7. BSSID Mappings ─────────────────────────────────────────────
  section('Mapeamentos BSSID (Wi-Fi)');
  await check('Listar BSSIDs', 'GET', '/api/bssid-mappings', null, (res) => {
    const list = Array.isArray(res.data) ? res.data : [];
    table(['MAC', 'Setor', 'Andar', 'Unidade'],
      list.map(b => [b.mac_address_radio || 'N/A', b.sector || 'N/A', b.floor || 'N/A', b.unitName || '—']));
  });

  // ─── 8. Suprimentos de Impressora ──────────────────────────────────
  section('Suprimentos de Impressora');
  await check('Listar suprimentos', 'GET', '/api/printers/inventory/supplies', null, (res) => {
    if (res.status !== 200) return;
    const list = res.data.supplies || res.data.items || [];
    table(['SKU', 'Nome', 'Qtd', 'Min'],
      list.map(s => [s.sku || 'N/A', s.name || 'N/A', String(s.quantity_on_hand ?? 0), String(s.min_stock ?? 0)]));
  });

  // ─── 9. Dispositivos Mobile ────────────────────────────────────────
  section('Dispositivos Mobile');
  const devRes = await req('GET', '/api/devices', null, h);
  if (devRes.status === 200) {
    const list = Array.isArray(devRes.data) ? devRes.data : (devRes.data.devices || devRes.data.data || []);
    if (list.length) {
      table(['Nome', 'Serial', 'Status'],
        list.slice(0, 5).map(d => [d.device_name || d.asset_name || 'N/A', d.serial_number || 'N/A', d.status || '?']));
    } else { warn('Nenhum dispositivo mobile encontrado (rota pode usar autenticação diferente)'); }
  } else { warn(`/api/devices: ${devRes.status}`); }

  // ─── 10. Diagnóstico / Cache ──────────────────────────────────────
  section('Diagnóstico do Sistema');
  await check('Cache stats', 'GET', '/api/diagnostic/cache-stats', null);

  return { success: successCount, fail: failCount };
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN
// ═════════════════════════════════════════════════════════════════════════════
async function main() {
  printBanner();

  try {
    // Conecta ao MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    ok(`Conectado ao MongoDB: ${process.env.MONGO_URI}`);

    // Fase 1: Seed completo
    await seedEverything();

    // Fase 2: Login via API
    console.log(`\n  ${C.yellow}🔑 Autenticando no servidor...${C.reset}`);
    const loginRes = await req('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
    if (loginRes.status !== 200 || !loginRes.data.token) {
      console.log(`\n  ${C.red}❌ Falha no login. O servidor está rodando em ${BASE}?${C.reset}`);
      console.log(`  ${C.dim}   Execute primeiro: npm start${C.reset}`);
      process.exit(1);
    }
    const token = loginRes.data.token;
    ok(`Autenticado como admin (token: ${token.substring(0, 16)}...)`);

    // Fase 3: Consultar todos os endpoints
    console.log(`\n  ${C.bold}${C.cyan}════════════════════════════════════════════════════════${C.reset}`);
    console.log(`  ${C.bold}${C.cyan}       CONSULTANDO TODOS OS ENDPOINTS DA API${C.reset}`);
    console.log(`  ${C.bold}${C.cyan}════════════════════════════════════════════════════════${C.reset}`);
    const result = await queryAllEndpoints(token);

    // Resumo final
    console.log(`\n  ${C.dim}${'═'.repeat(60)}${C.reset}`);
    console.log(`  ${C.bold}${C.green}  ✅ PREVIEW COMPLETO FINALIZADO${C.reset}`);
    console.log(`  ${C.dim}  Endpoints OK: ${C.green}${result.success}${C.dim} | Falhas: ${result.fail > 0 ? C.red + result.fail : C.green + result.fail}${C.reset}`);
    console.log(`  ${C.dim}  Acesse http://localhost:3000 para ver o painel completo no navegador${C.reset}`);
    console.log(`  ${C.dim}  Dados persistidos — execute o script novamente para recriar${C.reset}`);
    console.log();

    process.exit(0);
  } catch (err) {
    console.error(`\n  ${C.red}❌ Erro fatal: ${err.message}${C.reset}`);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
