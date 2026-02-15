/**
 * Seed Script — Popula o banco com dados de demonstração
 * Uso: node scripts/seedData.js
 *
 * Cria: Unidades, BSSIDs, Dispositivos, Totems, Módulos, Tokens de Provisionamento
 * AVISO: Remove dados existentes antes de inserir!
 */

require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');

const Device = require('../models/Device');
const Totem = require('../models/Totem');
const AssetModule = require('../models/AssetModule');
const ProvisioningToken = require('../models/ProvisioningToken');
const UnitMapping = require('../models/UnitMapping');
const BssidMapping = require('../models/BssidMapping');

// ===== CONFIG =====
const COUNTS = {
    units: 6,
    bssids: 12,
    devices: 30,
    totems: 10,
    modules: 5,
    tokens: 8,
};

// ===== HELPERS =====
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randMac = () => Array.from({ length: 6 }, () => randInt(0, 255).toString(16).padStart(2, '0').toUpperCase()).join(':');
const randIp = (base) => `${base}.${randInt(1, 254)}`;
const randSerial = (prefix) => `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

// ===== REALISTIC DATA POOLS =====
const UNIT_NAMES = ['Matriz São Paulo', 'Filial Curitiba', 'Filial Belo Horizonte', 'CD Campinas', 'Filial Rio de Janeiro', 'Filial Porto Alegre', 'Filial Recife', 'Filial Salvador'];
const SECTORS = ['Atendimento', 'Caixa', 'Estoque', 'Administração', 'Recepção', 'TI', 'RH', 'Financeiro'];
const FLOORS = ['Térreo', '1º Andar', '2º Andar', '3º Andar', 'Subsolo'];
const DEVICE_MODELS = ['Samsung Galaxy A14', 'Samsung Galaxy A34', 'Motorola Moto G54', 'Xiaomi Redmi Note 12', 'Samsung Galaxy Tab A8', 'Positivo Twist 4', 'LG K62'];
const TOTEM_MODELS = ['Dell OptiPlex 3080', 'HP ProDesk 400 G7', 'Lenovo ThinkCentre M70q', 'Dell OptiPlex 5090', 'HP EliteDesk 800 G6'];
const PRINTER_STATUS = ['Online', 'Offline', 'Sem Papel', 'Erro Toner', 'N/A'];
const TOTEM_TYPES = ['Autoatendimento', 'Senha', 'Consulta', 'Informativo'];
const PROVISIONING_STATUS = ['pending', 'in_progress', 'completed', 'failed'];
const DEVICE_STATUS = ['online', 'offline', 'Sem Monitorar'];
const MODULE_DEFS = [
    { name: 'Dispositivos Móveis', type: 'mobile', description: 'Smartphones e tablets corporativos' },
    { name: 'Totems de Autoatendimento', type: 'totem', description: 'Equipamentos de autoatendimento' },
    { name: 'Desktops Corporativos', type: 'desktop', description: 'Estações de trabalho fixas' },
    { name: 'Notebooks', type: 'notebook', description: 'Notebooks dos colaboradores' },
    { name: 'Impressoras', type: 'printer', description: 'Impressoras e MFPs da rede' },
];
const IP_BASES = ['10.0.1', '10.0.2', '10.0.3', '10.0.4', '10.0.5', '10.0.6'];

// ===== SEED FUNCTIONS =====

async function seedUnits() {
    console.log('🏢 Criando unidades...');
    const units = [];
    for (let i = 0; i < COUNTS.units; i++) {
        const base = IP_BASES[i] || `10.0.${i + 1}`;
        units.push({
            name: UNIT_NAMES[i] || `Unidade ${i + 1}`,
            ip_ranges: [{ start: `${base}.1`, end: `${base}.254` }],
        });
    }
    await UnitMapping.insertMany(units);
    console.log(`   ✅ ${units.length} unidades criadas`);
    return units.map(u => u.name);
}

async function seedBssids(unitNames) {
    console.log('📡 Criando mapeamentos BSSID...');
    const bssids = [];
    for (let i = 0; i < COUNTS.bssids; i++) {
        bssids.push({
            mac_address_radio: randMac(),
            sector: pick(SECTORS),
            floor: pick(FLOORS),
            unitName: pick(unitNames),
        });
    }
    await BssidMapping.insertMany(bssids);
    console.log(`   ✅ ${bssids.length} BSSIDs criados`);
}

async function seedDevices(unitNames) {
    console.log('📱 Criando dispositivos...');
    const devices = [];
    for (let i = 0; i < COUNTS.devices; i++) {
        const serial = randSerial('MDM');
        const unit = pick(unitNames);
        const status = pick(DEVICE_STATUS);
        const provStatus = pick(PROVISIONING_STATUS);
        const baseIp = IP_BASES[unitNames.indexOf(unit)] || '10.0.1';

        devices.push({
            device_name: `Device-${serial.slice(-4)}`,
            device_model: pick(DEVICE_MODELS),
            device_id: crypto.randomUUID(),
            serial_number: serial,
            imei: `35${randInt(1000000000000, 9999999999999)}`,
            battery: randInt(5, 100),
            network: pick(['Wi-Fi', '4G', '5G', 'Ethernet']),
            host: `host-${i + 1}.local`,
            sector: pick(SECTORS),
            floor: pick(FLOORS),
            mac_address_radio: randMac(),
            ip_address: randIp(baseIp),
            unit,
            status,
            is_online: status === 'online',
            provisioning_status: provStatus,
            last_seen: daysAgo(status === 'online' ? 0 : randInt(1, 30)),
            last_sync: daysAgo(randInt(0, 7)),
            enrollment_date: daysAgo(randInt(30, 365)),
            owner_organization: 'Empresa Demo LTDA',
            compliance_status: pick(['compliant', 'non_compliant', 'unknown']),
        });
    }
    await Device.insertMany(devices);
    console.log(`   ✅ ${devices.length} dispositivos criados`);

    const online = devices.filter(d => d.status === 'online').length;
    const offline = devices.filter(d => d.status === 'offline').length;
    console.log(`   📊 Online: ${online} | Offline: ${offline} | Sem Monitorar: ${devices.length - online - offline}`);
}

async function seedTotems(unitNames) {
    console.log('🖥️  Criando totems...');
    const totems = [];
    for (let i = 0; i < COUNTS.totems; i++) {
        const unit = pick(unitNames);
        const baseIp = IP_BASES[unitNames.indexOf(unit)] || '10.0.1';

        totems.push({
            hostname: `TOTEM-${unit.split(' ').pop().toUpperCase()}-${String(i + 1).padStart(2, '0')}`,
            serialNumber: randSerial('TOT'),
            model: pick(TOTEM_MODELS),
            serviceTag: randSerial('SVC'),
            ip: randIp(baseIp),
            mac_address: randMac(),
            mac_address_radio: randMac(),
            unit,
            printerStatus: pick(PRINTER_STATUS),
            lastSeen: daysAgo(randInt(0, 5)),
            biometricReaderStatus: pick(['Online', 'Offline', 'N/A']),
            zebraStatus: pick(['Online', 'Offline', 'N/A']),
            bematechStatus: pick(['Online', 'Offline', 'N/A']),
            totemType: pick(TOTEM_TYPES),
            ram: pick(['4 GB', '8 GB', '16 GB']),
            hdType: pick(['SSD', 'HDD', 'NVMe']),
            hdStorage: pick(['128 GB', '256 GB', '512 GB', '1 TB']),
            installedPrograms: ['Chrome', 'AutoAtendimento v3.2', 'TeamViewer', pick(['SAP GUI', 'Totvs', 'WinSCP'])],
        });
    }
    await Totem.insertMany(totems);
    console.log(`   ✅ ${totems.length} totems criados`);
}

async function seedModules() {
    console.log('📦 Criando módulos...');
    const modules = [];
    for (const def of MODULE_DEFS.slice(0, COUNTS.modules)) {
        modules.push({
            name: def.name,
            type: def.type,
            description: def.description,
            is_active: true,
            is_custom: false,
        });
    }
    await AssetModule.insertMany(modules);
    console.log(`   ✅ ${modules.length} módulos criados`);
}

async function seedTokens() {
    console.log('🔑 Criando tokens de provisionamento...');
    const tokens = [];
    const orgs = ['Empresa Demo LTDA', 'TechCorp SA', 'Varejo Brasil'];

    for (let i = 0; i < COUNTS.tokens; i++) {
        const isExpired = i < 2;
        const isUsed = i >= 2 && i < 4;

        tokens.push({
            token: crypto.randomBytes(16).toString('hex'),
            organization: pick(orgs),
            config_profile: pick(['Padrão Corporativo', 'Kiosk Mode', 'Técnico TI', 'Gerente']),
            max_uses: randInt(1, 10),
            used_count: isUsed ? randInt(1, 5) : 0,
            expires_at: isExpired ? daysAgo(randInt(1, 30)) : new Date(Date.now() + randInt(7, 90) * 86400000),
            is_active: !isExpired,
        });
    }
    await ProvisioningToken.insertMany(tokens);
    console.log(`   ✅ ${tokens.length} tokens criados`);

    const active = tokens.filter(t => t.is_active && t.expires_at > new Date()).length;
    console.log(`   📊 Ativos: ${active} | Expirados: ${tokens.length - active}`);
}

// ===== MAIN =====
async function main() {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/mdm';
    console.log('\n🌱 === SEED DATA ===\n');
    console.log(`📍 Conectando a: ${uri.replace(/\/\/.*@/, '//***@')}`);

    await mongoose.connect(uri);
    console.log('✅ Conectado ao MongoDB\n');

    // Limpar dados existentes
    console.log('🗑️  Limpando dados existentes...');
    await Promise.all([
        Device.deleteMany({}),
        Totem.deleteMany({}),
        AssetModule.deleteMany({}),
        ProvisioningToken.deleteMany({}),
        UnitMapping.deleteMany({}),
        BssidMapping.deleteMany({}),
    ]);
    console.log('   ✅ Dados limpos\n');

    // Inserir dados
    const unitNames = await seedUnits();
    await seedBssids(unitNames);
    await seedDevices(unitNames);
    await seedTotems(unitNames);
    await seedModules();
    await seedTokens();

    console.log('\n🎉 Seed completo!');
    console.log(`\n📊 Resumo:`);
    console.log(`   🏢 ${COUNTS.units} unidades`);
    console.log(`   📡 ${COUNTS.bssids} BSSIDs`);
    console.log(`   📱 ${COUNTS.devices} dispositivos`);
    console.log(`   🖥️  ${COUNTS.totems} totems`);
    console.log(`   📦 ${COUNTS.modules} módulos`);
    console.log(`   🔑 ${COUNTS.tokens} tokens\n`);

    await mongoose.connection.close();
    process.exit(0);
}

main().catch(err => {
    console.error('\n❌ Erro no seed:', err.message);
    mongoose.connection.close();
    process.exit(1);
});
