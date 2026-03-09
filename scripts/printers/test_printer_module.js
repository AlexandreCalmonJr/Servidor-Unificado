// scripts/test_printer_module.js
// Script para testar as funcionalidades do módulo de impressoras

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Carrega variáveis de ambiente
dotenv.config();

const ManagedAsset = require('../../models/ManagedAsset');
const AssetModuleConfig = require('../../models/AssetModuleConfig');
const PrinterService = require('../../services/printerService');

async function runTest() {
  console.log('🚀 Iniciando teste do módulo de impressoras...');

  try {
    // 1. Conectar ao MongoDB
    console.log('🔗 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/servidor-unificado');
    console.log('✅ Conectado ao MongoDB');

    // 2. Garantir que o módulo de impressoras existe
    console.log('📦 Verificando módulo de impressoras...');
    let printerModule = await AssetModuleConfig.findOne({ type: 'printer' });
    
    if (!printerModule) {
      console.log('➕ Criando módulo de impressoras...');
      printerModule = new AssetModuleConfig({
        name: 'Impressoras da Praça',
        type: 'printer',
        description: 'Gerenciamento de impressoras HP e Samsung',
        is_active: true,
        table_columns: [
          { key: 'asset_name', label: 'Nome' },
          { key: 'manufacturer', label: 'Fabricante' },
          { key: 'model', label: 'Modelo' },
          { key: 'status', label: 'Status' },
          { key: 'ip_address', label: 'IP' }
        ]
      });
      await printerModule.save();
      console.log('✅ Módulo criado');
    } else {
      console.log('✅ Módulo já existe');
    }

    // 3. Criar impressoras de teste (HP e Samsung)
    console.log('🖨️ Criando impressoras de teste...');
    
    const testPrinters = [
      {
        asset_name: 'HP LaserJet Praça Central',
        serial_number: 'HP-TEST-001',
        manufacturer: 'HP',
        model: 'LaserJet Pro M404n',
        ip_address: '192.168.1.50',
        connection_type: 'network',
        status: 'online',
        custom_data: { toner_levels: { black: 85 } }
      },
      {
        asset_name: 'Samsung M2020 USB',
        serial_number: 'SAM-TEST-002',
        manufacturer: 'Samsung',
        model: 'Xpress M2020',
        connection_type: 'usb',
        status: 'online',
        custom_data: { toner_levels: { black: 40 } }
      }
    ];

    for (const pData of testPrinters) {
      await ManagedAsset.findOneAndUpdate(
        { module_id: printerModule._id, serial_number: pData.serial_number },
        { ...pData, module_id: printerModule._id, asset_type: 'printer' },
        { upsert: true, new: true }
      );
      console.log(`✅ Impressora ${pData.asset_name} preparada`);
    }

    // 4. Testar PrinterService
    console.log('🛠️ Testando PrinterService...');
    const printerService = new PrinterService();
    
    console.log('🔍 Executando descoberta simulada...');
    await printerService.discoverPrinters();
    
    console.log('📊 Verificando impressoras gerenciadas...');
    const managed = await printerService.getManagedPrinters();
    console.log(`📈 Total de impressoras no banco: ${managed.length}`);
    
    managed.forEach(p => {
      console.log(`- ${p.asset_name} (${p.manufacturer}): ${p.status} | Toner: ${JSON.stringify(p.custom_data?.toner_levels || 'N/A')}`);
    });

    console.log('\n✅ Teste concluído com sucesso!');

  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão encerrada');
    process.exit(0);
  }
}

runTest();
