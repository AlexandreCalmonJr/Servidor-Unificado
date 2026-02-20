// scripts/migrate_to_unified_device.js
const mongoose = require('mongoose');
require('dotenv').config();

// Carrega Modelos Legados (Assumindo que os arquivos ainda existem)
// Se já foram deletados, precisaríamos definir schemas inline temporários
const LegacyTotem = require('../models/Totem');
// ✅ CONSOLIDADO - Desktop/Notebook/Printer/Panel foram unificados em ManagedAsset
const LegacyManagedAsset = require('../models/ManagedAsset');
// Device Mobile já era 'Device', mas precisamos atualizar para o novo Schema se mudou muito
// ou se vamos renomear a collection antiga e migrar. 
// Assumindo: 'Device' antigo -> 'devices_legacy_mobile' (vamos renomear para segurança antes?)
// Estratégia: Ler todas coleções e inserir na NOVA 'devices'.

const { Device } = require('../models/Device');

async function migrate() {
    console.log('🚀 Iniciando Migração para Modelo Unificado...');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado ao MongoDB');

        // Limpa coleção nova (Opcional - CUIDADO em prod)
        // await Device.deleteMany({}); 

        // 1. MIGRAR TOTEMS
        const totems = await LegacyTotem.find({});
        console.log(`📦 Encontrados ${totems.length} Totems.`);

        for (const t of totems) {
            try {
                // Verifica duplicidade
                const exists = await Device.findOne({ serial_number: t.serialNumber });
                if (exists) {
                    console.log(`⚠️ Totem ${t.serialNumber} já existe. Pulando.`);
                    continue;
                }

                await Device.create({
                    device_type: 'totem',
                    serial_number: t.serialNumber,
                    asset_name: t.hostname || 'Totem-Sem-Nome',
                    // Location
                    unit: t.unit,
                    // Network
                    ip_address: t.ip,
                    mac_address: t.mac_address,
                    // Specifics
                    hostname: t.hostname,
                    printer_status: t.printerStatus,
                    status: mapStatus(t.lastSeen),
                    last_seen: t.lastSeen
                });
            } catch (e) {
                console.error(`❌ Erro ao migrar Totem ${t.serialNumber}:`, e.message);
            }
        }

        // 2. MIGRAR DESKTOPS
        const desktops = await LegacyDesktop.find({});
        console.log(`📦 Encontrados ${desktops.length} Desktops.`);

        for (const d of desktops) {
            try {
                if (await Device.exists({ serial_number: d.serial_number })) continue;

                await Device.create({
                    device_type: 'desktop',
                    serial_number: d.serial_number,
                    asset_name: d.asset_name || d.hostname,
                    unit: d.unit,
                    sector: d.sector,
                    floor: d.floor,
                    ip_address: d.ip_address,
                    mac_address: d.mac_address,
                    status: d.status,
                    last_seen: d.last_seen,
                    // Specifics
                    model: d.model,
                    manufacturer: d.manufacturer,
                    processor: d.processor,
                    ram: d.ram,
                    operating_system: d.operating_system,
                    installed_software: d.installed_software
                });
            } catch (e) {
                console.error(`❌ Erro Desktop ${d.serial_number}:`, e.message);
            }
        }

        // 3. MIGRAR PRINTERS
        const printers = await LegacyPrinter.find({});
        console.log(`📦 Encontradas ${printers.length} Impressoras.`);

        for (const p of printers) {
            try {
                if (await Device.exists({ serial_number: p.serial_number })) continue;

                await Device.create({
                    device_type: 'printer',
                    serial_number: p.serial_number,
                    asset_name: p.asset_name,
                    unit: p.unit,
                    ip_address: p.ip_address,
                    status: p.status,
                    // Specifics
                    model: p.model,
                    manufacturer: p.manufacturer,
                    toner_level: extractTonerLevel(p.toner_levels), // Helper fictício
                    page_count_total: p.total_page_count
                });
            } catch (e) {
                console.error(`❌ Erro Impressora ${p.serial_number}:`, e.message);
            }
        }

        console.log('🏁 Migração Concluída!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Erro Fatal:', error);
        process.exit(1);
    }
}

function mapStatus(lastSeen) {
    if (!lastSeen) return 'unknown';
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff > 5 * 60 * 1000 ? 'offline' : 'online';
}

function extractTonerLevel(levelsMap) {
    // Tenta pegar o primeiro valor numérico que achar
    if (!levelsMap) return null;
    if (levelsMap instanceof Map) {
        for (const val of levelsMap.values()) return Number(val) || 0;
    }
    return 0; // Default
}

migrate();
