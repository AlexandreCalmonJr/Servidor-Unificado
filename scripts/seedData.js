/**
 * Seed Script — Popula o banco com dados de demonstração (Unificado)
 * Uso: node scripts/seedData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');

const {
    Device,
    Desktop,
    Notebook,
    Printer,
    Totem,
    Mobile,
    Panel,
    Scanner
} = require('../models/Device');

const AssetModuleConfig = require('../models/AssetModuleConfig');
const UnitMapping = require('../models/UnitMapping');
const BssidMapping = require('../models/BssidMapping');

// ===== CONFIG =====
const COUNTS = {
    units: 5,
    devices: 30, // Total misto
    totems: 5,
    modules: 6
};

// ===== HELPERS =====
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randMac = () => Array.from({ length: 6 }, () => randInt(0, 255).toString(16).padStart(2, '0').toUpperCase()).join(':');
const randIp = (base) => `${base}.${randInt(1, 254)}`;
const randSerial = (prefix) => `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

const UNIT_NAMES = ['Matriz SP', 'Filial RJ', 'Filial BH', 'CD Campinas', 'Loja Shopping'];
const SECTORS = ['RH', 'TI', 'Financeiro', 'Vendas', 'Atendimento'];
const MODULE_TYPES = ['mobile', 'totem', 'desktop', 'notebook', 'printer', 'panel'];
const IP_BASES = ['192.168.1', '192.168.2', '192.168.3', '10.0.1', '10.0.2'];

async function seed() {
    console.log('🌱 === SEED DATA (UNIFIED) ===\n');
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado ao MongoDB');

        // Limpeza
        console.log('🗑️  Limpando dados...');
        await Device.deleteMany({});
        await AssetModuleConfig.deleteMany({});
        await UnitMapping.deleteMany({});
        await BssidMapping.deleteMany({});

        // 1. Units
        const units = [];
        for (let i = 0; i < COUNTS.units; i++) {
            units.push({
                name: UNIT_NAMES[i],
                ip_ranges: [{ start: `${IP_BASES[i]}.1`, end: `${IP_BASES[i]}.254` }]
            });
        }
        await UnitMapping.insertMany(units);
        console.log(`✅ ${units.length} Units criadas.`);

        // 2. Módulos
        const modules = MODULE_TYPES.map(type => ({
            name: type.charAt(0).toUpperCase() + type.slice(1) + 's',
            type: type,
            description: `Módulo de ${type}s`,
            is_active: true
        }));
        await AssetModuleConfig.insertMany(modules);
        console.log(`✅ ${modules.length} Módulos criados.`);

        // 3. Devices (Totems)
        const totems = [];
        for (let i = 0; i < COUNTS.totems; i++) {
            totems.push({
                serial_number: randSerial('TM'),
                asset_name: `Totem-${i + 1}`,
                device_type: 'totem',
                ip_address: randIp(pick(IP_BASES)),
                unit: pick(UNIT_NAMES),
                status: pick(['online', 'offline']),
                printer_status: pick(['OK', 'Paper Low', 'Error']),
                hostname: `TOTEM-${i + 1}`
            });
        }
        await Totem.create(totems);
        console.log(`✅ ${totems.length} Totems criados.`);

        // 4. Devices (Desktops)
        const desktops = [];
        for (let i = 0; i < 5; i++) {
            desktops.push({
                serial_number: randSerial('DT'),
                asset_name: `Desktop-${i + 1}`,
                device_type: 'desktop',
                ip_address: randIp(pick(IP_BASES)),
                unit: pick(UNIT_NAMES),
                sector: pick(SECTORS),
                status: 'online',
                model: 'Optiplex 3080',
                operating_system: 'Windows 10'
            });
        }
        await Desktop.create(desktops);
        console.log(`✅ ${desktops.length} Desktops criados.`);

        // 5. Devices (Mobiles)
        const mobiles = [];
        for (let i = 0; i < 5; i++) {
            mobiles.push({
                serial_number: randSerial('MB'),
                asset_name: `Galaxy-A54-${i + 1}`,
                device_type: 'mobile',
                ip_address: randIp(pick(IP_BASES)),
                unit: pick(UNIT_NAMES),
                status: pick(['online', 'offline']),
                battery_level: randInt(20, 100),
                model: 'Samsung Galaxy A54'
            });
        }
        await Mobile.create(mobiles);
        console.log(`✅ ${mobiles.length} Mobiles criados.`);

        console.log('\n🎉 Seed completado com sucesso!');
        process.exit(0);

    } catch (e) {
        console.error('❌ Erro no seed:', e);
        process.exit(1);
    }
}

seed();
