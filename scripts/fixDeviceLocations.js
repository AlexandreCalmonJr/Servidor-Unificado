// ===================================================================
// File: scripts/fixDeviceLocations.js
// Script para re-mapear localização de todos os dispositivos
// ===================================================================

require('dotenv').config();
const mongoose = require('mongoose');
const Device = require('../models/Device');
const locationService = require('../services/locationService');
const logger = require('../utils/logger');

async function fixDeviceLocations() {
  try {
    console.log('🔧 Iniciando correção em massa de localizações...\n');

    // Conecta ao MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado ao MongoDB\n');

    // Força atualização do cache
    await locationService.refreshCache();
    const stats = locationService.getCacheStats();
    console.log(`📊 Cache atualizado: ${stats.bssidsCount} BSSIDs, ${stats.unitsCount} unidades\n`);

    // Busca TODOS os dispositivos
    const devices = await Device.find().lean();
    console.log(`📱 Encontrados ${devices.length} dispositivos\n`);

    let updated = 0;
    let unchanged = 0;
    let failed = 0;

    console.log('Iniciando re-mapeamento...\n');

    for (const device of devices) {
      try {
        const oldLocation = {
          unit: device.unit,
          sector: device.sector,
          floor: device.floor
        };

        // Mapeia nova localização
        const newLocation = await locationService.mapDeviceLocation({
          ip_address: device.ip_address,
          mac_address_radio: device.mac_address_radio,
          device_name: device.device_name
        });

        // Verifica se mudou
        const changed = 
          oldLocation.unit !== newLocation.unit ||
          oldLocation.sector !== newLocation.sector ||
          oldLocation.floor !== newLocation.floor;

        if (changed) {
          // Atualiza no banco
          await Device.updateOne(
            { _id: device._id },
            {
              $set: {
                unit: newLocation.unit,
                sector: newLocation.sector,
                floor: newLocation.floor
              }
            }
          );

          updated++;
          console.log(`✅ ${device.device_name}`);
          console.log(`   Antes: ${oldLocation.unit} / ${oldLocation.sector} / ${oldLocation.floor}`);
          console.log(`   Depois: ${newLocation.unit} / ${newLocation.sector} / ${newLocation.floor}`);
          console.log(`   Confiança: ${newLocation.confidence} | Fonte: ${newLocation.source}\n`);
        } else {
          unchanged++;
        }

      } catch (error) {
        failed++;
        console.error(`❌ Erro ao processar ${device.device_name}: ${error.message}\n`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA CORREÇÃO');
    console.log('='.repeat(60));
    console.log(`Total de dispositivos: ${devices.length}`);
    console.log(`✅ Atualizados: ${updated}`);
    console.log(`⏭️  Sem mudanças: ${unchanged}`);
    console.log(`❌ Falhas: ${failed}`);
    console.log('='.repeat(60) + '\n');

    // Log no sistema
    logger.info('Correção em massa de localizações concluída', {
      total: devices.length,
      updated,
      unchanged,
      failed
    });

  } catch (error) {
    console.error('❌ Erro crítico:', error.message);
    logger.error('Erro na correção em massa', {
      error: error.message,
      stack: error.stack
    });
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
    process.exit(0);
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  fixDeviceLocations();
}

module.exports = fixDeviceLocations;