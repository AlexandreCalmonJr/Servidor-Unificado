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
const AssetModuleConfig = require('../models/AssetModuleConfig'); // FIXED: Use Config model
const ProvisioningToken = require('../models/ProvisioningToken');
const UnitMapping = require('../models/UnitMapping');
const BssidMapping = require('../models/BssidMapping');

// ===== CONFIG =====
const COUNTS = {
    units: 10,
    bssids: 25,
    devices: 50,
    totems: 20,
    modules: 8,
    tokens: 15,
};

// ===== HELPERS =====
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randMac = () => Array.from({ length: 6 }, () => randInt(0, 255).toString(16).padStart(2, '0').toUpperCase()).join(':');
const randIp = (base) => `${base}.${randInt(1, 254)}`;
const randSerial = (prefix) => `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

// ===== REALISTIC DATA POOLS =====
const UNIT_NAMES = [
    'Matriz São Paulo', 'Filial Curitiba', 'Filial Belo Horizonte', 'CD Campinas',
    'Filial Rio de Janeiro', 'Filial Porto Alegre', 'Filial Recife', 'Filial Salvador',
    'Filial Brasília', 'Filial Manaus', 'Filial Fortaleza', 'Filial Belém'
];
const SECTORS = ['Atendimento', 'Caixa', 'Estoque', 'Administração', 'Recepção', 'TI', 'RH', 'Financeiro', 'Logística', 'Vendas'];
const FLOORS = ['Térreo', '1º Andar', '2º Andar', '3º Andar', '4º Andar', 'Subsolo', 'Mezanino'];
const DEVICE_MODELS = [
    'Samsung Galaxy A14', 'Samsung Galaxy A34', 'Samsung Galaxy A54', 'Samsung Galaxy S23 FE',
    'Motorola Moto G54', 'Motorola Moto G84', 'Motorola Edge 40',
    'Xiaomi Redmi Note 12', 'Xiaomi Redmi Note 13', 'Xiaomi POCO X5',
    'Samsung Galaxy Tab A8', 'Samsung Galaxy Tab S6 Lite',
    'Positivo Twist 4', 'LG K62', 'Honeywell EDA51', 'Zebra TC21'
];
const TOTEM_MODELS = [
    'Dell OptiPlex 3080', 'Dell OptiPlex 7090', 'Dell Wyse 5070',
    'HP ProDesk 400 G7', 'HP EliteDesk 800 G6', 'HP t640 Thin Client',
    'Lenovo ThinkCentre M70q', 'Lenovo ThinkCentre M90n',
    'Bematech RC-8400', 'Diebold Nixdorf'
];
const PRINTER_STATUS = ['Online', 'Offline', 'Sem Papel', 'Erro Toner', 'Tampa Aberta', 'Atolamento', 'N/A'];
const TOTEM_TYPES = ['Autoatendimento', 'Senha', 'Consulta', 'Informativo', 'Ponto de Venda (PDV)', 'Quiosque RH'];
const PROVISIONING_STATUS = ['pending', 'in_progress', 'completed', 'failed'];
const DEVICE_STATUS = ['online', 'offline', 'Sem Monitorar']; // Weight online/offline later
const MODULE_DEFS = [
    { name: 'Dispositivos Móveis', type: 'mobile', description: 'Smartphones e tablets corporativos' },
    { name: 'Totems de Autoatendimento', type: 'totem', description: 'Equipamentos de autoatendimento' },
    { name: 'Desktops Corporativos', type: 'desktop', description: 'Estações de trabalho fixas' },
    { name: 'Notebooks', type: 'notebook', description: 'Notebooks dos colaboradores' },
    { name: 'Impressoras', type: 'printer', description: 'Impressoras e MFPs da rede' },
    { name: 'Coletores de Dados', type: 'scanner', description: 'Coletores para estoque e logística' },
    { name: 'Relógios de Ponto', type: 'custom', description: 'Relógios de ponto biométricos' },
    { name: 'Catracas de Acesso', type: 'custom', description: 'Controle de acesso físico' },
];
const IP_BASES = ['10.0.1', '10.0.2', '10.0.3', '10.0.4', '10.0.5', '10.0.6', '10.0.7', '10.0.8', '10.0.9', '10.0.10'];

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
        // Weighted status: 40% online, 50% offline, 10% Sem Monitorar
        const r = Math.random();
        const status = r < 0.4 ? 'online' : (r < 0.9 ? 'offline' : 'Sem Monitorar');
        const provStatus = status === 'online' ? 'completed' : pick(PROVISIONING_STATUS);
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
            last_seen: daysAgo(status === 'online' ? 0 : randInt(0, 60)),
            last_sync: daysAgo(randInt(0, 7)),
            enrollment_date: daysAgo(randInt(30, 365)),
            owner_organization: 'Empresa Demo LTDA',
            compliance_status: pick(['compliant', 'non_compliant', 'unknown']),
            installed_apps: [
                { package_name: 'com.android.chrome', version: '120.0.6099.144', install_date: daysAgo(randInt(10, 100)) },
                { package_name: 'com.microsoft.teams', version: '1416/1.0.0.2023', install_date: daysAgo(randInt(10, 100)) },
                { package_name: 'com.whatsapp', version: '2.23.25.83', install_date: daysAgo(randInt(10, 100)) },
            ]
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
            hostname: `TOTEM-${unit.split(' ').pop().toUpperCase().slice(0, 3)}-${String(i + 1).padStart(2, '0')}`,
            serialNumber: randSerial('TOT'),
            model: pick(TOTEM_MODELS),
            serviceTag: randSerial('SVC'),
            ip: randIp(baseIp),
            mac_address: randMac(),
            mac_address_radio: randMac(),
            unit,
            printerStatus: pick(PRINTER_STATUS),
            lastSeen: daysAgo(randInt(0, 5)),
            biometricReaderStatus: pick(['Online', 'Online', 'Online', 'Offline', 'N/A']),
            zebraStatus: pick(['Online', 'Online', 'Offline', 'N/A']),
            bematechStatus: pick(['Online', 'Offline', 'N/A']),
            totemType: pick(TOTEM_TYPES),
            ram: pick(['4 GB', '8 GB', '16 GB', '32 GB']),
            hdType: pick(['SSD', 'HDD', 'NVMe']),
            hdStorage: pick(['128 GB', '256 GB', '512 GB', '1 TB']),
            installedPrograms: [
                'Google Chrome', 'TeamViewer', 'Java 8 Update 351',
                pick(['SAP GUI 7.70', 'Totvs Proteus', 'Linx POS']),
                'Adobe Acrobat Reader'
            ],
        });
    }
    await Totem.insertMany(totems);
    console.log(`   ✅ ${totems.length} totems criados`);
}

async function seedModules() {
    console.log('📦 Criando configurações de módulos...');
    const modules = [];
    for (const def of MODULE_DEFS) {
        modules.push({
            name: def.name,
            type: def.type,
            description: def.description,
            is_active: true,
            is_custom: false,
            settings: {
                check_interval: 60,
                alert_email: 'admin@demo.com'
            },
            custom_fields: {
                location_code: 'LOC-001',
                cost_center: 'CC-999'
            },
            created_by: null
        });
    }
    await AssetModuleConfig.insertMany(modules);
    console.log(`   ✅ ${modules.length} módulos configurados`);
}

async function seedTokens() {
    console.log('🔑 Criando tokens de provisionamento...');
    const tokens = [];
    const orgs = ['Empresa Demo LTDA', 'TechCorp SA', 'Varejo Brasil', 'Logística Express'];

    for (let i = 0; i < COUNTS.tokens; i++) {
        const isExpired = i < 3;
        const isUsed = i >= 3 && i < 6;

        tokens.push({
            token: crypto.randomBytes(16).toString('hex'),
            organization: pick(orgs),
            config_profile: pick(['Padrão Corporativo', 'Kiosk Mode', 'Técnico TI', 'Gerente', 'Vendedor Externo']),
            max_uses: randInt(1, 50),
            used_count: isUsed ? randInt(1, 10) : 0,
            expires_at: isExpired ? daysAgo(randInt(1, 30)) : new Date(Date.now() + randInt(7, 90) * 86400000),
            is_active: !isExpired,
            created_at: daysAgo(randInt(0, 60))
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
    console.log('\n🌱 === SEED DATA (FINAL) ===\n');
    console.log(`📍 Conectando a: ${uri.replace(/\/\/.*@/, '//***@')}`);

    await mongoose.connect(uri);
    console.log('✅ Conectado ao MongoDB\n');

    // Limpar dados existentes
    console.log('🗑️  Limpando dados existentes...');
    await Promise.all([
        Device.deleteMany({}),
        Totem.deleteMany({}),
        AssetModuleConfig.deleteMany({}), // FIXED: Clean Config collection
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
    console.log(`   📦 ${MODULE_DEFS.length} módulos`);
    console.log(`   🔑 ${COUNTS.tokens} tokens\n`);

    await mongoose.connection.close();
    process.exit(0);
}

main().catch(err => {
    console.error('\n❌ Erro no seed:', err.message);
    mongoose.connection.close();
    process.exit(1);
});
