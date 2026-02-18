// scripts/createIndexes.js - CRIAÇÃO DE ÍNDICES OTIMIZADOS
require('dotenv').config();
const mongoose = require('mongoose');
const chalk = require('chalk');

// Importar todos os models
const { Device } = require('../models/Device');
const User = require('../models/User');
const AssetModuleConfig = require('../models/AssetModuleConfig');
// Outros models se necessário

/**
 * Conecta ao MongoDB
 */
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log(chalk.green('✓ Conectado ao MongoDB'));
    } catch (error) {
        console.error(chalk.red('✗ Erro ao conectar ao MongoDB:'), error.message);
        process.exit(1);
    }
};

/**
 * Cria índices para a collection de Devices (Unificada)
 */
const createDeviceIndexes = async () => {
    console.log(chalk.blue('\n📱 Criando índices para Devices (Unified)...'));

    try {
        // Índice único para serial_number
        await Device.collection.createIndex({ serial_number: 1 }, { unique: true });
        console.log(chalk.green('  ✓ Índice único: serial_number'));

        // Índice para busca por status
        await Device.collection.createIndex({ status: 1 });
        console.log(chalk.green('  ✓ Índice: status'));

        // Índice para device_type (Discriminator)
        await Device.collection.createIndex({ device_type: 1 });
        console.log(chalk.green('  ✓ Índice: device_type'));

        // Índice composto para queries de localização
        await Device.collection.createIndex({ unit: 1, sector: 1 });
        console.log(chalk.green('  ✓ Índice composto: unit + sector'));

        // Índice para busca por última atualização
        await Device.collection.createIndex({ last_seen: -1 });
        console.log(chalk.green('  ✓ Índice: last_seen (desc)'));

        // Índice de texto para busca
        await Device.collection.createIndex(
            { asset_name: 'text', serial_number: 'text', model: 'text' },
            { name: 'device_text_search' }
        );
        console.log(chalk.green('  ✓ Índice de texto: asset_name, serial_number, model'));

        // Índice para IP address
        await Device.collection.createIndex({ ip_address: 1 });
        console.log(chalk.green('  ✓ Índice: ip_address'));

    } catch (error) {
        console.error(chalk.red('  ✗ Erro ao criar índices de Device:'), error.message);
    }
};

/**
 * Cria índices para a collection de AssetModuleConfig
 */
const createModuleIndexes = async () => {
    console.log(chalk.blue('\n📦 Criando índices para AssetModuleConfig...'));
    try {
        await AssetModuleConfig.collection.createIndex({ type: 1 }, { unique: true });
        console.log(chalk.green('  ✓ Índice único: type'));
    } catch (error) {
        console.error(chalk.red('  ✗ Erro ao criar índices de AssetModuleConfig:'), error.message);
    }
}


/**
 * Lista todos os índices criados
 */
const listAllIndexes = async () => {
    console.log(chalk.blue('\n📊 Resumo de Índices Criados:\n'));

    const collections = [
        { name: 'devices', model: Device },
        { name: 'assetmodules', model: AssetModuleConfig },
        { name: 'users', model: User },
    ];

    for (const col of collections) {
        try {
            const indexes = await col.model.collection.indexes();
            console.log(chalk.cyan(`${col.name}:`), `${indexes.length} índices`);
        } catch (error) {
            console.log(chalk.yellow(`${col.name}:`), 'Collection não existe ainda');
        }
    }
};

/**
 * Função principal
 */
const main = async () => {
    console.log(chalk.bold.blue('\n🔧 Criação de Índices do Banco de Dados\n'));
    console.log(chalk.gray('='.repeat(50)));

    await connectDB();

    await createDeviceIndexes();
    await createModuleIndexes();
    // Adicionar outros conforme necessidade

    console.log(chalk.gray('\n' + '='.repeat(50)));
    await listAllIndexes();
    console.log(chalk.gray('='.repeat(50)));

    console.log(chalk.bold.green('\n✅ Índices criados com sucesso!\n'));

    await mongoose.connection.close();
    console.log(chalk.gray('Conexão com MongoDB fechada.'));
    process.exit(0);
};

// Executar
main().catch((error) => {
    console.error(chalk.red('\n❌ Erro fatal:'), error);
    process.exit(1);
});
