#!/usr/bin/env node
/**
 * scripts/printerstest.js
 * Debug utility for PrinterService.
 *
 * Usage:
 *   node scripts/printerstest.js [command] [args] [--json]
 *
 * Commands:
 *   summary                        Show printers summary
 *   list                           List managed printers
 *   discover [--persist]           Discover printers (optional persist)
 *   test-ip <ip> [community]       Run direct status test against an IP
 *   imaging-debug <ip> [community] Deep debug for imaging unit detection
 *   poll-all                       Poll status for all managed printers
 *   poll-id <printerId>            Poll one printer by Mongo _id
 *   get-id <printerId>             Show one managed printer by Mongo _id
 *
 * Examples:
 *   node scripts/printerstest.js summary
 *   node scripts/printerstest.js list
 *   node scripts/printerstest.js discover --persist
 *   node scripts/printerstest.js test-ip 10.71.3.101 public
 */

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const http = require('http');
const https = require('https');

let PrinterService;
let ManagedAsset;
let snmp = null;

dotenv.config();

const args = process.argv.slice(2);
const command = (args[0] || 'summary').toLowerCase();
const jsonMode = args.includes('--json');

function parseArgValue(position, fallback = null) {
  const value = args[position];
  if (value === undefined || value === null || String(value).startsWith('--')) return fallback;
  return value;
}

function logTitle(text) {
  if (jsonMode) return;
  console.log('\n' + '='.repeat(72));
  console.log(text);
  console.log('='.repeat(72));
}

function print(data) {
  if (jsonMode) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  console.log(data);
}

function printError(message, error) {
  if (jsonMode) {
    console.error(JSON.stringify({ success: false, message, error: error?.message || null }, null, 2));
    return;
  }
  console.error(`\n[ERROR] ${message}`);
  if (error?.message) console.error(error.message);
}

function compactPrinter(printer) {
  const toner = printer?.toner_levels || printer?.custom_data?.toner_levels || {};
  const custom = printer?.custom_data || {};
  return {
    id: printer?._id,
    name: printer?.asset_name,
    serial: printer?.serial_number,
    manufacturer: printer?.manufacturer,
    model: printer?.model,
    status: printer?.status,
    connection_type: printer?.connection_type,
    address: printer?.ip_address || printer?.usb_path || null,
    unit: printer?.unit || null,
    sector: printer?.sector || null,
    floor: printer?.floor || printer?.location || null,
    last_check_time: printer?.last_check_time || printer?.updated_at || null,
    total_pages: printer?.total_pages ?? null,
    toner_levels: toner,
    snmp_available: custom.snmp_available,
    response_ms: custom.response_ms,
    open_ports: custom.open_ports || [],
    alerts: custom.alerts || [],
  };
}

function usage() {
  const text = [
    'Usage: node scripts/printerstest.js [command] [args] [--json]',
    '',
    'Commands:',
    '  summary                        Show printers summary',
    '  list                           List managed printers',
    '  discover [--persist]           Discover printers (optional persist)',
    '  test-ip <ip> [community]       Run direct status test against an IP',
    '  imaging-debug <ip> [community] Deep debug for imaging unit detection',
    '  poll-all                       Poll status for all managed printers',
    '  poll-id <printerId>            Poll one printer by Mongo _id',
    '  get-id <printerId>             Show one managed printer by Mongo _id',
  ].join('\n');
  print(text);
}

const SUPPLIES_DESC_BASE_OID = '1.3.6.1.2.1.43.11.1.1.6.1';
const SUPPLIES_TYPE_BASE_OID = '1.3.6.1.2.1.43.11.1.1.5.1';
const SUPPLIES_MAX_BASE_OID = '1.3.6.1.2.1.43.11.1.1.8.1';
const SUPPLIES_CUR_BASE_OID = '1.3.6.1.2.1.43.11.1.1.9.1';
const IMAGING_FIXED_MAX_OID = '1.3.6.1.2.1.43.11.1.1.8.1.5';
const IMAGING_FIXED_CUR_OID = '1.3.6.1.2.1.43.11.1.1.9.1.5';
const SUPPLY_TYPE = { TONER: 3, OPC: 9, DEVELOPER: 10, FUSER: 15, TRANSFER_UNIT: 30 };
const IMAGING_DESC_HINT = /(imaging|image unit|drum|opc|photo conductor|unidade de imagem|unidad de imagen|cilindro|fotocondutor|tambor)/i;
const IMAGING_DESC_EXCLUDE = /(fuser|maintenance kit|transfer|belt|waste|collector|pickup|roller|fixador|fusor)/i;
const TONER_DESC_HINT = /(toner|cartridge|cartucho|w1330|w1331|cf258|cf259|mlt-|crum)/i;
const HP_IMAGING_CANDIDATES = [
  { label: 'HP prop imaging alt #1', cur: '1.3.6.1.4.1.11.2.3.9.4.2.1.1.6.1.20.2', max: '1.3.6.1.4.1.11.2.3.9.4.2.1.1.6.1.22.2' },
  { label: 'HP prop imaging alt #2', cur: '1.3.6.1.4.1.11.2.3.9.4.2.1.1.6.1.20.3', max: '1.3.6.1.4.1.11.2.3.9.4.2.1.1.6.1.22.3' },
  { label: 'HP mono imaging #1', cur: '1.3.6.1.4.1.11.2.3.9.4.2.2.1.4.1.1.2', max: '1.3.6.1.4.1.11.2.3.9.4.2.2.1.4.1.2.2' },
  { label: 'HP mono imaging #2', cur: '1.3.6.1.4.1.11.2.3.9.4.2.2.1.4.1.1.3', max: '1.3.6.1.4.1.11.2.3.9.4.2.2.1.4.1.2.3' },
  { label: 'HP LaserJet imaging drum', cur: '1.3.6.1.4.1.11.2.3.9.1.1.3.4.1', max: '1.3.6.1.4.1.11.2.3.9.1.1.3.5.1' },
];

function createSnmpSession(ip, community) {
  return snmp.createSession(ip, community, {
    timeout: 8000,
    retries: 1,
    version: snmp.Version2c,
  });
}

function snmpSubtreeDebug(ip, community, baseOid) {
  return new Promise((resolve) => {
    const session = createSnmpSession(ip, community);
    const result = {};

    const feedCb = (varbinds) => {
      (varbinds || []).forEach((vb) => {
        if (snmp.isVarbindError(vb)) return;
        result[vb.oid] = Buffer.isBuffer(vb.value)
          ? vb.value.toString('utf8').replace(/\0/g, '').trim()
          : vb.value;
      });
    };

    const doneCb = () => {
      session.close();
      resolve(result);
    };

    try {
      session.subtree(baseOid, feedCb, doneCb);
    } catch (_error) {
      try { session.close(); } catch (_e) {}
      resolve({});
    }
  });
}

function snmpGetDebug(ip, community, oids) {
  return new Promise((resolve) => {
    const session = createSnmpSession(ip, community);
    session.get(oids, (error, varbinds) => {
      session.close();
      if (error) return resolve({});
      const result = {};
      (varbinds || []).forEach((vb, idx) => {
        if (snmp.isVarbindError(vb)) return;
        result[oids[idx]] = Buffer.isBuffer(vb.value)
          ? vb.value.toString('utf8').replace(/\0/g, '').trim()
          : vb.value;
      });
      resolve(result);
    });
  });
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function percent(current, max) {
  if (max === null || max <= 0 || current === null) return null;
  if (current === -3) return null;
  if (current < 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
}

async function probeHpImagingCandidates(ip, community) {
  const probes = [];
  for (const candidate of HP_IMAGING_CANDIDATES) {
    const oids = candidate.max ? [candidate.cur, candidate.max] : [candidate.cur];
    const data = await snmpGetDebug(ip, community, oids);
    const cur = toNumber(data[candidate.cur]);
    const max = toNumber(data[candidate.max]);

    let pct = percent(cur, max);
    let mode = 'cur/max';

    if (pct === null && cur !== null && cur >= 0 && cur <= 100 && (max === null || max <= 0)) {
      pct = Math.round(cur);
      mode = 'direct_percent';
    }

    probes.push({
      label: candidate.label,
      cur_oid: candidate.cur,
      max_oid: candidate.max || null,
      cur,
      max,
      percent: pct,
      mode,
      has_data: cur !== null || max !== null,
    });
  }
  return probes;
}

function cleanHtmlForMatch(html) {
  return String(html || '')
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ');
}

function tryParseLooseJsObject(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    // Endpoint HP retorna objeto JS (não JSON estrito). Parser controlado para debug local.
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${raw});`)();
  } catch (_error) {
    return null;
  }
}

function fetchUrlText(url) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    const req = client.get(url, {
      timeout: 7000,
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'printerstest/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    }, (res) => {
      const status = Number(res.statusCode || 0);

      if (status >= 300 && status < 400 && res.headers.location) {
        const redirected = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).toString();
        res.resume();
        fetchUrlText(redirected).then(resolve).catch(reject);
        return;
      }

      if (status < 200 || status >= 300) {
        res.resume();
        reject(new Error(`HTTP ${status}`));
        return;
      }

      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve(body));
    });

    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', reject);
  });
}

async function fetchWebImagingPercent(ip) {
  const apiUrls = [
    `https://${ip}/sws/app/information/supplies/supplies.json`,
    `http://${ip}/sws/app/information/supplies/supplies.json`,
  ];

  for (const apiUrl of apiUrls) {
    try {
      const body = await fetchUrlText(apiUrl);
      const obj = tryParseLooseJsObject(body);
      if (!obj || typeof obj !== 'object') continue;
      const drum = obj.drum_black || obj.drum || null;
      const toner = obj.toner_black || obj.toner || null;
      const drumRemaining = toNumber(drum?.remaining);
      const tonerRemaining = toNumber(toner?.remaining);
      if (drumRemaining !== null) {
        return {
          success: true,
          source_url: apiUrl,
          percent: drumRemaining,
          method: 'web_api',
          details: {
            drum_remaining: drumRemaining,
            toner_remaining: tonerRemaining,
            drum_count: toNumber(drum?.cnt),
            drum_capacity: toNumber(drum?.capa),
          },
          candidates: [{ url: apiUrl, percent: drumRemaining, raw: 'drum_black.remaining' }],
          checked: [apiUrl],
        };
      }
    } catch (_error) {
      // try next api url
    }
  }

  const urls = [
    `https://${ip}/sws/index.html`,
    `https://${ip}/`,
    `https://${ip}/hp/device/DeviceStatus/SuppliesStatus`,
    `https://${ip}/hp/device/DeviceStatus/View`,
    `https://${ip}/hp/device/PrintQuality/Index`,
    `https://${ip}/hp/device/this.LCDispatcher?nav=hp.Supplies`,
    `https://${ip}/hp/device/DeviceStatus/Index`,
    `https://${ip}/DevMgmt/ConsumableConfigDyn.xml`,
    `https://${ip}/DevMgmt/ConsumableStatusDyn.xml`,
    `https://${ip}/DevMgmt/ProductStatusDyn.xml`,
    `https://${ip}/DevMgmt/ProductUsageDyn.xml`,
    `http://${ip}/`,
    `http://${ip}/sws/index.html`,
    `http://${ip}/hp/device/DeviceStatus/SuppliesStatus`,
    `http://${ip}/hp/device/DeviceStatus/View`,
    `http://${ip}/hp/device/PrintQuality/Index`,
    `http://${ip}/hp/device/this.LCDispatcher?nav=hp.Supplies`,
    `http://${ip}/hp/device/DeviceStatus/Index`,
    `http://${ip}/DevMgmt/ConsumableConfigDyn.xml`,
    `http://${ip}/DevMgmt/ConsumableStatusDyn.xml`,
    `http://${ip}/DevMgmt/ProductStatusDyn.xml`,
    `http://${ip}/DevMgmt/ProductUsageDyn.xml`,
  ];

  const candidates = [];
  const checked = [];

  for (const url of urls) {
    try {
      const html = cleanHtmlForMatch(await fetchUrlText(url));
      checked.push(url);
      if (!html) continue;

      const lowered = html.toLowerCase();
      const startIdx = lowered.indexOf('unidade de imagem');
      const startIdxEn = lowered.indexOf('imaging unit');
      const markerIdx = startIdx >= 0 ? startIdx : startIdxEn;
      if (markerIdx === -1) continue;

      const endIdx = lowered.indexOf('bandejas de entrada', markerIdx);
      const section = html.slice(markerIdx, endIdx > markerIdx ? endIdx : markerIdx + 2500);
      const match = section.match(/(\d{1,3})\s*%/);
      if (!match) {
        const keywordRegex = /(unidade de imagem|imaging unit|drum|opc)[^%]{0,140}?(\d{1,3})\s*%/ig;
        let km = keywordRegex.exec(section);
        while (km) {
          const pct = Number(km[2]);
          if (Number.isFinite(pct)) candidates.push({ url, percent: pct, raw: km[0] });
          km = keywordRegex.exec(section);
        }
        continue;
      }

      const percentValue = Number(match[1]);
      if (!Number.isFinite(percentValue)) continue;
      candidates.push({ url, percent: percentValue, raw: match[0] });
      return { success: true, source_url: url, percent: percentValue, method: 'html_probe', details: null, candidates, checked };
    } catch (_error) {
      // try next URL
    }
  }

  return { success: false, source_url: null, percent: null, method: null, details: null, candidates, checked };
}

async function runSummary(service) {
  logTitle('PRINTER DEBUG - SUMMARY');
  const summary = await service.getSummary();
  print(summary);
}

async function runList(service) {
  logTitle('PRINTER DEBUG - LIST');
  const printers = await service.getManagedPrinters();
  const rows = (printers || []).map(compactPrinter);
  if (jsonMode) {
    print({ total: rows.length, printers: rows });
    return;
  }

  console.log(`Total: ${rows.length}`);
  rows.forEach((row, idx) => {
    console.log(`\n[${idx + 1}] ${row.name || '-'} (${row.id || '-'})`);
    console.log(`  status=${row.status || '-'} model=${row.model || '-'} manufacturer=${row.manufacturer || '-'}`);
    console.log(`  connection=${row.connection_type || '-'} address=${row.address || '-'}`);
    console.log(`  location=${row.unit || '-'} / ${row.sector || '-'} / ${row.floor || '-'}`);
    console.log(`  last_check=${row.last_check_time || '-'} total_pages=${row.total_pages ?? '-'}`);
    console.log(`  toner=${JSON.stringify(row.toner_levels || {})}`);
    console.log(`  snmp=${row.snmp_available === false ? 'off' : 'on'} response_ms=${row.response_ms ?? '-'} ports=${(row.open_ports || []).join(',') || '-'}`);
    if (row.alerts?.length) console.log(`  alerts=${JSON.stringify(row.alerts)}`);
  });
}

async function runDiscover(service) {
  const persist = args.includes('--persist');
  logTitle(`PRINTER DEBUG - DISCOVER (persist=${persist})`);
  const result = await service.discoverPrinters({ persist });
  print(result);
}

async function runTestIp(service) {
  const ip = parseArgValue(1);
  const community = parseArgValue(2, 'public');
  if (!ip) {
    usage();
    throw new Error('Missing ip argument for test-ip');
  }

  logTitle(`PRINTER DEBUG - TEST IP (${ip})`);
  if (typeof service.testPrinter !== 'function') {
    throw new Error('PrinterService.testPrinter is not available');
  }
  const result = await service.testPrinter(ip, community);
  print(result);
}

async function runImagingDebug() {
  const ip = parseArgValue(1);
  const community = parseArgValue(2, 'public');
  if (!ip) {
    usage();
    throw new Error('Missing ip argument for imaging-debug');
  }
  if (!snmp) {
    throw new Error('net-snmp is not installed. Run: npm install net-snmp');
  }

  logTitle(`PRINTER DEBUG - IMAGING (${ip})`);
  const identifyOids = [
    '1.3.6.1.2.1.1.1.0', // sysDescr
    '1.3.6.1.4.1.11.2.3.9.4.2.1.1.3.2.0', // HP model
    '1.3.6.1.2.1.25.3.5.1.1.1', // printer status
  ];
  const identify = await snmpGetDebug(ip, community, identifyOids);

  const [descMap, typeMap, maxMap, curMap] = await Promise.all([
    snmpSubtreeDebug(ip, community, SUPPLIES_DESC_BASE_OID),
    snmpSubtreeDebug(ip, community, SUPPLIES_TYPE_BASE_OID),
    snmpSubtreeDebug(ip, community, SUPPLIES_MAX_BASE_OID),
    snmpSubtreeDebug(ip, community, SUPPLIES_CUR_BASE_OID),
  ]);

  const fixedImagingData = await snmpGetDebug(ip, community, [IMAGING_FIXED_CUR_OID, IMAGING_FIXED_MAX_OID]);
  const fixedCur = toNumber(fixedImagingData[IMAGING_FIXED_CUR_OID]);
  const fixedMax = toNumber(fixedImagingData[IMAGING_FIXED_MAX_OID]);
  const fixedPct = percent(fixedCur, fixedMax);
  const hpProbe = await probeHpImagingCandidates(ip, community);
  const webProbe = await fetchWebImagingPercent(ip);

  const toIndex = (oid) => String(oid || '').split('.').pop();
  const indexes = Array.from(new Set([
    ...Object.keys(descMap).map(toIndex),
    ...Object.keys(maxMap).map(toIndex),
  ])).filter((idx) => /^\d+$/.test(String(idx)));

  const ranked = indexes.map((idx) => {
    const descRaw = String(descMap[`${SUPPLIES_DESC_BASE_OID}.${idx}`] || '');
    const desc = descRaw.toLowerCase();
    const type = toNumber(typeMap[`${SUPPLIES_TYPE_BASE_OID}.${idx}`]);
    const max = toNumber(maxMap[`${SUPPLIES_MAX_BASE_OID}.${idx}`]);
    const cur = toNumber(curMap[`${SUPPLIES_CUR_BASE_OID}.${idx}`]);
    const pct = percent(cur, max);

    const hasHint = IMAGING_DESC_HINT.test(descRaw);
    const hasExclude = IMAGING_DESC_EXCLUDE.test(descRaw);
    const hasToner = TONER_DESC_HINT.test(descRaw);
    const isOPC = type === SUPPLY_TYPE.OPC;
    const isDev = type === SUPPLY_TYPE.DEVELOPER;
    const isExclType = [SUPPLY_TYPE.FUSER, SUPPLY_TYPE.TRANSFER_UNIT, SUPPLY_TYPE.TONER].includes(type);

    let score = 0;
    if (hasHint) score += 50;
    if (isOPC) score += 35;
    if (isDev) score += 8;
    if (hasExclude) score -= 100;
    if (hasToner) score -= 100;
    if (isExclType) score -= 100;
    if (/(black|preto|\bk\b)/i.test(descRaw)) score += 12;
    if (/(cyan|magenta|yellow|ciano|amarelo)/i.test(descRaw)) score -= 20;
    if (pct === null) score -= 5;

    const accepted = pct !== null && (isOPC || hasHint || isDev) && !hasExclude && !isExclType && !hasToner;

    return {
      idx,
      desc: descRaw,
      type,
      cur,
      max,
      percent: pct,
      score,
      flags: { hasHint, isOPC, isDev, hasExclude, isExclType, hasToner },
      accepted,
    };
  }).sort((a, b) => b.score - a.score);

  const best = ranked.find((r) => r.accepted);

  const payload = {
    ip,
    community,
    service_result: {
      status: identify['1.3.6.1.2.1.25.3.5.1.1.1'] ? 'online' : 'unknown',
      model: identify['1.3.6.1.4.1.11.2.3.9.4.2.1.1.3.2.0'] || identify['1.3.6.1.2.1.1.1.0'] || null,
      manufacturer: 'HP',
      imaging_supported: fixedPct !== null,
      imaging_by_service_walk: null,
      imaging_from_toner_levels: fixedPct,
      imaging_fixed_oid: {
        cur_oid: IMAGING_FIXED_CUR_OID,
        max_oid: IMAGING_FIXED_MAX_OID,
        cur: fixedCur,
        max: fixedMax,
        percent: fixedPct,
      },
      imaging_hp_candidates: hpProbe,
      imaging_web_probe: webProbe,
      toner_levels: { imaging_unit: fixedPct },
      error: identify['1.3.6.1.2.1.1.1.0'] || fixedPct !== null ? null : 'SNMP sem resposta util',
      snmp_available: Boolean(Object.keys(identify).length || fixedPct !== null),
    },
    debug: {
      supplies_count: ranked.length,
      best_candidate: best || null,
      top_candidates: ranked.slice(0, 20),
    },
  };

  if (jsonMode) {
    print(payload);
    return;
  }

  console.log(`SNMP available: ${payload.service_result.snmp_available}`);
  console.log(`Status: ${payload.service_result.status || '-'} | Model: ${payload.service_result.model || '-'}`);
  console.log(`imaging_supported: ${payload.service_result.imaging_supported}`);
  console.log(`imaging_by_service_walk: ${payload.service_result.imaging_by_service_walk}`);
  console.log(`imaging_from_toner_levels: ${payload.service_result.imaging_from_toner_levels}`);
  console.log(
    `imaging_fixed_oid: cur=${payload.service_result.imaging_fixed_oid.cur} max=${payload.service_result.imaging_fixed_oid.max} pct=${payload.service_result.imaging_fixed_oid.percent}`
  );
  if (payload.service_result.imaging_web_probe.success) {
    console.log(
      `imaging_web_probe: pct=${payload.service_result.imaging_web_probe.percent} source=${payload.service_result.imaging_web_probe.source_url} method=${payload.service_result.imaging_web_probe.method}`
    );
    if (payload.service_result.imaging_web_probe.details) {
      const d = payload.service_result.imaging_web_probe.details;
      console.log(`  web_details: drum_remaining=${d.drum_remaining} toner_remaining=${d.toner_remaining} drum_cnt=${d.drum_count} drum_capa=${d.drum_capacity}`);
    }
  } else {
    console.log('imaging_web_probe: unavailable');
  }
  if (payload.service_result.error) console.log(`service_error: ${payload.service_result.error}`);

  console.log('\nHP proprietary candidates:');
  payload.service_result.imaging_hp_candidates
    .filter((row) => row.has_data)
    .forEach((row) => {
      console.log(
        `  ${row.label}: cur=${row.cur} max=${row.max} pct=${row.percent} mode=${row.mode}`
      );
      console.log(`    cur_oid=${row.cur_oid}`);
      if (row.max_oid) console.log(`    max_oid=${row.max_oid}`);
    });

  console.log('\nTop candidates (score desc):');
  payload.debug.top_candidates.forEach((c) => {
    const flags = [];
    if (c.flags.hasHint) flags.push('hint');
    if (c.flags.isOPC) flags.push('opc');
    if (c.flags.isDev) flags.push('developer');
    if (c.flags.hasExclude) flags.push('exclude-word');
    if (c.flags.isExclType) flags.push('exclude-type');
    if (c.flags.hasToner) flags.push('toner-word');
    const acceptedTag = c.accepted ? 'ACCEPTED' : 'rejected';
    console.log(
      `  idx=${String(c.idx).padStart(3, ' ')} score=${String(c.score).padStart(4, ' ')} pct=${String(c.percent)} ${acceptedTag}`
    );
    console.log(`    desc="${c.desc || '-'}" type=${c.type} cur=${c.cur} max=${c.max} flags=[${flags.join(',')}]`);
  });

  if (!payload.debug.supplies_count) {
    console.log('\nNo entries found in prtSuppliesTable. Device may not expose supplies via walk.');
    if (fixedPct !== null) {
      console.log('Fallback from fixed OID is available and valid.');
    } else {
      console.log('Fixed imaging OID is also unavailable/invalid for this device/community.');
    }
    if (payload.service_result.imaging_web_probe.candidates?.length) {
      console.log('\nWeb candidates found (keyword match):');
      payload.service_result.imaging_web_probe.candidates.slice(0, 10).forEach((c) => {
        console.log(`  pct=${c.percent} url=${c.url}`);
      });
    }
    return;
  }

  if (!best) {
    console.log('\nNo accepted imaging candidate. Most common causes:');
    console.log('  1) Device does not expose drum/imaging as separate supply (integrated cartridge).');
    console.log('  2) SNMP exposes only toner/fuser/transfer entries.');
    console.log('  3) Current community has limited OID visibility.');
  }
}

async function runPollAll(service) {
  logTitle('PRINTER DEBUG - POLL ALL');
  const result = await service.pollAll();
  print(result);
}

async function runPollId(service) {
  const printerId = parseArgValue(1);
  if (!printerId) {
    usage();
    throw new Error('Missing printerId for poll-id');
  }

  logTitle(`PRINTER DEBUG - POLL ID (${printerId})`);
  const updated = await service.pollPrinter(printerId);
  const output = typeof updated?.toObject === 'function' ? updated.toObject() : updated;
  print(compactPrinter(output));
}

async function runGetId() {
  const printerId = parseArgValue(1);
  if (!printerId) {
    usage();
    throw new Error('Missing printerId for get-id');
  }

  logTitle(`PRINTER DEBUG - GET ID (${printerId})`);
  const printer = await ManagedAsset.findById(printerId).lean();
  if (!printer) {
    throw new Error('Printer not found');
  }
  print(compactPrinter(printer));
}

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/servidor-unificado';

  if (command === 'help' || command === '--help' || command === '-h') {
    usage();
    return;
  }

  try {
    snmp = require('net-snmp');
  } catch (_error) {
    snmp = null;
  }

  const commandNeedsDb = ['summary', 'list', 'discover', 'poll-all', 'poll-id', 'get-id'].includes(command);
  const commandNeedsService = ['summary', 'list', 'discover', 'test-ip', 'poll-all', 'poll-id'].includes(command);

  let service = null;
  if (commandNeedsDb) {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
  }

  if (commandNeedsService) {
    PrinterService = require('../services/printerService');
    const logger = {
      info: (...msg) => !jsonMode && console.log('[info]', ...msg),
      warn: (...msg) => !jsonMode && console.warn('[warn]', ...msg),
      error: (...msg) => !jsonMode && console.error('[error]', ...msg),
    };
    service = new PrinterService(logger);
  }
  if (command === 'get-id') {
    ManagedAsset = require('../models/ManagedAsset');
  }

  switch (command) {
    case 'summary':
      await runSummary(service);
      break;
    case 'list':
      await runList(service);
      break;
    case 'discover':
      await runDiscover(service);
      break;
    case 'test-ip':
      await runTestIp(service);
      break;
    case 'imaging-debug':
      await runImagingDebug();
      break;
    case 'poll-all':
      await runPollAll(service);
      break;
    case 'poll-id':
      await runPollId(service);
      break;
    case 'get-id':
      await runGetId();
      break;
    default:
      usage();
      throw new Error(`Unknown command: ${command}`);
  }
}

main()
  .then(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    printError('Printer debug script failed', error);
    try {
      if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    } catch (_e) {
      // ignore close errors
    }
    process.exit(1);
  });
