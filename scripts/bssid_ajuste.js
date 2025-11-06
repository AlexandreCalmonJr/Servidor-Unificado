// scripts/unifyBssidMappings.js
// Script para unificar BSSIDs antigos com uma unidade específica
// Execute: node scripts/unifyBssidMappings.js

require('dotenv').config();
const mongoose = require('mongoose');
const BssidMapping = require('../models/BssidMapping');
const UnitMapping = require('../models/UnitMapping');

// ===== CONFIGURAÇÕES =====
const TARGET_UNIT_NAME = 'Hospital Principal'; // ⚠️ ALTERE AQUI para o nome da sua unidade
const DRY_RUN = true; // ⚠️ Mude para false para aplicar as mudanças de verdade

// ===== CORES PARA O CONSOLE =====
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}${colors.reset}\n`),
};

// ===== FUNÇÃO PRINCIPAL =====
async function unifyBssidMappings() {
  try {
    log.title('SCRIPT DE UNIFICAÇÃO DE BSSIDs');

    // 1. Conectar ao MongoDB
    log.info('Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    });
    log.success('Conectado ao MongoDB\n');

    // 2. Verificar se a unidade alvo existe
    log.info(`Verificando se a unidade "${TARGET_UNIT_NAME}" existe...`);
    const targetUnit = await UnitMapping.findOne({ name: TARGET_UNIT_NAME });
    
    if (!targetUnit) {
      log.error(`Unidade "${TARGET_UNIT_NAME}" não encontrada!`);
      log.warn('Unidades disponíveis:');
      
      const allUnits = await UnitMapping.find().lean();
      if (allUnits.length === 0) {
        log.error('Nenhuma unidade cadastrada no sistema!');
        log.info('Crie uma unidade primeiro em: Admin → Configurações → Unidades');
      } else {
        allUnits.forEach((unit, index) => {
          console.log(`   ${index + 1}. ${unit.name}`);
        });
      }
      
      process.exit(1);
    }
    
    log.success(`Unidade encontrada: ${TARGET_UNIT_NAME}\n`);

    // 3. Buscar BSSIDs sem unitName (ou com unitName vazio)
    log.info('Buscando BSSIDs sem unidade associada...');
    const bssidsWithoutUnit = await BssidMapping.find({
      $or: [
        { unitName: { $exists: false } },
        { unitName: '' },
        { unitName: null },
      ]
    }).lean();

    if (bssidsWithoutUnit.length === 0) {
      log.success('Todos os BSSIDs já estão associados a uma unidade!');
      log.info('Nada a fazer aqui. 🎉');
      process.exit(0);
    }

    log.warn(`Encontrados ${bssidsWithoutUnit.length} BSSIDs sem unidade:\n`);

    // 4. Exibir preview das mudanças
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ PREVIEW DAS MUDANÇAS                                            │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    
    bssidsWithoutUnit.slice(0, 10).forEach((bssid, index) => {
      const mac = bssid.mac_address_radio.padEnd(20);
      const sector = bssid.sector.padEnd(20);
      const floor = bssid.floor.padEnd(15);
      console.log(`│ ${(index + 1).toString().padStart(2)}. ${mac} │ ${sector} │ ${floor} │`);
    });
    
    if (bssidsWithoutUnit.length > 10) {
      console.log(`│ ... e mais ${bssidsWithoutUnit.length - 10} BSSIDs               │`);
    }
    
    console.log('└─────────────────────────────────────────────────────────────────┘\n');

    // 5. Resumo da operação
    log.title('RESUMO DA OPERAÇÃO');
    console.log(`   📊 Total de BSSIDs a atualizar: ${colors.bright}${bssidsWithoutUnit.length}${colors.reset}`);
    console.log(`   🏢 Unidade de destino: ${colors.bright}${TARGET_UNIT_NAME}${colors.reset}`);
    console.log(`   🔧 Modo: ${DRY_RUN ? colors.yellow + 'SIMULAÇÃO (DRY RUN)' : colors.red + 'APLICAR MUDANÇAS REAIS'}${colors.reset}\n`);

    if (DRY_RUN) {
      log.warn('MODO DE SIMULAÇÃO ATIVO - Nenhuma mudança será aplicada!');
      log.info('Para aplicar as mudanças de verdade, altere DRY_RUN para false no script.\n');
    }

    // 6. Aplicar as mudanças (ou simular)
    if (!DRY_RUN) {
      log.info('Aplicando mudanças...\n');
      
      const result = await BssidMapping.updateMany(
        {
          $or: [
            { unitName: { $exists: false } },
            { unitName: '' },
            { unitName: null },
          ]
        },
        {
          $set: { unitName: TARGET_UNIT_NAME }
        }
      );

      log.success(`${result.modifiedCount} BSSIDs atualizados com sucesso!`);
      
      // Verificação
      const updated = await BssidMapping.find({ unitName: TARGET_UNIT_NAME }).countDocuments();
      log.info(`Total de BSSIDs agora associados a "${TARGET_UNIT_NAME}": ${updated}`);
    } else {
      log.info('Simulação concluída. Nenhuma mudança foi aplicada.');
    }

    // 7. Estatísticas finais
    log.title('ESTATÍSTICAS ATUAIS');
    
    const allBssids = await BssidMapping.find().lean();
    const groupedByUnit = {};
    
    allBssids.forEach(bssid => {
      const unit = bssid.unitName || 'Sem Unidade';
      groupedByUnit[unit] = (groupedByUnit[unit] || 0) + 1;
    });

    console.log('Distribuição de BSSIDs por unidade:\n');
    Object.entries(groupedByUnit)
      .sort((a, b) => b[1] - a[1])
      .forEach(([unit, count]) => {
        const bar = '█'.repeat(Math.min(count, 50));
        console.log(`   ${unit.padEnd(30)} ${colors.cyan}${bar}${colors.reset} ${count}`);
      });

    console.log('');

  } catch (error) {
    log.error(`Erro durante a execução: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log.info('Conexão com MongoDB encerrada.\n');
    process.exit(0);
  }
}

// ===== EXECUÇÃO =====
unifyBssidMappings();
