/**
 * Seed Script — Popula o banco com dados de demonstração (Unificado)
 * Uso: node scripts/seedData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');

// ✅ CONSOLIDADO - Usar apenas ManagedAsset
const ManagedAsset = require('../models/ManagedAsset');
const AssetModule = require('../models/AssetModule');

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
        await ManagedAsset.deleteMany({});
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

        // ✅ CONSOLIDADO - Criar diversos tipos de ativos em ManagedAsset
        const assets = [];
        
        // Totems
        for (let i = 0; i < COUNTS.totems; i++) {
            assets.push({
                asset_type: 'totem',
                asset_name: `Totem-${i + 1}`,
                serial_number: randSerial('TM'),
                ip_address: randIp(pick(IP_BASES)),
                unit: pick(UNIT_NAMES),
                status: pick(['online', 'offline']),
                hostname: `TOTEM-${i + 1}`,
                model: 'Totem v1'
            });
        }

        // Desktops
        for (let i = 0; i < 5; i++) {
            assets.push({
                asset_type: 'desktop',
                asset_name: `Desktop-${i + 1}`,
                serial_number: randSerial('DT'),
                ip_address: randIp(pick(IP_BASES)),
                unit: pick(UNIT_NAMES),
                sector: pick(SECTORS),
                status: 'online',
                model: 'Optiplex 3080',
                operating_system: 'Windows 10',
                hostname: `DESKTOP-${i + 1}`
            });
        }

        // Notebooks
        for (let i = 0; i < 5; i++) {
            assets.push({
                asset_type: 'notebook',
                asset_name: `Notebook-${i + 1}`,
                serial_number: randSerial('NB'),
                ip_address: randIp(pick(IP_BASES)),
                unit: pick(UNIT_NAMES),
                sector: pick(SECTORS),
                status: pick(['online', 'offline']),
                model: 'ThinkPad E14',
                operating_system: 'Windows 11',
                hostname: `NOTEBOOK-${i + 1}`
            });
        }

        // Printers
        for (let i = 0; i < 3; i++) {
            assets.push({
                asset_type: 'printer',
                asset_name: `Impressora-${i + 1}`,
                serial_number: randSerial('PR'),
                ip_address: randIp(pick(IP_BASES)),
                unit: pick(UNIT_NAMES),
                status: 'online',
                model: 'HP LaserJet M306',
                hostname: `PRINTER-${i + 1}`
            });
        }

        // Painéis
        for (let i = 0; i < 2; i++) {
            assets.push({
                asset_type: 'panel',
                asset_name: `Painel-${i + 1}`,
                serial_number: randSerial('PN'),
                ip_address: randIp(pick(IP_BASES)),
                unit: pick(UNIT_NAMES),
                status: 'online',
                model: 'LG 55" UHD',
                hostname: `PANEL-${i + 1}`
            });
        }

        await ManagedAsset.insertMany(assets);
        console.log(`✅ ${assets.length} Ativos criados via ManagedAsset.`);

        console.log('\n🎉 Seed completado com sucesso!');
        process.exit(0);

    } catch (e) {
        console.error('❌ Erro no seed:', e);
        process.exit(1);
    }
}

seed();
